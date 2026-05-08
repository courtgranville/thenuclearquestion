import { useEffect, useReducer, useRef, useState } from 'react';
import { buildPolylines, type BBox } from '@/lib/parseSvg';
import { TUNING, depthWeight } from '@/lib/posterMotion';
import formsData from '@/assets/poster-003-forms.json';
import {
  MAX_DEATHS_FOR_SOURCE,
  SOURCE_IDS,
  type SourceId,
  type VizState,
} from '@/lib/poster003Data';

/**
 * Poster 003 — deaths-by-source canvas layer + label overlay.
 *
 * Mirrors Poster001CanvasViz architecture: module-level form
 * pre-parse, alpha-bucketed stroke batching, RAF loop, outline-vs-
 * interior split with per-point flow on interiors only.
 *
 * Form layout: gravity-based physics simulation. Each visible
 * source has a position that eases under three forces — gravity
 * toward a baseline ~70% down the canvas, weak horizontal pull
 * toward the canvas centre, and pairwise repulsion when bounding
 * circles overlap. Damping settles the cluster instead of
 * oscillating. Positions persist across frames so the cluster
 * eases smoothly during slider drag.
 *
 * Form scaling: sqrt-area-proportional with a 1.3× scale-up
 *   currentScale_visual = √(deaths / max) × FORM_SCALE_MULT
 * Brings the cluster's visual weight up so it reads as substantial
 * relative to the dot grid.
 *
 * Mycelium decay (graded curve, per brief 2025-05-08):
 *   1.0 → 0.85   normal flow on interiors
 *   0.85 → 0.4   trembleAmp ramps 0 → 2.5×; flow freq × 1.7
 *   0.4 → 0.08   tremble at peak; outline + interior fray
 *                radially outward, full magnitude at 0.08
 *   0.08 → 0     alpha fades 1 → 0 alongside continued fraying
 * Reference: fungal/mycelial growth in a petri dish.
 *
 * Labels and connectors are React-controlled SVG, anchored to the
 * form's current physics-driven centroid (not the static JSON
 * centroid). They follow the form smoothly during drag.
 */

// Canvas viewBox (the S1 deaths SVG viewBox).
const SVG_VIEW_X = 387.10;
const SVG_VIEW_Y = 410.07;
const SVG_VIEW_W = 867.91;
const SVG_VIEW_H = 515.22;

// Cluster targets in absolute viewBox coordinates.
const BASELINE_FRAC = 0.7;
const BASELINE_Y = SVG_VIEW_Y + BASELINE_FRAC * SVG_VIEW_H;
const CENTER_X = SVG_VIEW_X + 0.5 * SVG_VIEW_W;

// Visual scale-up applied on top of currentScale = √(deaths/max).
// 1.3× brings the cluster's visual weight up so it reads as
// substantial relative to the dot grid above.
const FORM_SCALE_MULT = 1.3;

// Below this scale a form is considered "gone" and skipped.
const ACTIVE_THRESHOLD = 0.05;

// Stone for non-nuclear, ochre for nuclear (CLAUDE.md canonical).
const STROKE_NUCLEAR = '#b5822e';
const STROKE_OTHER = '#7d746a';

// ─── Mycelium decay curve constants ──────────────────────────────
const TH_NORMAL = 0.85;          // above: no extras
const TH_TREMBLE = 0.4;          // 0.85 → 0.4: tremble ramps in
const TH_FRAY = 0.08;            // 0.4 → 0.08: fray ramps in
// Below TH_FRAY: alpha fades 1 → 0.

const TREMBLE_AMP_PEAK = 2.5;
const TREMBLE_FREQ_PEAK_MULT = 1.7;

const FRAY_VISIBLE_MAG = 10;
const FRAY_NOISE_K = 0.6;
const FRAY_NOISE_W = 0.45;

// Constant interior flow amplitude (SVG space).
const INTERIOR_FLOW_AMP = 4;

// Labels sit a fixed gap outside the form's current edge.
const LABEL_OPACITY_THRESHOLD = 0.15;
const LABEL_GAP = 26;

// ─── Physics constants ──────────────────────────────────────────
// Gravity pulls every active form toward BASELINE_Y. A floor
// spring above-baseline kicks in when a form is pushed below the
// baseline (so the cluster tucks against the baseline rather than
// falling through). Centering is a weak horizontal pull. Repulsion
// is strong on overlap so small forms don't get crushed under big
// ones. Damping bleeds energy each substep so the system settles.
const GRAVITY = 90;            // viewBox units / s²
const CENTER_K = 1.4;          // weak horizontal spring toward centre
const FLOOR_K = 12;            // strong spring back from below baseline
const REPULSION_K = 18;        // overlap repulsion magnitude
const REPULSION_PAD = 6;       // extra spacing between bounding circles
const DAMPING = 0.84;
const PHYSICS_SUBSTEPS = 4;

