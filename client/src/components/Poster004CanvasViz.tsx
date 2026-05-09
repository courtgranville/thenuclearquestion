import { useEffect, useReducer, useRef } from 'react';
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
  tickAnimation,
  ABSORB_BLIP_PEAK_SCALE,
  PULSE_HEAD_RADIUS,
  PULSE_HALO_RADIUS,
  PULSE_HALO_ALPHA,
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

const SVG_VIEW_W = 1967.58;
const SVG_VIEW_H = 1674.75;

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
    };
  }
  return out;
})();

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
// Component
// ─────────────────────────────────────────────────────────────────

export default function Poster004CanvasViz() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef     = useRef<HTMLDivElement | null>(null);
  const canvasRef    = useRef<HTMLCanvasElement | null>(null);
  const animRef      = useRef<AnimState>(makeInitialAnimState());
  const [, dispatch] = useReducer(reducer, initialState);
  void dispatch; // unused in commit 4 scaffold; pointer wiring in commit 5

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

    // Populate link lengths from the live SVG paths.
    const lengths: Record<string, number> = {};
    for (const l of ALL_LINKS) {
      const el = connectorRefs.current[l.id];
      if (el) lengths[l.id] = el.getTotalLength();
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
      const scale = Math.min(cssW / SVG_VIEW_W, cssH / SVG_VIEW_H);
      const offsetX = (cssW - SVG_VIEW_W * scale) / 2;
      const offsetY = (cssH - SVG_VIEW_H * scale) / 2;
      ctx.setTransform(
        scale * DPR, 0, 0, scale * DPR,
        offsetX * DPR, offsetY * DPR,
      );
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    let rafId = 0;
    let lastSyncedConnector: Record<string, number> = {};
    let lastSyncedSectorScale: Record<string, number> = {};
    let lastSyncedSectorBlip: Record<string, number> = {};
    let lastSyncedLabel: Record<string, number> = {};

    const frame = (now: number) => {
      tickAnimation(animRef.current, now);
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

          // Trail (gradient stroke from tail to head)
          const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, p.color);
          ctx.strokeStyle = grad;
          ctx.globalAlpha = PULSE_STROKE_ALPHA;
          ctx.lineWidth = PULSE_STROKE_WIDTH;
          ctx.beginPath();
          ctx.moveTo(tail.x, tail.y);
          ctx.lineTo(head.x, head.y);
          ctx.stroke();

          // Head
          ctx.globalAlpha = 1;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(head.x, head.y, PULSE_HEAD_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 0.5;
      }

      // ── Sync SVG element styles from anim state (no React re-render) ──
      // Connector + dot (shared opacity).
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

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="w-full relative" ref={containerRef}>
      <div
        ref={stageRef}
        className="relative w-full mx-auto"
        style={{
          aspectRatio: `${SVG_VIEW_W} / ${SVG_VIEW_H}`,
          maxWidth: `calc(85vh * ${SVG_VIEW_W} / ${SVG_VIEW_H})`,
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
        />
        <svg
          viewBox={`0 0 ${SVG_VIEW_W} ${SVG_VIEW_H}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="UK final energy in 2024 by carrier and end-use sector — 1,542 TWh total"
        >
          {/* Connectors (under sector dots so dots sit on top). */}
          <g id="connectors" pointerEvents="none">
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
                style={{ opacity: 0 }}
              />
            ))}
          </g>

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
                style={{ opacity: 0 }}
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

          {/* Hub label. */}
          <g id="hub-label" pointerEvents="none">
            <text
              x={FORMS.total.centroid[0]}
              y={FORMS.total.centroid[1] - 4}
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
              y={FORMS.total.centroid[1] + 22}
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

          {/* Hit areas (transparent rects layered on top of forms).
              No pointer handlers in commit 4 — wiring lands in 5/6. */}
          <g id="hit-areas">
            <rect
              data-hit="hub"
              x={HUB_HIT_RECT.x}
              y={HUB_HIT_RECT.y}
              width={HUB_HIT_RECT.w}
              height={HUB_HIT_RECT.h}
              fill="transparent"
              style={{ cursor: 'pointer' }}
            />
            {CARRIER_IDS.map((id) => {
              const r = CARRIER_HIT_RECTS[id];
              return (
                <rect
                  key={id}
                  data-hit={id}
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
