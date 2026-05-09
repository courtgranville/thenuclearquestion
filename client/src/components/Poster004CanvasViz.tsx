import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { buildPolylines, type BBox } from '@/lib/parseSvg';
import {
  resolveMotion,
  depthWeight,
  TUNING,
  type FormMotion,
} from '@/lib/posterMotion';
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
  PULSE_BULGE_COLOR,
  PULSE_BULGE_HALF_LEN,
  PULSE_BULGE_WIDTH,
  PULSE_CORE_COLOR,
  PULSE_CORE_RADIUS,
  PULSE_GLOW_COLOR,
  PULSE_GLOW_EDGE_COLOR,
  PULSE_GLOW_MID_COLOR,
  PULSE_GLOW_RADIUS,
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

// Mirror Poster001CanvasViz's PreparedLine shape: outline lines
// (where depthWeight === 0) get a pre-built Path2D as a perf hint;
// interior lines keep raw points for per-frame flow displacement.
interface PreparedLine {
  path: Path2D | null;
  pts: Float32Array;
  n: number;
  depth: number;
  dw: number;
}

interface PreparedForm {
  id: FormId;
  lines: PreparedLine[];
  bbox: BBox;
  centroid: [number, number];
  anchor: [number, number];
  colour: string;
  twh: number;
  motion: FormMotion;
  // Indices of the polylines that form the outer silhouette — drawn
  // as an opaque page-background fill before the texture strokes so
  // connector lines beneath the canvas don't show through the form's
  // interior gaps.
  silhouetteIndices: number[];
}

function buildPath2D(pts: Float32Array, n: number): Path2D {
  const p = new Path2D();
  if (n < 2) return p;
  p.moveTo(pts[0], pts[1]);
  for (let k = 1; k < n; k++) {
    p.lineTo(pts[k * 2], pts[k * 2 + 1]);
  }
  return p;
}

function pickSilhouetteIndices(lines: PreparedLine[]): number[] {
  // Single largest-bbox-area polyline only. Multiple silhouettes
  // (the prior 80%-of-max set) produced visible doubled outlines
  // because the fill boundary and the outermost stroke didn't sit
  // on the same path. With a single index, the fill boundary
  // coincides exactly with the outermost stroke and the form reads
  // clean.
  if (lines.length === 0) return [];
  let maxArea = -Infinity;
  let maxIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
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
    if (a > maxArea) { maxArea = a; maxIdx = i; }
  }
  return [maxIdx];
}

const FORMS: Record<FormId, PreparedForm> = (() => {
  const out = {} as Record<FormId, PreparedForm>;
  for (const id of FORM_IDS) {
    const raw = DATA[id];
    const { polylines, bbox } = buildPolylines(raw.form_paths);
    const N = polylines.length;
    const lines: PreparedLine[] = polylines.map((L, li) => {
      const depth = N > 1 ? li / (N - 1) : 0;
      const dw = depthWeight(depth);
      return {
        path: dw === 0 ? buildPath2D(L.pts, L.n) : null,
        pts: L.pts,
        n: L.n,
        depth,
        dw,
      };
    });
    out[id] = {
      id,
      lines,
      bbox,
      centroid: raw.centroid,
      anchor: raw.anchor ?? raw.centroid,
      colour: raw.colour ?? '#0d1a1e',
      twh: raw.twh,
      // TWh stands in for the magnitude parameter that emissions
      // plays in poster 001. Hub (1542) extrapolates slightly past
      // the eMax of poster 001's calibration (970); accepted.
      motion: resolveMotion(raw.twh),
      silhouetteIndices: pickSilhouetteIndices(lines),
    };
  }
  return out;
})();

// Page background colour — used to fill form silhouettes so the
// connectors that run beneath the canvas don't show through the
// stroke gaps. Matches CLAUDE.md's locked palette.
const PAGE_BG = '#ECE7DF';

// Sector labels are outlined glyph paths from the print SVG. They're
// scaled outward from each label's first-glyph anchor so the small
// print type reads comfortably at viewport size. The scale flows
// into the viewBox bbox calculation below.
const SECTOR_LABEL_SCALE = 1.3;

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
// Per-sector label transforms — push each label radially outward
// from its parent carrier so the dot's outer edge clears before the
// label glyphs begin. Computed once at module scope.
// ─────────────────────────────────────────────────────────────────