interface PreparedLine {
  pts: Float32Array;
  n: number;
  depth: number;
  dw: number;
}

interface LabelData {
  name: string;
  position: [number, number];
  textAnchor: 'start' | 'end';
  formEdgeDirection: 'left' | 'right' | 'top' | 'bottom';
}

interface PreparedForm {
  id: SourceId;
  lines: PreparedLine[];
  bbox: BBox;
  centroid: [number, number];
  formRadius: number;
  maxDeaths: number;
  stroke: string;
  label: LabelData;
}

const EDGE_DIRECTION: Record<
  'left' | 'right' | 'top' | 'bottom',
  [number, number]
> = {
  left: [-1, 0],
  right: [1, 0],
  top: [0, -1],
  bottom: [0, 1],
};

type FormJson = {
  paths: string[];
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  centroid: [number, number];
  deaths: number;
  label: LabelData;
};

const FORMS: PreparedForm[] = SOURCE_IDS.map((id) => {
  const data = (formsData as Record<SourceId, FormJson>)[id];
  const { polylines, bbox } = buildPolylines(data.paths);
  const N = polylines.length;
  const lines: PreparedLine[] = polylines.map((L, li) => {
    const depth = N > 1 ? li / (N - 1) : 0;
    return { pts: L.pts, n: L.n, depth, dw: depthWeight(depth) };
  });
  const radius = Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY) / 2;
  return {
    id,
    lines,
    bbox,
    centroid: data.centroid,
    formRadius: radius,
    maxDeaths: MAX_DEATHS_FOR_SOURCE[id],
    stroke: id === 'nuclear' ? STROKE_NUCLEAR : STROKE_OTHER,
    label: data.label,
  };
});

const FORM_BY_ID: Record<SourceId, PreparedForm> = SOURCE_IDS.reduce(
  (acc, id) => {
    acc[id] = FORMS.find((f) => f.id === id)!;
    return acc;
  },
  {} as Record<SourceId, PreparedForm>,
);

// ─── Decay-stage helpers ─────────────────────────────────────────

interface DecayState {
  trembleAmp: number;
  trembleFreqMult: number;
  frayAmp: number;
  alpha: number;
}

function decayStateFor(currentScale: number): DecayState {
  if (currentScale >= TH_NORMAL) {
    return { trembleAmp: 0, trembleFreqMult: 1, frayAmp: 0, alpha: 1 };
  }
  if (currentScale >= TH_TREMBLE) {
    const t = (TH_NORMAL - currentScale) / (TH_NORMAL - TH_TREMBLE);
    return {
      trembleAmp: TREMBLE_AMP_PEAK * t,
      trembleFreqMult: 1 + (TREMBLE_FREQ_PEAK_MULT - 1) * t,
      frayAmp: 0,
      alpha: 1,
    };
  }
  if (currentScale >= TH_FRAY) {
    const t = (TH_TREMBLE - currentScale) / (TH_TREMBLE - TH_FRAY);
    return {
      trembleAmp: TREMBLE_AMP_PEAK,
      trembleFreqMult: TREMBLE_FREQ_PEAK_MULT,
      frayAmp: t,
      alpha: 1,
    };
  }
  return {
    trembleAmp: TREMBLE_AMP_PEAK,
    trembleFreqMult: TREMBLE_FREQ_PEAK_MULT,
    frayAmp: 1,
    alpha: Math.max(0, currentScale / TH_FRAY),
  };
}

// ─── Physics ─────────────────────────────────────────────────────

interface FormPhysics {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  hasBeenSeen: boolean;
}

function newPhysicsState(): Record<SourceId, FormPhysics> {
  const out = {} as Record<SourceId, FormPhysics>;
  for (const id of SOURCE_IDS) {
    const f = FORM_BY_ID[id];
    // Seed at the JSON centroid; the simulation will pull them into
    // the cluster on the first frames they're active.
    out[id] = {
      x: f.centroid[0],
      y: f.centroid[1],
      vx: 0,
      vy: 0,
      active: false,
      hasBeenSeen: false,
    };
  }
  return out;
}

