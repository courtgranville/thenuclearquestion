import { useEffect, useReducer, useRef, useState } from 'react';
import { buildPolylines, type BBox } from '@/lib/parseSvg';
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
 * REGISTER CHANGE (commit 17): per-frame form motion removed.
 *
 * Posters 001 and 002 carry their visual identity in continuous flow
 * displacement of the form interiors. Poster 003 is paired with a
 * continuously-driven slider, ticking labels above and below, and a
 * dendrogram with per-frame state — the cumulative budget could not
 * carry the 8-form × 270-polyline × per-point sin/cos loop. Forms
 * here render as static stroked outlines, scaled and positioned per
 * frame from a pre-built Path2D. Their identity now lives in the
 * hand-drawn outlines and in the layout choreography (sort, polar
 * placement, gravity-toward-baseline, ease-into-position) — not in
 * motion of the lines themselves.
 *
 * Decay simplifies likewise: shrink + linear alpha fade below
 * baseScale 0.3. The radial fraying / fungal-creeping treatment is
 * dropped — the shrink-and-fade carries enough of "the source
 * vanishes" without the per-point cost.
 *
 * Labels: collision-aware placement. For each visible source, a
 * candidate label is computed on the LEFT and the RIGHT of its form;
 * each candidate is scored by overlaps with other forms / other
 * already-placed labels / canvas-edge violations; greedy assignment
 * in scale-descending order; then up to 3 iterations of vertical
 * push to resolve any remaining form-overlap. Recomputed each render
 * (~1k ops, trivial).
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

// Below this scale a form is considered gone and skipped entirely.
const ACTIVE_THRESHOLD = 0.05;

// Stone for non-nuclear, ochre for nuclear (CLAUDE.md canonical).
const STROKE_NUCLEAR = '#b5822e';
const STROKE_OTHER = '#7d746a';

// Alpha fade — shrink + fade is the new decay treatment.
const ALPHA_FADE_THRESHOLD = 0.3;

// ─── Layout constants (analytical placement) ────────────────────
const LAYOUT_MARGIN_FRAC = 0.08;
const LAYOUT_GAP = 8;
const LAYOUT_ITER = 10;
const SCALE_QUANTUM = 0.005;
const EASE_FACTOR = 0.18;
const SETTLE_TOLERANCE = 0.3;

// ─── Label-layout constants ─────────────────────────────────────
const LABEL_GAP = 22;
const LABEL_EDGE_MARGIN = 8;
// Approximate per-character widths in viewBox units. Playfair at
// the chosen sizes. Slightly generous so collision detection
// over-estimates rather than misses overlaps.
const CHAR_W_NAME = 1.7;     // 9-px small caps with 0.18em tracking
const CHAR_W_DEATHS = 7.0;   // 13-px regular weight
const LABEL_NAME_FS = 9;
const LABEL_DEATHS_FS = 13;
const LABEL_VERTICAL_PUSH = 8;
const LABEL_OVERLAP_ITER = 3;

// Scoring weights.
const SCORE_FORM_OVERLAP = 100;
const SCORE_LABEL_OVERLAP = 50;
const SCORE_EDGE_VIOLATION = 4;

// ─── Form preparation ───────────────────────────────────────────

interface PreparedForm {
  id: SourceId;
  path: Path2D;
  bbox: BBox;
  centroid: [number, number];
  formRadius: number;
  maxDeaths: number;
  stroke: string;
  labelName: string;
}

type FormJson = {
  paths: string[];
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  centroid: number[];
  deaths: number;
  label: { name: string; [key: string]: unknown };
};

function buildFormPath(
  polylines: { pts: Float32Array; n: number }[],
): Path2D {
  const p = new Path2D();
  for (const L of polylines) {
    if (L.n < 2) continue;
    p.moveTo(L.pts[0], L.pts[1]);
    for (let k = 1; k < L.n; k++) {
      p.lineTo(L.pts[k * 2], L.pts[k * 2 + 1]);
    }
  }
  return p;
}

const FORMS: PreparedForm[] = SOURCE_IDS.map((id) => {
  const data = (formsData as Record<SourceId, FormJson>)[id];
  const { polylines, bbox } = buildPolylines(data.paths);
  const path = buildFormPath(polylines);
  const radius = Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY) / 2;
  return {
    id,
    path,
    bbox,
    centroid: [data.centroid[0], data.centroid[1]] as [number, number],
    formRadius: radius,
    maxDeaths: MAX_DEATHS_FOR_SOURCE[id],
    stroke: id === 'nuclear' ? STROKE_NUCLEAR : STROKE_OTHER,
    labelName: data.label.name,
  };
});

