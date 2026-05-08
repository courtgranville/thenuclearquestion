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
 * Layout: analytical placement + per-frame easing.
 *   1. Sort visible sources by current scale, descending.
 *   2. Anchor the largest at canvas centre, slightly below.
 *   3. Place subsequent forms in a polar arrangement around the
 *      anchor, starting from the bottom and rotating around.
 *   4. Constraint pass (≤10 iterations): clamp inside an 8% margin,
 *      resolve pairwise overlaps along the axis of overlap.
 *   5. Cache the layout — recompute only when any source's scale
 *      changes by > 0.005.
 *   6. Each frame, ease the live position toward target by 0.18.
 *
 * Replaces the per-frame gravity simulation that shipped in
 * commit 13. The simulation was the main source of the drag lag
 * and the cause of forms drifting outside the canvas. Analytical
 * placement is deterministic, fits the viewBox by construction,
 * and an order of magnitude cheaper per frame.
 *
 * Form scaling: sqrt-area-proportional with a 1.3× scale-up
 *   visualScale = √(deaths / max) × FORM_SCALE_MULT
 *
 * Mycelium decay (graded curve, unchanged from commit 13 but
 * recapped here for context):
 *   1.0 → 0.85   normal flow on interiors
 *   0.85 → 0.4   trembleAmp ramps 0 → 2.5×; flow freq × 1.7
 *   0.4 → 0.08   tremble at peak; outline + interior fray
 *   0.08 → 0     alpha fades 1 → 0 alongside continued fraying
 *
 * Labels: React-controlled SVG. For each visible source, the
 * label sits horizontally to the LEFT or RIGHT of the form
 * (whichever side has more canvas room), vertically aligned with
 * the form's centroid Y. Side choice is recomputed every frame
 * so labels don't end up squashed against canvas edges. The
 * deaths value ticks continuously from geometric state — same
 * deliberate ticker relaxation as the dot grid (commit 9) and the
 * dendrogram percentages (commit 14). Per-source counts are
 * honest because they are rounded values of the exact geometry
 * the user is seeing.
 */

// Canvas viewBox (the S1 deaths SVG viewBox).
const SVG_VIEW_X = 387.10;
const SVG_VIEW_Y = 410.07;
const SVG_VIEW_W = 867.91;
const SVG_VIEW_H = 515.22;

// Cluster targets in absolute viewBox coordinates.
const BASELINE_FRAC = 0.55;
const BASELINE_Y = SVG_VIEW_Y + BASELINE_FRAC * SVG_VIEW_H;
const CENTER_X = SVG_VIEW_X + 0.5 * SVG_VIEW_W;

// Visual scale-up applied on top of currentScale = √(deaths/max).
const FORM_SCALE_MULT = 1.3;

// Below this scale a form is considered "gone" and skipped.
const ACTIVE_THRESHOLD = 0.05;

// Stone for non-nuclear, ochre for nuclear (CLAUDE.md canonical).
const STROKE_NUCLEAR = '#b5822e';
const STROKE_OTHER = '#7d746a';

// ─── Mycelium decay curve constants ──────────────────────────────
const TH_NORMAL = 0.85;
const TH_TREMBLE = 0.4;
const TH_FRAY = 0.08;
const TREMBLE_AMP_PEAK = 2.5;
const TREMBLE_FREQ_PEAK_MULT = 1.7;
const FRAY_VISIBLE_MAG = 10;
const FRAY_NOISE_K = 0.6;
const FRAY_NOISE_W = 0.45;
const INTERIOR_FLOW_AMP = 4;

// ─── Layout constants ───────────────────────────────────────────
const LAYOUT_MARGIN_FRAC = 0.08; // 8% inset on every viewBox edge
const LAYOUT_GAP = 8;            // viewBox units between bounding circles
const LAYOUT_ITER = 10;          // constraint-pass iterations
const SCALE_QUANTUM = 0.005;     // recompute layout when any scale moves more than this
const EASE_FACTOR = 0.18;
const SETTLE_TOLERANCE = 0.3;