// Compute the cluster centroid (mean of currently-active form
// positions). Used to re-introduce a returning form somewhere
// sensible if it has no remembered position.
function clusterCentroid(
  phys: Record<SourceId, FormPhysics>,
): [number, number] {
  let sx = 0, sy = 0, n = 0;
  for (const id of SOURCE_IDS) {
    if (phys[id].active) {
      sx += phys[id].x;
      sy += phys[id].y;
      n++;
    }
  }
  return n > 0 ? [sx / n, sy / n] : [CENTER_X, BASELINE_Y];
}

function runPhysicsStep(
  phys: Record<SourceId, FormPhysics>,
  scaleById: Record<SourceId, number>,
  dt: number,
): void {
  // Forces are accumulated into ax/ay for each active form, then
  // converted to velocity + position updates with damping.
  const ax: Record<string, number> = {};
  const ay: Record<string, number> = {};
  for (const id of SOURCE_IDS) {
    if (!phys[id].active) continue;
    ax[id] = 0;
    ay[id] = 0;
    // Gravity (constant down).
    ay[id] += GRAVITY;
    // Center pull (weak horizontal spring).
    ax[id] += (CENTER_X - phys[id].x) * CENTER_K;
    // Floor spring — only above baseline; below, gravity has free
    // rein so the cluster tucks against the floor.
    if (phys[id].y > BASELINE_Y) {
      ay[id] += (BASELINE_Y - phys[id].y) * FLOOR_K;
    }
  }
  // Pairwise repulsion. Bounding-circle radius uses the form's
  // visual radius (formRadius × visualScale × FORM_SCALE_MULT).
  for (let i = 0; i < SOURCE_IDS.length; i++) {
    const idA = SOURCE_IDS[i];
    if (!phys[idA].active) continue;
    for (let j = i + 1; j < SOURCE_IDS.length; j++) {
      const idB = SOURCE_IDS[j];
      if (!phys[idB].active) continue;
      const a = phys[idA];
      const b = phys[idB];
      const fa = FORM_BY_ID[idA];
      const fb = FORM_BY_ID[idB];
      const rA = fa.formRadius * scaleById[idA] * FORM_SCALE_MULT;
      const rB = fb.formRadius * scaleById[idB] * FORM_SCALE_MULT;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = rA + rB + REPULSION_PAD;
      if (dist < minDist && dist > 0.01) {
        const overlap = minDist - dist;
        const ux = dx / dist;
        const uy = dy / dist;
        const f = overlap * REPULSION_K;
        ax[idA] -= ux * f;
        ay[idA] -= uy * f;
        ax[idB] += ux * f;
        ay[idB] += uy * f;
      }
    }
  }
  // Integrate.
  for (const id of SOURCE_IDS) {
    if (!phys[id].active) continue;
    const s = phys[id];
    s.vx = (s.vx + ax[id] * dt) * DAMPING;
    s.vy = (s.vy + ay[id] * dt) * DAMPING;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }
}

// ─── React component ────────────────────────────────────────────

export interface Poster003CanvasDeathsProps {
  vizState: VizState;
}