const FORM_BY_ID: Record<SourceId, PreparedForm> = SOURCE_IDS.reduce(
  (acc, id) => {
    acc[id] = FORMS.find((f) => f.id === id)!;
    return acc;
  },
  {} as Record<SourceId, PreparedForm>,
);

// ─── Decay (shrink + linear alpha fade) ─────────────────────────

function alphaFor(baseScale: number): number {
  if (baseScale >= ALPHA_FADE_THRESHOLD) return 1;
  if (baseScale <= 0) return 0;
  return baseScale / ALPHA_FADE_THRESHOLD;
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
    FORM_BY_ID[id].formRadius * visualScales[id];

  const anchor = visible[0];
  const anchorR = formR(anchor);
  positions.set(anchor, [CENTER_X, BASELINE_Y]);

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

  const minX = SVG_VIEW_X + LAYOUT_MARGIN_FRAC * SVG_VIEW_W;
  const maxX = SVG_VIEW_X + (1 - LAYOUT_MARGIN_FRAC) * SVG_VIEW_W;
  const minY = SVG_VIEW_Y + LAYOUT_MARGIN_FRAC * SVG_VIEW_H;
  const maxY = SVG_VIEW_Y + (1 - LAYOUT_MARGIN_FRAC) * SVG_VIEW_H;

  for (let iter = 0; iter < LAYOUT_ITER; iter++) {
    let moved = false;

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

// ─── Collision-aware label layout ───────────────────────────────

interface LabelRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface LabelLayout {
  side: 'left' | 'right';
  textX: number;
  textY: number;
  textAnchor: 'start' | 'end';
  formEdgeX: number;
  formEdgeY: number;
  rect: LabelRect;
}

function makeLabelCandidate(
  side: 'left' | 'right',
  formCx: number,
  formCy: number,
  formR: number,
  labelW: number,
  labelH: number,
): LabelLayout {
  const sign = side === 'left' ? -1 : 1;
  const formEdgeX = formCx + sign * formR;
  const textX = formEdgeX + sign * LABEL_GAP;
  const textY = formCy;
  const halfH = labelH / 2;
  const rect: LabelRect =
    side === 'left'
      ? {
          minX: textX - labelW,
          minY: textY - halfH,
          maxX: textX,
          maxY: textY + halfH,
        }
      : {
          minX: textX,
          minY: textY - halfH,
          maxX: textX + labelW,
          maxY: textY + halfH,
        };
  return {
    side,
    textX,
    textY,
    textAnchor: side === 'left' ? 'end' : 'start',
    formEdgeX,
    formEdgeY: formCy,
    rect,
  };
}

function rectsOverlap(a: LabelRect, b: LabelRect): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

function rectCircleOverlap(
  rect: LabelRect,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const closestX = Math.max(rect.minX, Math.min(cx, rect.maxX));
  const closestY = Math.max(rect.minY, Math.min(cy, rect.maxY));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

function scoreCandidate(
  cand: LabelLayout,
  thisId: SourceId,
  positions: Map<SourceId, [number, number]>,
  visualScales: Record<SourceId, number>,
  placed: Map<SourceId, LabelLayout>,
): number {
  let score = 0;
  // Form overlaps (heavy).
  positions.forEach((pos, id) => {
    if (id === thisId) return;
    const r = FORM_BY_ID[id].formRadius * visualScales[id];
    if (rectCircleOverlap(cand.rect, pos[0], pos[1], r)) {
      score += SCORE_FORM_OVERLAP;
    }
  });
  // Label overlaps (medium).
  placed.forEach((l, id) => {
    if (id === thisId) return;
    if (rectsOverlap(cand.rect, l.rect)) {
      score += SCORE_LABEL_OVERLAP;
    }
  });
  // Edge proximity (light).
  const minViewX = SVG_VIEW_X + LABEL_EDGE_MARGIN;
  const maxViewX = SVG_VIEW_X + SVG_VIEW_W - LABEL_EDGE_MARGIN;
  if (cand.rect.minX < minViewX) {
    score += (minViewX - cand.rect.minX) * SCORE_EDGE_VIOLATION;
  }
  if (cand.rect.maxX > maxViewX) {
    score += (cand.rect.maxX - maxViewX) * SCORE_EDGE_VIOLATION;
  }
  return score;
}

function shiftLayoutVertically(layout: LabelLayout, dy: number): void {
  layout.textY += dy;
  layout.formEdgeY += dy;
  layout.rect.minY += dy;
  layout.rect.maxY += dy;
}

function computeLabelLayouts(
  positions: Map<SourceId, [number, number]>,
  visualScales: Record<SourceId, number>,
  deathsTexts: Record<SourceId, string>,
): Map<SourceId, LabelLayout> {
  const out = new Map<SourceId, LabelLayout>();

  // Visible set sorted by visualScale DESCENDING — biggest forms
  // get first claim on label space.
  const sorted = SOURCE_IDS.filter((id) =>
    positions.has(id),
  ).sort((a, b) => visualScales[b] - visualScales[a]);

  for (const id of sorted) {
    const pos = positions.get(id)!;
    const cx = pos[0];
    const cy = pos[1];
    const formR = FORM_BY_ID[id].formRadius * visualScales[id];

    const nameW = FORM_BY_ID[id].labelName.length * CHAR_W_NAME;
    const deathsW = deathsTexts[id].length * CHAR_W_DEATHS;
    const labelW = Math.max(nameW, deathsW);
    const labelH = LABEL_NAME_FS + LABEL_DEATHS_FS + 4;

    const candL = makeLabelCandidate('left', cx, cy, formR, labelW, labelH);
    const candR = makeLabelCandidate('right', cx, cy, formR, labelW, labelH);

    const scoreL = scoreCandidate(
      candL,
      id,
      positions,
      visualScales,
      out,
    );
    const scoreR = scoreCandidate(
      candR,
      id,
      positions,
      visualScales,
      out,
    );

    out.set(id, scoreL <= scoreR ? candL : candR);
  }

  // Iterative vertical adjustment for remaining form-overlaps.
  // Push each label vertically away from the offending form's
  // centre, but stop at the canvas margin (degrade gracefully if
  // truly impossible to fully resolve).
  const minLabelY = SVG_VIEW_Y + LABEL_EDGE_MARGIN;
  const maxLabelY = SVG_VIEW_Y + SVG_VIEW_H - LABEL_EDGE_MARGIN;
  for (let iter = 0; iter < LABEL_OVERLAP_ITER; iter++) {
    let adjusted = false;
    out.forEach((layout, id) => {
      let pushUpRequired = false;
      let pushDownRequired = false;
      positions.forEach((pos, otherId) => {
        if (otherId === id) return;
        const r = FORM_BY_ID[otherId].formRadius * visualScales[otherId];
        if (rectCircleOverlap(layout.rect, pos[0], pos[1], r)) {
          const labelMidY = (layout.rect.minY + layout.rect.maxY) / 2;
          if (labelMidY < pos[1]) pushUpRequired = true;
          else pushDownRequired = true;
        }
      });
      if (pushUpRequired || pushDownRequired) {
        const dy =
          (pushUpRequired ? -1 : 1) * LABEL_VERTICAL_PUSH;
        const nextMinY = layout.rect.minY + dy;
        const nextMaxY = layout.rect.maxY + dy;
        if (nextMinY >= minLabelY && nextMaxY <= maxLabelY) {
          shiftLayoutVertically(layout, dy);
          adjusted = true;
        }
      }
    });
    if (!adjusted) break;
  }

  return out;
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

  const vizStateRef = useRef<VizState>(vizState);
  vizStateRef.current = vizState;

  const positionsRef = useRef<Map<SourceId, [number, number]>>(new Map());
  const lastSeenRef = useRef<Set<SourceId>>(new Set());

  const layoutTargetRef = useRef<Map<SourceId, [number, number]>>(new Map());
  const lastScalesRef = useRef<Record<SourceId, number>>(
    {} as Record<SourceId, number>,
  );

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
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId = 0;

    const frame = () => {
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

      // ─── Recompute layout when scales move enough ────────────
      if (scalesChanged || layoutTargetRef.current.size === 0) {
        layoutTargetRef.current = computeLayout(visualScales);
        for (const id of SOURCE_IDS) {
          lastScalesRef.current[id] = visualScales[id];
        }
      }

      // ─── Ease positions toward target ────────────────────────
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
      for (const id of SOURCE_IDS) {
        if (!presentSet.has(id)) positionsRef.current.delete(id);
      }
      lastSeenRef.current = presentSet;

      // ─── Draw canvas ─────────────────────────────────────────
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set the base transform (DPR + viewBox-fit). All per-form
      // drawing then nests its own transform on top of this.
      const baseScale = Math.min(cssW / SVG_VIEW_W, cssH / SVG_VIEW_H);
      const offsetX = (cssW - SVG_VIEW_W * baseScale) / 2;
      const offsetY = (cssH - SVG_VIEW_H * baseScale) / 2;
      const baseTx = (offsetX - SVG_VIEW_X * baseScale) * DPR;
      const baseTy = (offsetY - SVG_VIEW_Y * baseScale) * DPR;
      const baseSx = baseScale * DPR;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const form of FORMS) {
        const visualScale = visualScales[form.id];
        const sBase = visualScale / FORM_SCALE_MULT;
        if (sBase <= ACTIVE_THRESHOLD) continue;
        const alpha = alphaFor(sBase);
        if (alpha <= 0) continue;
        const pos = positionsRef.current.get(form.id);
        if (!pos) continue;
        const cx = pos[0];
        const cy = pos[1];

        // Compose the per-form transform on top of the base. Each
        // form: translate to its current centre, scale by visualScale
        // around that centre. Done as a setTransform so we can stroke
        // the prebuilt Path2D in form-local coordinates without
        // touching individual points.
        ctx.setTransform(
          baseSx * visualScale,
          0,
          0,
          baseSx * visualScale,
          baseTx + (cx - form.centroid[0] * visualScale) * baseSx,
          baseTy + (cy - form.centroid[1] * visualScale) * baseSx,
        );

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = form.stroke;
        // Compensate for the per-form scale so the visible stroke
        // weight stays consistent across small/large forms.
        ctx.lineWidth = 0.5 / visualScale;
        ctx.stroke(form.path);
      }
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // forceUpdate only when easing — vizState changes already
      // trigger the render via prop. After drag stops, this lets
      // labels keep up with positions until they settle.
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

  // ─── Build label layouts each render ────────────────────────────
  // Read positionsRef directly. Cost: O(N²) ≈ 1k ops for 8 forms,
  // negligible compared to canvas redraw.
  const visualScalesRender: Record<SourceId, number> = {} as Record<
    SourceId,
    number
  >;
  const deathsTexts: Record<SourceId, string> = {} as Record<
    SourceId,
    string
  >;
  for (const id of SOURCE_IDS) {
    const f = FORM_BY_ID[id];
    const ratio = vizState.geometricSources[id].deaths / f.maxDeaths;
    const baseScale = ratio > 0 ? Math.sqrt(ratio) : 0;
    visualScalesRender[id] = baseScale * FORM_SCALE_MULT;

    // Editorial relaxation (commit 15): per-source death counts
    // tick continuously. Same justification as the dot grid (commit
    // 9) and dendrogram percentages (commit 14) — counts are
    // derived from the same interpolated values that drive the
    // geometry.
    const geomDeaths = vizState.geometricSources[id].deaths;
    deathsTexts[id] =
      geomDeaths >= 1
        ? `${Math.round(geomDeaths).toLocaleString()} Deaths`
        : geomDeaths >= 0.5
          ? '1 Death'
          : geomDeaths > 0
            ? '<1 Death'
            : '0 Deaths';
  }

  const labelLayoutsMap = computeLabelLayouts(
    positionsRef.current,
    visualScalesRender,
    deathsTexts,
  );
  const labelEntries: { id: SourceId; layout: LabelLayout }[] = [];
  labelLayoutsMap.forEach((layout, id) => {
    labelEntries.push({ id, layout });
  });

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
          {labelEntries.map(({ id, layout }) => {
            const labelColour =
              id === 'nuclear' ? STROKE_NUCLEAR : '#0d1a1e';
            const form = FORM_BY_ID[id];
            return (
              <g key={id}>
                <line
                  x1={layout.textX}
                  y1={layout.textY}
                  x2={layout.formEdgeX}
                  y2={layout.formEdgeY}
                  stroke="#0d1a1e"
                  strokeOpacity={0.55}
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                />
                <text
                  x={layout.textX}
                  y={layout.textY - 4}
                  textAnchor={layout.textAnchor}
                  fontFamily="'Playfair', Georgia, serif"
                  fontSize={LABEL_NAME_FS}
                  fill="#0d1a1e"
                  opacity={0.7}
                  style={{
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                  }}
                >
                  {form.labelName}
                </text>
                <text
                  x={layout.textX}
                  y={layout.textY + 12}
                  textAnchor={layout.textAnchor}
                  fontFamily="'Playfair', Georgia, serif"
                  fontSize={LABEL_DEATHS_FS}
                  fontWeight={600}
                  fill={labelColour}
                  className="tabular-nums"
                >
                  {deathsTexts[id]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
