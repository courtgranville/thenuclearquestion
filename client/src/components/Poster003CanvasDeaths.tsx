import { useEffect, useRef, useState } from 'react';
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
 * interior split with per-point flow displacement on interiors only.
 *
 * Form scaling is sqrt-area-proportional:
 *   currentScale = √(currentDeaths / MAX_DEATHS_FOR_SOURCE)
 *
 * Mycelium decay (graded curve, per-stage):
 *
 *   1.0 → 0.7  Normal flow drift on interiors.
 *   0.7 → 0.3  trembleAmp ramps 0 → 1.5×; flow frequency × 1.5.
 *   0.3 → 0.05 Outline lines develop radial-outward fraying;
 *              tremble at peak; visible fibrous texture.
 *   0.05 → 0   Rapid alpha fade alongside continued fraying.
 *
 * Reference: fungal/mycelial growth in a petri dish — fine radial
 * fibres, organic decay, no jitter.
 *
 * Labels and connector lines are React-controlled SVG elements
 * overlaid on the canvas. Labels read from the JSON for static
 * positioning; deaths-value text reads from anchorState (per-source
 * mortality stays snap-only). Label opacity fades with the form's
 * scale so it disappears with the form.
 */

// viewBox of the S1 deaths SVG — used as the canonical viewBox for
// both the canvas and the SVG label overlay so coordinates align.
const SVG_VIEW_X = 387.10;
const SVG_VIEW_Y = 410.07;
const SVG_VIEW_W = 867.91;
const SVG_VIEW_H = 515.22;

// Stone for non-nuclear, ochre for nuclear. The ochre is the
// canonical CLAUDE.md value (#b5822e), not the slightly different
// #b4822e used elsewhere in the codebase or in the source SVG.
const STROKE_NUCLEAR = '#b5822e';
const STROKE_OTHER = '#7d746a';

// Mycelium decay stage thresholds (in scale-space).
const TH_NORMAL = 0.7;   // above: no extras
const TH_TREMBLE = 0.3;  // 0.7 → 0.3: tremble ramps in
const TH_FRAY = 0.05;    // 0.3 → 0.05: fraying ramps in
// Below TH_FRAY: alpha fades 1 → 0.

// Tremble — bigger noise added to the existing flow on interiors.
const TREMBLE_AMP_PEAK = 1.5;       // multiple of INTERIOR_FLOW_AMP
const TREMBLE_FREQ_PEAK_MULT = 1.5; // multiple of base flow frequency

// Fraying — radial-outward displacement applied to ALL lines
// (outline AND interior) so the silhouette breaks into fibres.
// Visible (post-scale) magnitude in SVG units; pre-divided by
// currentScale below to keep visible magnitude growing as the form
// shrinks.
const FRAY_VISIBLE_MAG = 6;
// Per-point noise modulation on top of the radial direction so
// fibres aren't all the same length.
const FRAY_NOISE_K = 0.6;
const FRAY_NOISE_W = 0.45;

// Constant interior flow amplitude (SVG space).
const INTERIOR_FLOW_AMP = 4;

// Threshold below which labels and connectors fade out.
const LABEL_OPACITY_THRESHOLD = 0.15;

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
    return {
      pts: L.pts,
      n: L.n,
      depth,
      dw: depthWeight(depth),
    };
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

// ─── Decay-stage helpers ─────────────────────────────────────────

interface DecayState {
  trembleAmp: number;     // multiple of INTERIOR_FLOW_AMP, 0 at high scale
  trembleFreqMult: number; // multiplies the flow frequency
  frayAmp: number;        // 0 at TH_FRAY, 1 at scale=0 (visible mag)
  alpha: number;          // global alpha multiplier, 1 above TH_FRAY
}