export default function Poster003CanvasDeaths({
  vizState,
}: Poster003CanvasDeathsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live ref for the RAF loop.
  const vizStateRef = useRef<VizState>(vizState);
  vizStateRef.current = vizState;

  // Physics state — persists across frames; never reset.
  const physicsRef = useRef<Record<SourceId, FormPhysics> | null>(null);
  if (physicsRef.current === null) {
    physicsRef.current = newPhysicsState();
  }

  // forceUpdate → triggers a React re-render so the SVG label layer
  // can read the latest physicsRef positions each frame.
  const [, forceUpdate] = useReducer((x: number) => (x + 1) % 1e9, 0);

  // ─── Dev FPS counter ────────────────────────────────────────────
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

  // ─── Canvas RAF loop ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // DPR cap raised to 2 (was 1.5) for sharper organic forms.
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const r = container.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      canvas.width = Math.max(1, Math.floor(cssW * DPR));
      canvas.height = Math.max(1, Math.floor(cssH * DPR));
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      const scale = Math.min(cssW / SVG_VIEW_W, cssH / SVG_VIEW_H);
      const offsetX = (cssW - SVG_VIEW_W * scale) / 2;
      const offsetY = (cssH - SVG_VIEW_H * scale) / 2;
      ctx.setTransform(
        scale * DPR,
        0,
        0,
        scale * DPR,
        (offsetX - SVG_VIEW_X * scale) * DPR,
        (offsetY - SVG_VIEW_Y * scale) * DPR,
      );
      // Hand-drawn organic forms — keep antialiasing on.
      ctx.imageSmoothingEnabled = true;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const t0 = performance.now();
    let lastFrameMs = t0;
    let rafId = 0;

    const k1 = TUNING.flowK1;
    const w1 = TUNING.flowW1;

    const NUM_BUCKETS = 8;

    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      const dtFrame = Math.min(0.05, (now - lastFrameMs) / 1000);
      lastFrameMs = now;

      const viz = vizStateRef.current;
      const phys = physicsRef.current!;

      // ─── Update physics activity + scales ─────────────────────
      const visualScaleById: Record<SourceId, number> = {} as Record<
        SourceId,
        number
      >;
      const visualWithMultById: Record<SourceId, number> = {} as Record<
        SourceId,
        number
      >;
      for (const id of SOURCE_IDS) {
        const f = FORM_BY_ID[id];
        const sourceState = viz.geometricSources[id];
        const ratio = sourceState.deaths / f.maxDeaths;
        const baseScale = ratio > 0 ? Math.sqrt(ratio) : 0;
        visualScaleById[id] = baseScale;
        visualWithMultById[id] = baseScale * FORM_SCALE_MULT;
        const wantActive = baseScale > ACTIVE_THRESHOLD;
        if (wantActive && !phys[id].active) {
          // (Re-)enter the simulation. If we've never seen this
          // form before, drop it at the cluster centroid (or, if
          // empty, at the canvas-centre baseline). Otherwise keep
          // its remembered position so it returns where it left.
          if (!phys[id].hasBeenSeen) {
            const [cx, cy] = clusterCentroid(phys);
            phys[id].x = cx;
            phys[id].y = cy;
            phys[id].vx = 0;
            phys[id].vy = 0;
            phys[id].hasBeenSeen = true;
          }
          phys[id].active = true;
        } else if (!wantActive && phys[id].active) {
          phys[id].active = false;
          phys[id].vx = 0;
          phys[id].vy = 0;
        }
      }

      // ─── Run physics substeps ─────────────────────────────────
      const subDt = dtFrame / PHYSICS_SUBSTEPS;
      for (let s = 0; s < PHYSICS_SUBSTEPS; s++) {
        runPhysicsStep(phys, visualWithMultById, subDt);
      }

      // ─── Draw canvas ─────────────────────────────────────────
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 0.5;

      const tFray = FRAY_NOISE_W * t;

      for (const form of FORMS) {
        const baseScale = visualScaleById[form.id];
        if (baseScale <= ACTIVE_THRESHOLD) continue;
        const visualScale = baseScale * FORM_SCALE_MULT;

        const { trembleAmp, trembleFreqMult, frayAmp, alpha } =
          decayStateFor(baseScale);
        if (alpha <= 0) continue;

        const cx = phys[form.id].x;
        const cy = phys[form.id].y;

        ctx.strokeStyle = form.stroke;

        const interiorFlowAmp =
          INTERIOR_FLOW_AMP * visualScale * (1 + trembleAmp);
        const flowK1 = k1 * trembleFreqMult;
        const flowW1eff = w1 * trembleFreqMult;
        const t1offEff = flowW1eff * t;
        const t1offYEff = flowW1eff * t * 1.3;

        const frayMag =
          frayAmp > 0
            ? (frayAmp * FRAY_VISIBLE_MAG) / Math.max(visualScale, 0.01)
            : 0;

        for (let bucket = 0; bucket < NUM_BUCKETS; bucket++) {
          const bucketDepthMid = (bucket + 0.5) / NUM_BUCKETS;
          ctx.globalAlpha =
            alpha * (0.55 + 0.45 * (1 - bucketDepthMid));

          ctx.beginPath();

          for (let li = 0; li < form.lines.length; li++) {
            const line = form.lines[li];
            const lineBucket = Math.min(
              NUM_BUCKETS - 1,
              Math.floor(line.depth * NUM_BUCKETS),
            );
            if (lineBucket !== bucket) continue;
            if (line.n < 2) continue;

            const pts = line.pts;
            const n = line.n;
            const isInterior = line.dw > 0;
            const flowAmpThisLine = isInterior
              ? interiorFlowAmp * line.dw
              : 0;
            const frayMagThisLine =
              frayMag * (isInterior ? 0.6 + 0.4 * line.dw : 1);

            for (let kk = 0; kk < n; kk++) {
              // 1) Per-point shrink around the FORM's natural
              // centroid, then offset by the difference between
              // the dynamic and static centroid.
              const naturalCx = form.centroid[0];
              const naturalCy = form.centroid[1];
              const dxFromNatural =
                (pts[kk * 2] - naturalCx) * visualScale;
              const dyFromNatural =
                (pts[kk * 2 + 1] - naturalCy) * visualScale;
              let x = cx + dxFromNatural;
              let y = cy + dyFromNatural;

              // 2) Interior flow + tremble.
              if (flowAmpThisLine > 0) {
                const ax1 = flowK1 * x + t1offEff;
                const ay1 = flowK1 * y + t1offYEff;
                const ddx = Math.sin(ax1) * Math.cos(ay1);
                const ddy = -Math.cos(ax1) * Math.sin(ay1);
                x += flowAmpThisLine * ddx;
                y += flowAmpThisLine * ddy;
              }

              // 3) Radial-outward fraying (around the dynamic
              // centroid so fibres point AWAY from where the form
              // actually sits this frame).
              if (frayMagThisLine > 0) {
                const dx = x - cx;
                const dy = y - cy;
                const len = Math.hypot(dx, dy);
                if (len > 0.01) {
                  const ux = dx / len;
                  const uy = dy / len;
                  const nz =
                    0.7 +
                    0.3 *
                      Math.sin(FRAY_NOISE_K * x + tFray) *
                      Math.cos(FRAY_NOISE_K * y + tFray * 0.83);
                  const m = frayMagThisLine * nz;
                  x += ux * m;
                  y += uy * m;
                }
              }

              if (kk === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
          }

          ctx.stroke();
        }
      }

      // Trigger a React re-render so the SVG label layer reads the
      // latest physics positions. forceUpdate uses a counter; React
      // 18 batches the rerender until commit.
      forceUpdate();

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── React-controlled labels + connector lines ───────────────────
  // Read physicsRef directly each render. forceUpdate above ensures
  // we re-render every animation frame.
  const labelLayer = (() => {
    const items: React.ReactNode[] = [];
    const phys = physicsRef.current;
    if (!phys) return items;
    for (const form of FORMS) {
      const geomSource = vizState.geometricSources[form.id];
      const anchorSource = vizState.anchorState.sources[form.id];
      const baseScale =
        geomSource.deaths > 0
          ? Math.sqrt(geomSource.deaths / form.maxDeaths)
          : 0;
      if (baseScale <= ACTIVE_THRESHOLD) continue;
      const visualScale = baseScale * FORM_SCALE_MULT;
      const opacity =
        baseScale >= LABEL_OPACITY_THRESHOLD
          ? 1
          : baseScale / LABEL_OPACITY_THRESHOLD;

      const dir = EDGE_DIRECTION[form.label.formEdgeDirection];
      const cx = phys[form.id].x;
      const cy = phys[form.id].y;
      const formRadiusEff = form.formRadius * visualScale;
      const formEdgeX = cx + formRadiusEff * dir[0];
      const formEdgeY = cy + formRadiusEff * dir[1];
      const labelX = formEdgeX + LABEL_GAP * dir[0];
      const labelY = formEdgeY + LABEL_GAP * dir[1];

      const deathsValue = anchorSource.deaths;
      const deathsLabel =
        deathsValue >= 1
          ? `${Math.round(deathsValue).toLocaleString()} Deaths`
          : deathsValue > 0
            ? '<1 Death'
            : '0 Deaths';

      items.push(
        <g key={form.id} opacity={opacity}>
          <line
            x1={labelX}
            y1={labelY}
            x2={formEdgeX}
            y2={formEdgeY}
            stroke="#0d1a1e"
            strokeOpacity={0.55}
            strokeWidth={0.5}
            strokeDasharray="2 2"
          />
          <text
            x={labelX}
            y={labelY - 4}
            textAnchor={form.label.textAnchor}
            fontFamily="'Playfair', Georgia, serif"
            fontSize={9}
            fill="#0d1a1e"
            opacity={0.7}
            style={{
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {form.label.name}
          </text>
          <text
            x={labelX}
            y={labelY + 12}
            textAnchor={form.label.textAnchor}
            fontFamily="'Playfair', Georgia, serif"
            fontSize={13}
            fontWeight={600}
            fill={form.id === 'nuclear' ? STROKE_NUCLEAR : '#0d1a1e'}
          >
            {deathsLabel}
          </text>
        </g>,
      );
    }
    return items;
  })();

  return (
    <div className="w-full relative">
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
        ref={containerRef}
        className="relative w-full mx-auto"
        style={{
          aspectRatio: `${SVG_VIEW_W} / ${SVG_VIEW_H}`,
          maxWidth: '900px',
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
        />
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`${SVG_VIEW_X} ${SVG_VIEW_Y} ${SVG_VIEW_W} ${SVG_VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {labelLayer}
        </svg>
      </div>
    </div>
  );
}
