import { useEffect, useMemo, useReducer, useRef } from 'react';
import { buildPolylines, type BBox, type Polyline } from '@/lib/parseSvg';
import {
  CARRIER_IDS,
  initialState,
  reducer,
  type CarrierId,
} from '@/lib/poster004State';
import {
  CARRIER_COLOURS,
  HUB_LINKS,
  SECTOR_LINKS,
  makeInitialAnimState,
  reset as resetEngine,
  snapToFull,
  startHubCascade,
  startCarrierFocus,
  endCarrierFocus,
  tickAnimation,
  ABSORB_BLIP_PEAK_SCALE,
  HOVER_DEBOUNCE_MS,
  INSTRUCTION_FADE_IN_DELAY_MS,
  INSTRUCTION_FADE_IN_MS,
  OPACITY_CROSSFADE_MS,
  PULSE_CORE_ALPHA,
  PULSE_CORE_RADIUS_RATIO,
  PULSE_HEAD_RADIUS,
  PULSE_HALO_RADIUS,
  PULSE_HALO_ALPHA,
  PULSE_SHIMMER_AMPLITUDE,
  PULSE_STROKE_ALPHA,
  PULSE_STROKE_WIDTH,
  PULSE_TAIL_PX,
  type AnimState,
  type Link,
} from '@/lib/poster004Engine';
import formsData from '@/assets/poster-004-forms.json';

// ─────────────────────────────────────────────────────────────────
// Static asset typing + module-level pre-parse.
// ─────────────────────────────────────────────────────────────────

interface RawForm {
  form_paths: string[];
  centroid: [number, number];
  anchor?: [number, number];
  twh: number;
  colour?: string;
}

interface RawSector {
  id: string;
  carrier: CarrierId;
  cx: number;
  cy: number;
  r: number;
  twh: number | null;
  label: string;
  verifyId?: string;
}

interface RawGlyph { d: string; x: number; y: number }

interface RawData {
  total: RawForm;
  petroleum: RawForm;
  naturalGas: RawForm;
  electricity: RawForm;
  bioenergy: RawForm;
  heat: RawForm;
  solidFuel: RawForm;
  links: {
    hub_to_carrier: Array<{ carrier: string; d: string }>;
    carrier_to_sector: Array<{ carrier: string; sectorId: string; d: string }>;
  };
  sectors: RawSector[];
  labels: {
    hub: RawGlyph[];
    carriers: Record<string, RawGlyph[]>;
    sectors: Record<string, RawGlyph[]>;
  };
}

const DATA = formsData as unknown as RawData;

// Per-carrier identifiers in fixed order (for stable mount).
type FormId = CarrierId | 'total';
const FORM_IDS: FormId[] = ['total', ...CARRIER_IDS];

interface PreparedForm {
  id: FormId;
  polylines: Polyline[];
  bbox: BBox;
  centroid: [number, number];
  anchor: [number, number];
  colour: string;
  twh: number;
  // Indices of the polylines that form the outer silhouette — drawn
  // as an opaque page-background fill before the texture strokes so
  // connector lines beneath the canvas don't show through the form's
  // interior gaps.
  silhouetteIndices: number[];
}