function decayStateFor(currentScale: number): DecayState {
  if (currentScale >= TH_NORMAL) {
    return { trembleAmp: 0, trembleFreqMult: 1, frayAmp: 0, alpha: 1 };
  }
  if (currentScale >= TH_TREMBLE) {
    const t = (TH_NORMAL - currentScale) / (TH_NORMAL - TH_TREMBLE); // 0..1
    return {
      trembleAmp: TREMBLE_AMP_PEAK * t,
      trembleFreqMult: 1 + (TREMBLE_FREQ_PEAK_MULT - 1) * t,
      frayAmp: 0,
      alpha: 1,
    };
  }
  if (currentScale >= TH_FRAY) {
    const t = (TH_TREMBLE - currentScale) / (TH_TREMBLE - TH_FRAY); // 0..1
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

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
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

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      const viz = vizStateRef.current;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 0.5;

      const t1off = w1 * t;
      const t1offY = w1 * t * 1.3;
      const tFray = FRAY_NOISE_W * t;

      for (const form of FORMS) {
        const sourceState = viz.geometricSources[form.id];
        const currentDeaths = sourceState.deaths;
        if (currentDeaths <= 0) continue;
        const currentScale = Math.sqrt(currentDeaths / form.maxDeaths);
        if (currentScale <= 0) continue;

        const { trembleAmp, trembleFreqMult, frayAmp, alpha } =
          decayStateFor(currentScale);
        if (alpha <= 0) continue;

        const cx = form.centroid[0];
        const cy = form.centroid[1];

        ctx.strokeStyle = form.stroke;

        // Per-form interior flow — proportional to scale + tremble.
        const interiorFlowAmp =
          INTERIOR_FLOW_AMP * currentScale * (1 + trembleAmp);
        const flowK1 = k1 * trembleFreqMult;
        const flowW1eff = w1 * trembleFreqMult;
        const t1offEff = flowW1eff * t;
        const t1offYEff = flowW1eff * t * 1.3;

        // Fraying amplitude in SVG coords. Pre-divide by currentScale
        // so visible magnitude grows as the form shrinks (the form
        // looks more fibrous, not less).
        const frayMag =
          frayAmp > 0
            ? (frayAmp * FRAY_VISIBLE_MAG) / Math.max(currentScale, 0.01)
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
            // Fraying applies to ALL lines in the fray range
            // (outlines develop fibres too). It's modulated by
            // line depth so deeper interiors fray more.
            const frayMagThisLine =
              frayMag *
              (isInterior ? 0.6 + 0.4 * line.dw : 1);

            for (let kk = 0; kk < n; kk++) {
              // 1) Per-point shrink around the form's centroid.
              let x = cx + (pts[kk * 2] - cx) * currentScale;
              let y = cy + (pts[kk * 2 + 1] - cy) * currentScale;

              // 2) Interior flow + tremble (interiors only).
              if (flowAmpThisLine > 0) {
                const ax1 = flowK1 * x + t1offEff;
                const ay1 = flowK1 * y + t1offYEff;
                const dx = Math.sin(ax1) * Math.cos(ay1);
                const dy = -Math.cos(ax1) * Math.sin(ay1);
                x += flowAmpThisLine * dx;
                y += flowAmpThisLine * dy;
              }

              // 3) Radial-outward fraying.
              if (frayMagThisLine > 0) {
                const dxFromCx = x - cx;
                const dyFromCy = y - cy;
                const len = Math.hypot(dxFromCx, dyFromCy);
                if (len > 0.01) {
                  const ux = dxFromCx / len;
                  const uy = dyFromCy / len;
                  // Per-point noise modulation so fibres aren't
                  // uniform — value in [0.4, 1.0].
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

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  // ─── React-controlled labels + connector lines ───────────────────
  // Recomputed each render from vizState. Per-source mortality text
  // reads from anchorState (snap-only); position is static; opacity
  // fades with the form's current scale.
  const labelLayer = (() => {
    const items: React.ReactNode[] = [];
    for (const form of FORMS) {
      const geomSource = vizState.geometricSources[form.id];
      const anchorSource = vizState.anchorState.sources[form.id];
      const currentDeaths = geomSource.deaths;
      if (currentDeaths <= 0) continue;
      const currentScale = Math.sqrt(currentDeaths / form.maxDeaths);
      if (currentScale <= 0) continue;
      const opacity =
        currentScale >= LABEL_OPACITY_THRESHOLD
          ? 1
          : currentScale / LABEL_OPACITY_THRESHOLD;
      const dir = EDGE_DIRECTION[form.label.formEdgeDirection];
      // Form edge in SVG coords (same coords the canvas draws in).
      const formEdgeX =
        form.centroid[0] + form.formRadius * currentScale * dir[0];
      const formEdgeY =
        form.centroid[1] + form.formRadius * currentScale * dir[1];
      const labelX = form.label.position[0];
      const labelY = form.label.position[1];

      // Format the deaths value. The anchor's per-source deaths
      // (snap-only) is rendered as "<n> Deaths" or "<1 Death" for
      // sub-1 values. This intentionally reads from anchorSource,
      // not geomSource — per-source mortality stays snap-only.
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