// ─── Label constants ────────────────────────────────────────────
const LABEL_GAP = 22;            // distance from form edge to label text edge
const LABEL_CLAMP_MARGIN = 8;    // keep labels inside the viewBox by at least this

interface PreparedLine {
  pts: Float32Array;
  n: number;
  depth: number;
  dw: number;
}

interface LabelData {
  name: string;
  // Other JSON fields (position, textAnchor, formEdgeDirection) are
  // ignored after the analytical-layout rebuild. The label component
  // computes side/anchor from the form's current position each frame.
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

type FormJson = {
  paths: string[];
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  centroid: number[];
  deaths: number;
  label: { name: string; [key: string]: unknown };
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
    centroid: [data.centroid[0], data.centroid[1]] as [number, number],
    formRadius: radius,
    maxDeaths: MAX_DEATHS_FOR_SOURCE[id],
    stroke: id === 'nuclear' ? STROKE_NUCLEAR : STROKE_OTHER,
    label: { name: data.label.name },
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

// ─── Analytical layout ───────────────────────────────────────────

function computeLayout(
  visualScales: Record<SourceId, number>,
): Map<SourceId, [number, number]> {
  const positions = new Map<SourceId, [number, number]>();

  const visible = SOURCE_IDS.filter(
    (id) => visualScales[id] > ACTIVE_THRESHOLD,
  ).sort((a, b) => visualScales[b] - visualScales[a]);

  if (visible.length === 0) return positions;

  const formR = (id: SourceId) =>
    FORM_BY_ID[id].formRadius * visualScales[id] * FORM_SCALE_MULT;

  // 1. Anchor the largest form at canvas centre, slightly below.
  const anchor = visible[0];
  const anchorR = formR(anchor);
  positions.set(anchor, [CENTER_X, BASELINE_Y]);

  // 2. Polar placement for the rest. Start from straight down
  // (angle = π/2 in screen coords because y grows downward) and
  // rotate around. Each form sits tangent to the anchor (anchorR +
  // formR + LAYOUT_GAP from the centre).
  for (let i = 1; i < visible.length; i++) {
    const id = visible[i];
    const r = formR(id);
    const N = visible.length - 1;
    const angleStep = N > 0 ? (Math.PI * 2) / N : 0;
    const angle = Math.PI / 2 + (i - 1) * angleStep;
    const placementR = anchorR + r + LAYOUT_GAP;
    const px = CENTER_X + Math.cos(angle) * placementR;
    const py = BASELINE_Y + Math.sin(angle) * placementR;
    positions.set(id, [px, py]);
  }

  // 3. Constraint pass: keep every form inside the 8% margin and
  // resolve pairwise overlaps. Both passes are idempotent at
  // convergence; LAYOUT_ITER is generous so we settle reliably.
  const minX = SVG_VIEW_X + LAYOUT_MARGIN_FRAC * SVG_VIEW_W;
  const maxX = SVG_VIEW_X + (1 - LAYOUT_MARGIN_FRAC) * SVG_VIEW_W;
  const minY = SVG_VIEW_Y + LAYOUT_MARGIN_FRAC * SVG_VIEW_H;
  const maxY = SVG_VIEW_Y + (1 - LAYOUT_MARGIN_FRAC) * SVG_VIEW_H;

  for (let iter = 0; iter < LAYOUT_ITER; iter++) {
    let moved = false;

    // Clamp inside margin.
    for (const id of visible) {
      const r = formR(id);
      const [cx, cy] = positions.get(id)!;
      let nx = cx, ny = cy;
      if (nx - r < minX) nx = minX + r;
      if (nx + r > maxX) nx = maxX - r;
      if (ny - r < minY) ny = minY + r;
      if (ny + r > maxY) ny = maxY - r;
      if (nx !== cx || ny !== cy) moved = true;
      positions.set(id, [nx, ny]);
    }

    // Resolve pairwise overlap along axis of overlap.
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const idA = visible[i];
        const idB = visible[j];
        const rA = formR(idA);
        const rB = formR(idB);
        const [ax, ay] = positions.get(idA)!;
        const [bx, by] = positions.get(idB)!;
        const dx = bx - ax;
        const dy = by - ay;
        const dist = Math.hypot(dx, dy);
        const minDist = rA + rB + LAYOUT_GAP;
        if (dist < minDist && dist > 0.01) {
          const half = (minDist - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          positions.set(idA, [ax - ux * half, ay - uy * half]);
          positions.set(idB, [bx + ux * half, by + uy * half]);
          moved = true;
        }
      }
    }

    if (!moved) break;
  }

  return positions;
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

  // Live (eased) form positions, keyed by source id. Persisted
  // across frames; ease toward layoutTargetRef each frame.
  const positionsRef = useRef<Map<SourceId, [number, number]>>(new Map());
  const lastSeenRef = useRef<Set<SourceId>>(new Set());

  // Layout cache: only recompute when any source's scale moves more
  // than SCALE_QUANTUM since the last computation.
  const layoutTargetRef = useRef<Map<SourceId, [number, number]>>(new Map());
  const lastScalesRef = useRef<Record<SourceId, number>>(
    {} as Record<SourceId, number>,
  );

  // forceUpdate triggers a React re-render so the SVG label layer
  // can pick up the latest positions / deaths text.
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
      ctx.imageSmoothingEnabled = true;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const t0 = performance.now();
    let rafId = 0;

    const k1 = TUNING.flowK1;
    const w1 = TUNING.flowW1;

    const NUM_BUCKETS = 8;

    const frame = (now: number) => {
      const t = (now - t0) / 1000;

      const viz = vizStateRef.current;

      // ─── Compute visualScales ─────────────────────────────────
      const visualScales: Record<SourceId, number> = {} as Record<
        SourceId,
        number
      >;
      let scalesChanged = false;
      for (const id of SOURCE_IDS) {
        const f = FORM_BY_ID[id];
        const ratio = viz.geometricSources[id].deaths / f.maxDeaths;
        const baseScale = ratio > 0 ? Math.sqrt(ratio) : 0;
        const visualScale = baseScale * FORM_SCALE_MULT;
        visualScales[id] = visualScale;
        if (
          Math.abs(visualScale - (lastScalesRef.current[id] ?? -1)) >
          SCALE_QUANTUM
        ) {
          scalesChanged = true;
        }
      }

      // ─── Recompute layout if scales moved enough ──────────────
      if (scalesChanged || layoutTargetRef.current.size === 0) {
        layoutTargetRef.current = computeLayout(visualScales);
        for (const id of SOURCE_IDS) {
          lastScalesRef.current[id] = visualScales[id];
        }
      }

      // ─── Determine present sources, ease toward target ────────
      const presentSet = new Set<SourceId>();
      let easingActive = false;
      for (const id of SOURCE_IDS) {
        const baseScaleRatio = visualScales[id] / FORM_SCALE_MULT;
        if (baseScaleRatio <= ACTIVE_THRESHOLD) continue;
        presentSet.add(id);
        const target =
          layoutTargetRef.current.get(id) ?? [CENTER_X, BASELINE_Y];
        const wasSeen = lastSeenRef.current.has(id);
        if (!wasSeen) {
          // Reappearing or first-time: pop into target position.
          positionsRef.current.set(id, [target[0], target[1]]);
        } else {
          const cur = positionsRef.current.get(id) ?? target;
          const dx = target[0] - cur[0];
          const dy = target[1] - cur[1];
          if (
            Math.abs(dx) > SETTLE_TOLERANCE ||
            Math.abs(dy) > SETTLE_TOLERANCE
          ) {
            easingActive = true;
            positionsRef.current.set(id, [
              cur[0] + dx * EASE_FACTOR,
              cur[1] + dy * EASE_FACTOR,
            ]);
          } else {
            positionsRef.current.set(id, [target[0], target[1]]);
          }
        }
      }
      // Drop forgotten sources.
      for (const id of SOURCE_IDS) {
        if (!presentSet.has(id)) positionsRef.current.delete(id);
      }
      lastSeenRef.current = presentSet;

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
        const visualScale = visualScales[form.id];
        const baseScale = visualScale / FORM_SCALE_MULT;
        if (baseScale <= ACTIVE_THRESHOLD) continue;

        const { trembleAmp, trembleFreqMult, frayAmp, alpha } =
          decayStateFor(baseScale);
        if (alpha <= 0) continue;

        const pos = positionsRef.current.get(form.id);
        if (!pos) continue;
        const cx = pos[0];
        const cy = pos[1];

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

        const naturalCx = form.centroid[0];
        const naturalCy = form.centroid[1];

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
              let x = cx + (pts[kk * 2] - naturalCx) * visualScale;
              let y = cy + (pts[kk * 2 + 1] - naturalCy) * visualScale;

              if (flowAmpThisLine > 0) {
                const ax1 = flowK1 * x + t1offEff;
                const ay1 = flowK1 * y + t1offYEff;
                const ddx = Math.sin(ax1) * Math.cos(ay1);
                const ddy = -Math.cos(ax1) * Math.sin(ay1);
                x += flowAmpThisLine * ddx;
                y += flowAmpThisLine * ddy;
              }

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

      // forceUpdate only when easing is still in progress. During
      // active drag the parent's vizState change already triggers
      // a re-render — adding forceUpdate would just double-render.
      // After drag stops, the canvas RAF keeps running (for flow
      // drift / fraying) but the React tree doesn't need to update
      // unless positions are still settling.
      if (easingActive) forceUpdate();

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
  // Read positionsRef directly each render; vizState provides the
  // ticking deaths value via the geometric field.
  const labelLayer = (() => {
    const items: React.ReactNode[] = [];
    const positions = positionsRef.current;
    const labelMinX = SVG_VIEW_X + LABEL_CLAMP_MARGIN;
    const labelMaxX = SVG_VIEW_X + SVG_VIEW_W - LABEL_CLAMP_MARGIN;

    for (const form of FORMS) {
      const geomSource = vizState.geometricSources[form.id];
      const baseScale =
        geomSource.deaths > 0
          ? Math.sqrt(geomSource.deaths / form.maxDeaths)
          : 0;
      if (baseScale <= ACTIVE_THRESHOLD) continue;
      const visualScale = baseScale * FORM_SCALE_MULT;

      const pos = positions.get(form.id);
      if (!pos) continue;
      const [cx, cy] = pos;
      const formRadiusEff = form.formRadius * visualScale;

      // Side selection: label sits on whichever side has more
      // canvas room. Recomputed each frame so the choice updates
      // as forms drift across the canvas centreline.
      const useLeft = cx > CENTER_X;
      const sign = useLeft ? -1 : 1;
      const formEdgeX = cx + sign * formRadiusEff;
      let labelX = formEdgeX + sign * LABEL_GAP;
      labelX = Math.max(labelMinX, Math.min(labelMaxX, labelX));
      const labelY = cy;
      const textAnchor = useLeft ? 'end' : 'start';

      // Editorial relaxation (commit 15): per-source death counts
      // tick continuously. Same justification as the dot grid
      // ticker (commit 9) and the dendrogram percentages
      // (commit 14) — counts are derived from the same
      // interpolated values that drive the geometry.
      const geomDeaths = geomSource.deaths;
      const deathsLabel =
        geomDeaths >= 1
          ? `${Math.round(geomDeaths).toLocaleString()} Deaths`
          : geomDeaths >= 0.5
            ? '1 Death'
            : geomDeaths > 0
              ? '<1 Death'
              : '0 Deaths';

      const labelColour =
        form.id === 'nuclear' ? STROKE_NUCLEAR : '#0d1a1e';

      items.push(
        <g key={form.id}>
          <line
            x1={labelX}
            y1={labelY}
            x2={formEdgeX}
            y2={labelY}
            stroke="#0d1a1e"
            strokeOpacity={0.55}
            strokeWidth={0.5}
            strokeDasharray="2 2"
          />
          <text
            x={labelX}
            y={labelY - 4}
            textAnchor={textAnchor}
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
            textAnchor={textAnchor}
            fontFamily="'Playfair', Georgia, serif"
            fontSize={13}
            fontWeight={600}
            fill={labelColour}
            className="tabular-nums"
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