function pickSilhouetteIndices(polylines: Polyline[]): number[] {
  if (polylines.length === 0) return [];
  let maxArea = 0;
  const areas: number[] = [];
  for (const L of polylines) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (let k = 0; k < L.n; k++) {
      const x = L.pts[k * 2];
      const y = L.pts[k * 2 + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const a = (maxX - minX) * (maxY - minY);
    areas.push(a);
    if (a > maxArea) maxArea = a;
  }
  const threshold = maxArea * 0.8;
  const out: number[] = [];
  for (let i = 0; i < areas.length; i++) {
    if (areas[i] >= threshold) out.push(i);
  }
  return out;
}

const FORMS: Record<FormId, PreparedForm> = (() => {
  const out = {} as Record<FormId, PreparedForm>;
  for (const id of FORM_IDS) {
    const raw = DATA[id];
    const { polylines, bbox } = buildPolylines(raw.form_paths);
    out[id] = {
      id,
      polylines,
      bbox,
      centroid: raw.centroid,
      anchor: raw.anchor ?? raw.centroid,
      colour: raw.colour ?? '#0d1a1e',
      twh: raw.twh,
      silhouetteIndices: pickSilhouetteIndices(polylines),
    };
  }
  return out;
})();

// Page background colour — used to fill form silhouettes so the
// connectors that run beneath the canvas don't show through the
// stroke gaps. Matches CLAUDE.md's locked palette.
const PAGE_BG = '#ECE7DF';

const ALL_LINKS: Link[] = [...HUB_LINKS, ...SECTOR_LINKS];
const SECTORS = DATA.sectors;
const SECTOR_LABELS = DATA.labels.sectors;

// ─────────────────────────────────────────────────────────────────
// Carrier name labels — print designer set these at PDF-export time;
// not in the SVG. Hard-coded to render alongside each carrier blob.
// Positions are approximate first-pass values; tune visually later.
// ─────────────────────────────────────────────────────────────────

interface CarrierLabel {
  id: CarrierId;
  display: string;
  twh: number;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
}

const CARRIER_LABELS: CarrierLabel[] = [
  { id: 'petroleum',   display: 'Petroleum',    twh: 729, x: 552,  y: 880,  anchor: 'middle' },
  { id: 'naturalGas',  display: 'Natural gas',  twh: 432, x: 795,  y: 1140, anchor: 'middle' },
  { id: 'electricity', display: 'Electricity',  twh: 272, x: 1130, y: 870,  anchor: 'middle' },
  { id: 'bioenergy',   display: 'Bioenergy',    twh: 85,  x: 985,  y: 510,  anchor: 'middle' },
  { id: 'heat',        display: 'Heat sold',    twh: 14,  x: 1080, y: 1015, anchor: 'start'  },
  { id: 'solidFuel',   display: 'Solid fuel',   twh: 10,  x: 740,  y: 530,  anchor: 'end'    },
];

// ─────────────────────────────────────────────────────────────────
// Hit-area rectangles (form bbox padded so tiny carriers are still
// targetable; minimum 60 × 60).
// ─────────────────────────────────────────────────────────────────

interface HitRect { x: number; y: number; w: number; h: number }

function hitRectFor(b: BBox): HitRect {
  const pad = 14;
  const minDim = 60;
  let w = b.maxX - b.minX + pad * 2;
  let h = b.maxY - b.minY + pad * 2;
  let x = b.minX - pad;
  let y = b.minY - pad;
  if (w < minDim) { x -= (minDim - w) / 2; w = minDim; }
  if (h < minDim) { y -= (minDim - h) / 2; h = minDim; }
  return { x, y, w, h };
}

const CARRIER_HIT_RECTS: Record<CarrierId, HitRect> = {
  petroleum:   hitRectFor(FORMS.petroleum.bbox),
  naturalGas:  hitRectFor(FORMS.naturalGas.bbox),
  electricity: hitRectFor(FORMS.electricity.bbox),
  bioenergy:   hitRectFor(FORMS.bioenergy.bbox),
  heat:        hitRectFor(FORMS.heat.bbox),
  solidFuel:   hitRectFor(FORMS.solidFuel.bbox),
};
const HUB_HIT_RECT = hitRectFor(FORMS.total.bbox);

// ─────────────────────────────────────────────────────────────────
// Tight content viewBox — replaces the original print-export
// 0 0 1967.58 1674.75 which had the content offset 128 px left and
// 45 px up from the viewBox centre. Computed at module load from
// every renderable element with 5% padding.
// ─────────────────────────────────────────────────────────────────

const VIEWBOX = (() => {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  const expand = (x: number, y: number) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  };
  // Form polyline bboxes.
  for (const id of FORM_IDS) {
    const b = FORMS[id].bbox;
    expand(b.minX, b.minY);
    expand(b.maxX, b.maxY);
  }
  // Sector circles (cx ± r).
  for (const s of SECTORS) {
    expand(s.cx - s.r, s.cy - s.r);
    expand(s.cx + s.r, s.cy + s.r);
  }
  // Sector label glyph anchors. Approximate label extent by adding a
  // small box around each anchor — enough to keep typical 6-letter
  // words inside the viewBox.
  const LABEL_W = 90;
  const LABEL_H = 20;
  for (const glyphs of Object.values(SECTOR_LABELS)) {
    for (const g of glyphs) {
      expand(g.x - LABEL_W, g.y - LABEL_H);
      expand(g.x + LABEL_W, g.y + LABEL_H);
    }
  }
  // Carrier-name label boxes.
  for (const cl of CARRIER_LABELS) {
    expand(cl.x - 80, cl.y - 12);
    expand(cl.x + 80, cl.y + 35);
  }
  // Hub label and hover instruction sit below the form.
  expand(FORMS.total.centroid[0] - 140, 1010 - 10);
  expand(FORMS.total.centroid[0] + 140, 1100 + 10);

  // 5% pad on each side.
  const w = maxX - minX;
  const h = maxY - minY;
  const padX = w * 0.05;
  const padY = h * 0.05;
  return {
    x: minX - padX,
    y: minY - padY,
    w: w + padX * 2,
    h: h + padY * 2,
  };
})();

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export default function Poster004CanvasViz() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef     = useRef<HTMLDivElement | null>(null);
  const canvasRef    = useRef<HTMLCanvasElement | null>(null);
  const animRef      = useRef<AnimState>(makeInitialAnimState());
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // SVG element refs — populated in JSX render via callback refs.
  const connectorRefs    = useRef<Record<string, SVGPathElement | null>>({});
  const sectorCircleRefs = useRef<Record<string, SVGCircleElement | null>>({});
  const sectorLabelRefs  = useRef<Record<string, SVGGElement | null>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Populate link lengths from the live SVG paths AND set
    // stroke-dasharray on every connector so that stroke-dashoffset
    // can drive the per-frame trail reveal.
    const lengths: Record<string, number> = {};
    for (const l of ALL_LINKS) {
      const el = connectorRefs.current[l.id];
      if (el) {
        const len = el.getTotalLength();
        lengths[l.id] = len;
        // Use a single full-length dash; offset by len initially so
        // the path is invisible until drawProgress > 0.
        el.style.strokeDasharray = `${len}`;
        el.style.strokeDashoffset = `${len}`;
      }
    }
    animRef.current.linkLengths = lengths;

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      const r = stage.getBoundingClientRect();
      const cssW = r.width;
      const cssH = r.height;
      canvas.width = Math.max(1, Math.floor(cssW * DPR));
      canvas.height = Math.max(1, Math.floor(cssH * DPR));
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      // Fit the viewBox (which is offset by VIEWBOX.x / VIEWBOX.y in
      // SVG units) into the canvas with letterboxing matching SVG's
      // preserveAspectRatio="xMidYMid meet".
      const scale = Math.min(cssW / VIEWBOX.w, cssH / VIEWBOX.h);
      const offsetX = (cssW - VIEWBOX.w * scale) / 2;
      const offsetY = (cssH - VIEWBOX.h * scale) / 2;
      ctx.setTransform(
        scale * DPR, 0, 0, scale * DPR,
        (offsetX - VIEWBOX.x * scale) * DPR,
        (offsetY - VIEWBOX.y * scale) * DPR,
      );
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    let rafId = 0;
    const lastSyncedConnector: Record<string, number> = {};
    const lastSyncedDrawProgress: Record<string, number> = {};
    const lastSyncedSectorScale: Record<string, number> = {};
    const lastSyncedSectorBlip: Record<string, number> = {};
    const lastSyncedLabel: Record<string, number> = {};

    const frame = (now: number) => {
      const result = tickAnimation(animRef.current, now);
      if (result.cascadeFullComplete) {
        dispatch({ type: 'CASCADE_FULL_COMPLETE' });
      }
      const anim = animRef.current;

      // ── Canvas clear ──
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // ── Forms ──
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 0.5;

      for (const id of FORM_IDS) {
        const f = FORMS[id];
        const alpha = anim.formAlpha[id];
        if (alpha <= 0.001) continue;

        const scale =
          id === 'total' ? anim.hubPulseScale
                         : anim.carrierPulseScale[id];

        ctx.save();
        if (scale !== 1) {
          ctx.translate(f.anchor[0], f.anchor[1]);
          ctx.scale(scale, scale);
          ctx.translate(-f.anchor[0], -f.anchor[1]);
        }

        // Silhouette fill — page-background-coloured opaque path(s)
        // that block the connector lines running underneath. Draw
        // BEFORE the texture strokes so the strokes still draw on
        // top. globalAlpha = formAlpha so the dim mask still works.
        if (f.silhouetteIndices.length > 0) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = PAGE_BG;
          ctx.beginPath();
          for (const idx of f.silhouetteIndices) {
            const L = f.polylines[idx];
            const pts = L.pts;
            const n = L.n;
            if (n < 2) continue;
            ctx.moveTo(pts[0], pts[1]);
            for (let k = 1; k < n; k++) {
              ctx.lineTo(pts[k * 2], pts[k * 2 + 1]);
            }
            ctx.closePath();
          }
          ctx.fill();
        }

        ctx.strokeStyle = f.colour;

        const N = f.polylines.length;
        const NUM_BUCKETS = 8;
        for (let bucket = 0; bucket < NUM_BUCKETS; bucket++) {
          const bucketDepthMid = (bucket + 0.5) / NUM_BUCKETS;
          ctx.globalAlpha = alpha * (0.45 + 0.55 * (1 - bucketDepthMid));
          ctx.beginPath();
          for (let li = 0; li < N; li++) {
            const lineBucket = Math.min(
              NUM_BUCKETS - 1,
              Math.floor((N > 1 ? li / (N - 1) : 0) * NUM_BUCKETS),
            );
            if (lineBucket !== bucket) continue;
            const L = f.polylines[li];
            const pts = L.pts;
            const n = L.n;
            if (n < 2) continue;
            ctx.moveTo(pts[0], pts[1]);
            for (let k = 1; k < n; k++) {
              ctx.lineTo(pts[k * 2], pts[k * 2 + 1]);
            }
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Pulse-tips on canvas ──
      // Drawn after forms so they sit on top. Each pulse looks up its
      // SVG <path> element and reads progress × length via
      // getPointAtLength.
      if (anim.pulses.length > 0) {
        ctx.globalAlpha = 1;
        for (const p of anim.pulses) {
          const path = connectorRefs.current[p.pathId];
          const len = anim.linkLengths[p.pathId];
          if (!path || !len) continue;
          const head = path.getPointAtLength(p.progress * len);
          const tailDist = Math.max(0, p.progress * len - PULSE_TAIL_PX);
          const tail = path.getPointAtLength(tailDist);

          // Halo
          ctx.globalAlpha = PULSE_HALO_ALPHA;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(head.x, head.y, PULSE_HALO_RADIUS, 0, Math.PI * 2);
          ctx.fill();

          // Trail — three-stop gradient so most of the length stays
          // faint and the colour concentrates near the head.
          const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(0.7, p.color + '4D'); // ≈ 30% alpha
          grad.addColorStop(1, p.color);
          ctx.strokeStyle = grad;
          ctx.globalAlpha = PULSE_STROKE_ALPHA;
          ctx.lineWidth = PULSE_STROKE_WIDTH;
          ctx.beginPath();
          ctx.moveTo(tail.x, tail.y);
          ctx.lineTo(head.x, head.y);
          ctx.stroke();

          // Head — solid carrier-coloured disc.
          ctx.globalAlpha = 1;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(head.x, head.y, PULSE_HEAD_RADIUS, 0, Math.PI * 2);
          ctx.fill();

          // White-hot core on top — reads as an electric arc rather
          // than a coloured ball. Radius shimmers per-frame.
          const shimmer =
            (1 - PULSE_SHIMMER_AMPLITUDE) +
            PULSE_SHIMMER_AMPLITUDE * Math.sin(now * 0.05);
          const coreR =
            PULSE_HEAD_RADIUS * PULSE_CORE_RADIUS_RATIO * shimmer;
          ctx.globalAlpha = PULSE_CORE_ALPHA;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(head.x, head.y, coreR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 0.5;
      }

      // ── Sync SVG element styles from anim state (no React re-render) ──
      // Connector + dot (shared dim mask via opacity).
      for (const id in anim.connectorOpacity) {
        const v = anim.connectorOpacity[id];
        if (lastSyncedConnector[id] !== v) {
          lastSyncedConnector[id] = v;
          const cEl = connectorRefs.current[id];
          if (cEl) cEl.style.opacity = String(v);
          // Sector dot shares opacity with its connector.
          const dEl = sectorCircleRefs.current[id];
          if (dEl) dEl.style.opacity = String(v);
        }
      }

      // Connector trail draw-in via stroke-dashoffset.
      for (const id in anim.connectorDrawProgress) {
        const v = anim.connectorDrawProgress[id];
        if (lastSyncedDrawProgress[id] !== v) {
          lastSyncedDrawProgress[id] = v;
          const cEl = connectorRefs.current[id];
          const len = anim.linkLengths[id];
          if (cEl && len) {
            cEl.style.strokeDashoffset = String(len * (1 - v));
          }
        }
      }

      // Sector scale + blip → SVG transform.
      for (const id in anim.sectorScale) {
        const s = anim.sectorScale[id];
        const b = anim.sectorBlip[id];
        const blipFactor = 1 + (ABSORB_BLIP_PEAK_SCALE - 1) * b;
        const total = s * blipFactor;
        const prev = (lastSyncedSectorScale[id] ?? -1) * (1 + (ABSORB_BLIP_PEAK_SCALE - 1) * (lastSyncedSectorBlip[id] ?? 0));
        if (total !== prev) {
          lastSyncedSectorScale[id] = s;
          lastSyncedSectorBlip[id] = b;
          const sec = SECTORS.find((x) => x.id === id);
          const dEl = sectorCircleRefs.current[id];
          if (sec && dEl) {
            dEl.setAttribute(
              'transform',
              `translate(${sec.cx} ${sec.cy}) scale(${total}) translate(${-sec.cx} ${-sec.cy})`,
            );
          }
        }
      }

      // Sector label opacity.
      for (const id in anim.labelOpacity) {
        const v = anim.labelOpacity[id];
        if (lastSyncedLabel[id] !== v) {
          lastSyncedLabel[id] = v;
          const gEl = sectorLabelRefs.current[id];
          if (gEl) gEl.style.opacity = String(v);
        }
      }

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  // ─── Pointer handlers ──────────────────────────────────────────

  const handleHubPointer = (e: React.PointerEvent<SVGRectElement>) => {
    if (stateRef.current.phase === 'CASCADE_FULL') return;
    // Block pointerEnter on touch — onPointerDown handles taps so
    // a stray "enter" from a scroll gesture doesn't kick off the
    // cascade unintentionally.
    if (e.type === 'pointerenter' && e.pointerType === 'touch') return;
    cancelFocusExit();
    startHubCascade(animRef.current, performance.now());
    dispatch({ type: 'CASCADE_FULL_START' });
  };

  // Hub stays hoverable in DEFAULT and FULL — every hover replays the
  // cascade. Only blocked while a cascade is already playing.
  const hubHittable = state.phase !== 'CASCADE_FULL';

  // Carrier focus: pointerEnter activates, pointerLeave schedules a
  // HOVER_DEBOUNCE_MS exit timer that gets cancelled if any other
  // carrier hover lands within the window — so cross-carrier hover
  // crossfades smoothly without dropping back to FULL between.
  const focusExitTimerRef = useRef<number | null>(null);
  const cancelFocusExit = () => {
    if (focusExitTimerRef.current !== null) {
      window.clearTimeout(focusExitTimerRef.current);
      focusExitTimerRef.current = null;
    }
  };

  const activateCarrier = (carrier: CarrierId) => {
    if (stateRef.current.phase !== 'FULL') return;
    cancelFocusExit();
    if (stateRef.current.focusCarrier === carrier) return;
    startCarrierFocus(animRef.current, carrier, false, performance.now());
    dispatch({ type: 'ENTER_CARRIER_FOCUS', carrier });
  };

  const scheduleCarrierExit = () => {
    if (stateRef.current.phase !== 'FULL') return;
    if (stateRef.current.focusCarrier === null) return;
    cancelFocusExit();
    focusExitTimerRef.current = window.setTimeout(() => {
      focusExitTimerRef.current = null;
      if (stateRef.current.phase !== 'FULL') return;
      if (stateRef.current.focusCarrier === null) return;
      endCarrierFocus(animRef.current, performance.now());
      dispatch({ type: 'EXIT_CARRIER_FOCUS' });
    }, HOVER_DEBOUNCE_MS);
  };

  const handleCarrierEnter =
    (carrier: CarrierId) => (e: React.PointerEvent<SVGRectElement>) => {
      if (e.pointerType === 'touch') return; // taps land via onPointerDown
      activateCarrier(carrier);
    };

  const handleCarrierLeave = (e: React.PointerEvent<SVGRectElement>) => {
    if (e.pointerType === 'touch') return;
    scheduleCarrierExit();
  };

  const handleCarrierTap =
    (carrier: CarrierId) => (e: React.PointerEvent<SVGRectElement>) => {
      if (e.pointerType !== 'touch') return;
      e.stopPropagation();
      activateCarrier(carrier);
    };

  // SVG-level pointerdown for "tap background to exit focus" on touch.
  // Mouse uses pointerleave + debounce, not this path.
  const handleSvgBackground = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== 'touch') return;
    if (stateRef.current.phase !== 'FULL') return;
    if (stateRef.current.focusCarrier === null) return;
    cancelFocusExit();
    endCarrierFocus(animRef.current, performance.now());
    dispatch({ type: 'EXIT_CARRIER_FOCUS' });
  };

  useEffect(() => {
    return () => cancelFocusExit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // First-paint hover instruction. Fades in INSTRUCTION_FADE_IN_DELAY_MS
  // after mount; fades out (and never returns) on first cascade dispatch
  // — the reducer drops hoverInstructionVisible inside CASCADE_FULL_START.
  useEffect(() => {
    const t = window.setTimeout(() => {
      dispatch({ type: 'SHOW_HOVER_INSTRUCTION' });
    }, INSTRUCTION_FADE_IN_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Coarse-pointer detection for instruction copy.
  const coarsePointer = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches,
    [],
  );

  // ─── Buttons ────────────────────────────────────────────────────

  const handlePlay = () => {
    cancelFocusExit();
    resetEngine(animRef.current);
    dispatch({ type: 'RESET' });
    startHubCascade(animRef.current, performance.now());
    dispatch({ type: 'CASCADE_FULL_START' });
  };

  const handleSnap = () => {
    cancelFocusExit();
    snapToFull(animRef.current);
    dispatch({ type: 'SNAP_TO_FULL' });
  };

  const handleReset = () => {
    cancelFocusExit();
    resetEngine(animRef.current);
    dispatch({ type: 'RESET' });
  };

  const showPlay = !state.hasCompletedCascade;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="w-full relative" ref={containerRef}>
      <div
        ref={stageRef}
        className="relative w-full mx-auto"
        style={{
          aspectRatio: `${VIEWBOX.w} / ${VIEWBOX.h}`,
          // Cap by viewport width AND height so the diagram still
          // sits above the buttons + caveat on a 13" viewport. The
          // 1400px ceiling prevents absurd sizing on ultrawides.
          maxWidth: `min(95vw, calc(75vh * ${VIEWBOX.w} / ${VIEWBOX.h}), 1400px)`,
        }}
      >
        {/* Layer 1: connectors (lowest). Pointer-events disabled —
            taps pass through to the upper SVG. */}
        <svg
          viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ zIndex: 1, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <g id="connectors">
            {ALL_LINKS.map((l) => (
              <path
                key={l.id}
                ref={(el) => { connectorRefs.current[l.id] = el; }}
                d={l.d}
                data-connector-id={l.id}
                data-connector-carrier={l.carrier}
                stroke="#0d1a1e"
                strokeWidth={0.6}
                fill="none"
                style={{ opacity: 1 }}
              />
            ))}
          </g>
        </svg>

        {/* Layer 2: forms + pulse-tips (middle). */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
          style={{ zIndex: 2, pointerEvents: 'none' }}
        />

        {/* Layer 3: sectors, labels, hub label, carrier labels,
            hover instruction, hit-areas (top). */}
        <svg
          viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="UK final energy in 2024 by carrier and end-use sector — 1,542 TWh total"
          onPointerDown={handleSvgBackground}
          style={{ zIndex: 3 }}
        >
          {/* Sector dots. */}
          <g id="sectors" pointerEvents="none">
            {SECTORS.map((s) => (
              <circle
                key={s.id}
                ref={(el) => { sectorCircleRefs.current[s.id] = el; }}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                data-sector-id={s.id}
                data-sector-carrier={s.carrier}
                fill={CARRIER_COLOURS[s.carrier]}
                style={{ opacity: 1 }}
                transform={`translate(${s.cx} ${s.cy}) scale(0) translate(${-s.cx} ${-s.cy})`}
              />
            ))}
          </g>

          {/* Sector labels. The lone unmatched solidFuel/Chemicals
              dot has no entry in DATA.labels.sectors and is rendered
              without a label — accepted as-is for v1. */}
          <g id="sector-labels" pointerEvents="none" fill="#0d1a1e">
            {Object.entries(SECTOR_LABELS).map(([sectorId, glyphs]) => (
              <g
                key={sectorId}
                ref={(el) => { sectorLabelRefs.current[sectorId] = el; }}
                data-sector-label={sectorId}
                style={{ opacity: 0 }}
              >
                {glyphs.map((g, i) => (
                  <path key={i} d={g.d} />
                ))}
              </g>
            ))}
          </g>

          {/* Hub label — sits BELOW the central form, matching the
              print's actual placement. Always visible, never tweens. */}
          <g id="hub-label" pointerEvents="none">
            <text
              x={FORMS.total.centroid[0]}
              y={1010}
              textAnchor="middle"
              style={{
                fontFamily: "'Playfair', Georgia, serif",
                fontSize: 32,
                fontWeight: 600,
                fill: '#0d1a1e',
              }}
            >
              1,542 TWh
            </text>
            <text
              x={FORMS.total.centroid[0]}
              y={1040}
              textAnchor="middle"
              style={{
                fontFamily: "'Playfair', Georgia, serif",
                fontSize: 15,
                fontStyle: 'italic',
                fill: '#0d1a1e',
              }}
            >
              UK final energy, 2024
            </text>
          </g>

          {/* Carrier-name labels. */}
          <g id="carrier-labels" pointerEvents="none">
            {CARRIER_LABELS.map((cl) => (
              <text
                key={cl.id}
                x={cl.x}
                y={cl.y}
                textAnchor={cl.anchor}
                data-carrier-label={cl.id}
                style={{
                  fontFamily: "'Playfair', Georgia, serif",
                  fontSize: 18,
                  fontWeight: 600,
                  fill: CARRIER_COLOURS[cl.id],
                  opacity: 0,
                }}
              >
                {cl.display}
                <tspan
                  x={cl.x}
                  dy="1.25em"
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    fontStyle: 'italic',
                    fill: '#0d1a1e',
                  }}
                >
                  {cl.twh.toLocaleString()} TWh
                </tspan>
              </text>
            ))}
          </g>

          {/* Hover instruction. Fades in 800 ms after mount, fades
              out on first cascade dispatch, fades back in after
              CASCADE_FULL completes if the user hasn't yet hovered
              any carrier (handled in the reducer). */}
          <text
            x={FORMS.total.centroid[0]}
            y={1090}
            textAnchor="middle"
            pointerEvents="none"
            style={{
              fontFamily: "'Playfair', Georgia, serif",
              fontSize: 14,
              fontStyle: 'italic',
              fill: '#0d1a1e',
              opacity: state.hoverInstructionVisible ? 0.7 : 0,
              transition: `opacity ${INSTRUCTION_FADE_IN_MS}ms ease-out`,
            }}
          >
            {coarsePointer
              ? 'Tap the forms to explore the system'
              : 'Hover the forms to see how the energy system flows'}
          </text>

          {/* Hit areas (transparent rects layered on top of forms). */}
          <g id="hit-areas">
            <rect
              data-hit="hub"
              x={HUB_HIT_RECT.x}
              y={HUB_HIT_RECT.y}
              width={HUB_HIT_RECT.w}
              height={HUB_HIT_RECT.h}
              fill="transparent"
              style={{
                cursor: hubHittable ? 'pointer' : 'default',
                touchAction: 'manipulation',
              }}
              pointerEvents={hubHittable ? 'auto' : 'none'}
              onPointerEnter={handleHubPointer}
              onPointerDown={handleHubPointer}
            />
            {CARRIER_IDS.map((id) => {
              const r = CARRIER_HIT_RECTS[id];
              const active = state.phase === 'FULL';
              return (
                <rect
                  key={id}
                  data-hit={id}
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill="transparent"
                  style={{
                    cursor: active ? 'pointer' : 'default',
                    touchAction: 'manipulation',
                  }}
                  pointerEvents={active ? 'auto' : 'none'}
                  onPointerEnter={handleCarrierEnter(id)}
                  onPointerLeave={handleCarrierLeave}
                  onPointerDown={handleCarrierTap(id)}
                />
              );
            })}
          </g>
        </svg>
      </div>

      {/* Buttons. Three muted text-link buttons separated by middots. */}
      <div
        className="mt-6 flex justify-center items-center gap-2 text-sm text-muted-foreground"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        {showPlay && (
          <>
            <button
              type="button"
              onClick={handlePlay}
              className="px-1 py-0.5 rounded-sm hover:text-foreground transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40"
            >
              Play animation
            </button>
            <span aria-hidden="true">·</span>
          </>
        )}
        <button
          type="button"
          onClick={handleSnap}
          className="px-1 py-0.5 rounded-sm hover:text-foreground transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40"
        >
          View as poster
        </button>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={handleReset}
          className="px-1 py-0.5 rounded-sm hover:text-foreground transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40"
        >
          Reset
        </button>
      </div>

      {/* Honesty caveat — verbatim from the printed poster. */}
      <p
        className="mt-5 mx-auto max-w-2xl text-center text-foreground/70 leading-relaxed"
        style={{
          fontFamily: "'Playfair', Georgia, serif",
          fontWeight: 300,
          fontSize: 15,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>
          Electricity is just 18% of UK final energy.
        </span>{' '}
        Decarbonising how it&rsquo;s made only cleans this slice. Everything
        else needs to be electrified before it can be decarbonised at all.
      </p>
    </div>
  );
}