const SECTOR_BY_ID: Record<string, RawSector> = (() => {
  const out: Record<string, RawSector> = {};
  for (const s of SECTORS) out[s.id] = s;
  return out;
})();

// For each label: shift it along the (dot → label-centroid) axis
// just enough to ensure its nearest glyph anchor sits at least
// SECTOR_LABEL_DOT_CLEARANCE_PX past the dot's outer edge. The
// previous fixed-direction nudge along the carrier→dot radial moved
// the wrong way for sectors whose print-natural label sits inboard
// of (between hub and) the dot, leaving labels still on top of
// their dots in the petroleum cluster. The dot-centric approach
// works regardless of which side of the dot the print places the
// label on.
//
// The clearance includes a rough per-glyph extent so the label's
// rendered EDGE clears (not just the glyph anchor point).
const SECTOR_LABEL_GLYPH_EXTENT_PX = 14;
const SECTOR_LABEL_DOT_CLEARANCE_PX = 6;

interface LabelTransform {
  ax: number;
  ay: number;
  dx: number;
  dy: number;
}

const LABEL_TRANSFORMS: Record<string, LabelTransform> = (() => {
  const out: Record<string, LabelTransform> = {};
  for (const [sectorId, glyphs] of Object.entries(SECTOR_LABELS)) {
    if (glyphs.length === 0) continue;
    const sec = SECTOR_BY_ID[sectorId];
    if (!sec) continue;

    const ax = glyphs[0].x;
    const ay = glyphs[0].y;

    // Walk the post-scale glyph anchors: track the nearest distance
    // to the dot AND the centroid of all anchors (used as the shift
    // direction).
    let nearestAnchorDist = Infinity;
    let cSumX = 0;
    let cSumY = 0;
    for (const g of glyphs) {
      const gx = ax + SECTOR_LABEL_SCALE * (g.x - ax);
      const gy = ay + SECTOR_LABEL_SCALE * (g.y - ay);
      const d = Math.hypot(gx - sec.cx, gy - sec.cy);
      if (d < nearestAnchorDist) nearestAnchorDist = d;
      cSumX += gx;
      cSumY += gy;
    }
    const cX = cSumX / glyphs.length;
    const cY = cSumY / glyphs.length;

    // Required nearest-anchor distance for the label's rendered edge
    // to clear the dot by the breathing-room buffer.
    const desired =
      sec.r + SECTOR_LABEL_GLYPH_EXTENT_PX + SECTOR_LABEL_DOT_CLEARANCE_PX;

    let dx = 0;
    let dy = 0;
    const need = desired - nearestAnchorDist;
    if (need > 0) {
      // Shift along (dot → centroid) — moves the whole label away
      // from the dot regardless of which side of the dot it sits on.
      let dirX = cX - sec.cx;
      let dirY = cY - sec.cy;
      let dirMag = Math.hypot(dirX, dirY);
      if (dirMag < 0.5) {
        // Centroid coincides with the dot — fall back to the
        // carrier→dot radial.
        const ca = FORMS[sec.carrier].anchor;
        dirX = sec.cx - ca[0];
        dirY = sec.cy - ca[1];
        dirMag = Math.hypot(dirX, dirY) || 1;
      }
      dx = (dirX / dirMag) * need;
      dy = (dirY / dirMag) * need;
    }

    out[sectorId] = { ax, ay, dx, dy };
  }
  return out;
})();

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
  // Sector label glyph anchors. Apply the same combined transform
  // (radial translate + 1.3× scale-around-first-glyph) that the <g>
  // uses at render time so the bbox covers where the labels actually
  // land.
  const LABEL_W = 90 * SECTOR_LABEL_SCALE;
  const LABEL_H = 20 * SECTOR_LABEL_SCALE;
  for (const [sectorId, glyphs] of Object.entries(SECTOR_LABELS)) {
    if (glyphs.length === 0) continue;
    const t = LABEL_TRANSFORMS[sectorId];
    if (!t) continue;
    for (const g of glyphs) {
      const sx = t.ax + SECTOR_LABEL_SCALE * (g.x - t.ax) + t.dx;
      const sy = t.ay + SECTOR_LABEL_SCALE * (g.y - t.ay) + t.dy;
      expand(sx - LABEL_W, sy - LABEL_H);
      expand(sx + LABEL_W, sy + LABEL_H);
    }
  }
  // Carrier-name label boxes.
  for (const cl of CARRIER_LABELS) {
    expand(cl.x - 80, cl.y - 12);
    expand(cl.x + 80, cl.y + 35);
  }
  // Hub label sits below the form (instruction is now an HTML
  // element outside the SVG).
  expand(FORMS.total.centroid[0] - 200, 1010 - 12);
  expand(FORMS.total.centroid[0] + 200, 1052 + 16);

  // 2.5% pad on each side — tightened so content fills more of the
  // rendered viewBox.
  const w = maxX - minX;
  const h = maxY - minY;
  const padX = w * 0.025;
  const padY = h * 0.025;
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
  const carrierLabelRefs = useRef<Record<string, SVGTextElement | null>>({});

  // Dev-only FPS counter (mirrors Poster001CanvasViz). Rendered as
  // a small absolute-positioned chip in the top-right of the stage.
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (import.meta.env.PROD) return;
    let frames = 0;
    let lastReport = performance.now();
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      frames++;
      const now = performance.now();
      if (now - lastReport >= 500) {
        setFps(Math.round((frames * 1000) / (now - lastReport)));
        frames = 0;
        lastReport = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, []);

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

    // Cap at 2.0 for retina sharpness — pixel count goes up ~78% vs
    // 1.5, but the silhouette-singleton + alpha-guard work in this
    // commit recovers the budget. Verify on the dev FPS counter
    // before pushing further.
    const DPR = Math.min(window.devicePixelRatio || 1, 2.0);

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
    const lastSyncedCarrierLabel: Record<string, number> = {};
    const t0 = performance.now();

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
      // Pulled into closure-locals so the hot loop hits them without
      // property-access overhead. Mirror Poster001CanvasViz exactly.
      const t = (now - t0) / 1000;
      const k1 = TUNING.flowK1;
      const w1 = TUNING.flowW1;
      const k2 = TUNING.flowK2;
      const w2 = TUNING.flowW2;
      const a2w = TUNING.flowAmp2Weight;
      const t1off = w1 * t;
      const t1offY = w1 * t * 1.3;
      const t2off = w2 * t * 1.7;
      const t2offY = w2 * t * 0.7;
      const NUM_BUCKETS = 8;

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
        // Skip when the form is heavily dimmed — the connectors
        // beneath are also at DIM_OPACITY, so occlusion isn't load-
        // bearing and the fill cost adds no visible value.
        if (f.silhouetteIndices.length > 0 && alpha > 0.1) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = PAGE_BG;
          ctx.beginPath();
          for (const idx of f.silhouetteIndices) {
            const L = f.lines[idx];
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

        const flowAmp = f.motion.flowAmp;
        const N = f.lines.length;

        // Bucket-batched strokes — outlines (line.path !== null) go
        // through unchanged, interiors get a per-point flow
        // displacement at amplitude flowAmp × line.dw.
        for (let bucket = 0; bucket < NUM_BUCKETS; bucket++) {
          const bucketDepthMid = (bucket + 0.5) / NUM_BUCKETS;
          ctx.globalAlpha = alpha * (0.5 + 0.5 * (1 - bucketDepthMid));
          ctx.beginPath();

          for (let li = 0; li < N; li++) {
            const line = f.lines[li];
            const lineBucket = Math.min(
              NUM_BUCKETS - 1,
              Math.floor(line.depth * NUM_BUCKETS),
            );
            if (lineBucket !== bucket) continue;

            // Outline line — no displacement.
            if (line.path !== null) {
              const pts = line.pts;
              const n = line.n;
              if (n < 2) continue;
              ctx.moveTo(pts[0], pts[1]);
              for (let kk = 1; kk < n; kk++) {
                ctx.lineTo(pts[kk * 2], pts[kk * 2 + 1]);
              }
              continue;
            }

            // Interior line — per-point flow displacement.
            const pts = line.pts;
            const n = line.n;
            if (n < 2) continue;
            const a = flowAmp * line.dw;

            {
              const x = pts[0];
              const y = pts[1];
              const ax1 = k1 * x + t1off;
              const ay1 = k1 * y + t1offY;
              const ax2 = k2 * x + t2off;
              const ay2 = k2 * y + t2offY;
              const dx =
                Math.sin(ax1) * Math.cos(ay1) +
                a2w * Math.sin(ax2) * Math.cos(ay2);
              const dy =
                -Math.cos(ax1) * Math.sin(ay1) -
                a2w * Math.cos(ax2) * Math.sin(ay2);
              ctx.moveTo(x + a * dx, y + a * dy);
            }
            for (let kk = 1; kk < n; kk++) {
              const x = pts[kk * 2];
              const y = pts[kk * 2 + 1];
              const ax1 = k1 * x + t1off;
              const ay1 = k1 * y + t1offY;
              const ax2 = k2 * x + t2off;
              const ay2 = k2 * y + t2offY;
              const dx =
                Math.sin(ax1) * Math.cos(ay1) +
                a2w * Math.sin(ax2) * Math.cos(ay2);
              const dy =
                -Math.cos(ax1) * Math.sin(ay1) -
                a2w * Math.cos(ax2) * Math.sin(ay2);
              ctx.lineTo(x + a * dx, y + a * dy);
            }
          }

          ctx.stroke();
        }

        ctx.restore();
      }

      // ── Pulse-tips on canvas ──
      // Pulses read as bright yellow-white electricity flowing
      // through the connector lines — no carrier colour. Three
      // layered elements per pulse:
      //   1. Warm-yellow radial glow at the head.
      //   2. White core dot for the focal point.
      //   3. Warm-white bell-curve bulge along the connector path
      //      centred on the head.
      // The bulge is longer than the glow so the pulse reads as a
      // sustained streak rather than a moving spot.
      if (anim.pulses.length > 0) {
        const SAMPLES = 12;
        const samplePts: { x: number; y: number }[] = new Array(SAMPLES + 1);
        for (let i = 0; i <= SAMPLES; i++) samplePts[i] = { x: 0, y: 0 };

        for (const p of anim.pulses) {
          const path = connectorRefs.current[p.pathId];
          const len = anim.linkLengths[p.pathId];
          if (!path || !len) continue;

          const t = p.progress * len;
          const head = path.getPointAtLength(t);

          // 1. Warm-yellow radial glow at the head.
          const glow = ctx.createRadialGradient(
            head.x, head.y, 0,
            head.x, head.y, PULSE_GLOW_RADIUS,
          );
          glow.addColorStop(0,   PULSE_GLOW_COLOR);
          glow.addColorStop(0.4, PULSE_GLOW_MID_COLOR);
          glow.addColorStop(1,   PULSE_GLOW_EDGE_COLOR);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(head.x, head.y, PULSE_GLOW_RADIUS, 0, Math.PI * 2);
          ctx.fill();

          // 2. White core dot.
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = PULSE_CORE_COLOR;
          ctx.beginPath();
          ctx.arc(head.x, head.y, PULSE_CORE_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          // 3. Warm-white bell-curve bulge along the connector path.
          const halfLen = PULSE_BULGE_HALF_LEN;
          for (let i = 0; i <= SAMPLES; i++) {
            const offset = ((i / SAMPLES) * 2 - 1) * halfLen;
            const d = Math.max(0, Math.min(len, t + offset));
            const pt = path.getPointAtLength(d);
            samplePts[i].x = pt.x;
            samplePts[i].y = pt.y;
          }

          ctx.strokeStyle = PULSE_BULGE_COLOR;
          ctx.lineWidth = PULSE_BULGE_WIDTH;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (let i = 0; i < SAMPLES; i++) {
            const tMid = ((i + 0.5) / SAMPLES) * 2 - 1;
            const alpha = Math.cos((tMid * Math.PI) / 2); // bell, peak 1
            if (alpha <= 0.01) continue;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(samplePts[i].x, samplePts[i].y);
            ctx.lineTo(samplePts[i + 1].x, samplePts[i + 1].y);
            ctx.stroke();
          }
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

      // Carrier-name label opacity.
      for (const c of CARRIER_IDS) {
        const v = anim.carrierLabelOpacity[c];
        if (lastSyncedCarrierLabel[c] !== v) {
          lastSyncedCarrierLabel[c] = v;
          const el = carrierLabelRefs.current[c];
          if (el) el.style.opacity = String(v);
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
      {!import.meta.env.PROD && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            padding: '2px 6px',
            background: 'rgba(13,26,30,0.85)',
            color: '#ece7df',
            borderRadius: 3,
            pointerEvents: 'none',
          }}
        >
          {fps} fps
        </div>
      )}
      <div
        ref={stageRef}
        className="relative w-full mx-auto"
        style={{
          aspectRatio: `${VIEWBOX.w} / ${VIEWBOX.h}`,
          // 90vh lets the diagram dominate the vertical space; the
          // buttons and caveat below scroll into view if needed.
          // 1800 px ceiling gives plenty of headroom on ultrawides.
          maxWidth: `min(95vw, calc(90vh * ${VIEWBOX.w} / ${VIEWBOX.h}), 1800px)`,
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

          {/* Sector labels. Each label is pushed radially outward
              from its parent carrier (so the dot's outer edge clears
              before the glyphs begin) AND scaled 1.3× around its
              first-glyph anchor for readability. The lone unmatched
              solidFuel/Chemicals dot has no entry in
              DATA.labels.sectors and renders without a label —
              accepted as-is for v1. */}
          <g id="sector-labels" pointerEvents="none" fill="#0d1a1e">
            {Object.entries(SECTOR_LABELS).map(([sectorId, glyphs]) => {
              const t = LABEL_TRANSFORMS[sectorId];
              if (!t) return null;
              return (
                <g
                  key={sectorId}
                  ref={(el) => { sectorLabelRefs.current[sectorId] = el; }}
                  data-sector-label={sectorId}
                  transform={
                    `translate(${t.dx} ${t.dy}) ` +
                    `translate(${t.ax} ${t.ay}) ` +
                    `scale(${SECTOR_LABEL_SCALE}) ` +
                    `translate(${-t.ax} ${-t.ay})`
                  }
                  style={{ opacity: 0 }}
                >
                  {glyphs.map((g, i) => (
                    <path key={i} d={g.d} />
                  ))}
                </g>
              );
            })}
          </g>

          {/* Hub label — sits BELOW the central form, matching the
              print's actual placement. Visible at DEFAULT and
              during CASCADE_FULL, fades out on completion, returns
              on RESET. */}
          <g
            id="hub-label"
            pointerEvents="none"
            style={{
              opacity: state.hubLabelVisible ? 1 : 0,
              transition: `opacity ${OPACITY_CROSSFADE_MS}ms ease-out`,
            }}
          >
            <text
              x={FORMS.total.centroid[0]}
              y={1010}
              textAnchor="middle"
              style={{
                fontFamily: "'Playfair', Georgia, serif",
                fontSize: 44,
                fontWeight: 600,
                fill: '#0d1a1e',
              }}
            >
              1,542 TWh
            </text>
            <text
              x={FORMS.total.centroid[0]}
              y={1052}
              textAnchor="middle"
              style={{
                fontFamily: "'Playfair', Georgia, serif",
                fontSize: 22,
                fontStyle: 'italic',
                fill: '#0d1a1e',
              }}
            >
              UK final energy, 2024
            </text>
          </g>

          {/* Carrier-name labels. RAF loop drives opacity from
              anim.carrierLabelOpacity per the engine's tweens. */}
          <g id="carrier-labels" pointerEvents="none">
            {CARRIER_LABELS.map((cl) => (
              <text
                key={cl.id}
                ref={(el) => { carrierLabelRefs.current[cl.id] = el; }}
                x={cl.x}
                y={cl.y}
                textAnchor={cl.anchor}
                data-carrier-label={cl.id}
                style={{
                  fontFamily: "'Playfair', Georgia, serif",
                  fontSize: 24,
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
                    fontSize: 17,
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

      {/* Hover instruction — sits as plain HTML below the diagram so
          it can never overlap any visualisation content. Same fade
          behaviour driven by state.hoverInstructionVisible. Layout
          space is preserved when invisible (opacity, not display). */}
      <p
        aria-live="polite"
        className="mt-4 text-center italic text-foreground/70"
        style={{
          fontFamily: "'Playfair', Georgia, serif",
          fontSize: 18,
          opacity: state.hoverInstructionVisible ? 1 : 0,
          transition: `opacity ${INSTRUCTION_FADE_IN_MS}ms ease-out`,
          minHeight: '1.5em',
        }}
      >
        {coarsePointer
          ? 'Tap the forms to explore the system'
          : 'Hover the forms to see how the energy system flows'}
      </p>

      {/* Buttons. Three muted text-link buttons separated by middots. */}
      <div
        className="mt-3 flex justify-center items-center gap-2 text-sm text-muted-foreground"
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
