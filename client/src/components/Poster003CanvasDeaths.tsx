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
 * Poster 003 — deaths-by-source canvas layer.
 *
 * Mirrors Poster001CanvasViz architecture: module-level form
 * pre-parse, alpha-bucketed stroke batching, RAF loop, outline-vs-
 * interior split with per-point flow displacement on interiors only.
 *
 * Differences from 001:
 *   - Each form scales per-frame by `currentScale =
 *     √(currentDeaths / MAX_DEATHS_FOR_SOURCE)`, applied per-point
 *     around the form's centroid. Sqrt (not linear) so that visible
 *     area scales linearly with deaths — same area-proportional
 *     convention as the printed dendrogram artwork.
 *   - Below `DECAY_THRESHOLD` the interior lines pick up a second
 *     noise field whose amplitude grows and frequency tightens as
 *     the form vanishes — the form creeps in on itself.
 *   - At currentScale === 0 the form is skipped entirely.
 *   - No interaction; vizState is the only input.
 */

const SVG_URL = '/assets/003-S1-deaths_7acb96e4.svg';

// viewBox = "387.10 410.07 867.91 515.22"
const SVG_VIEW_X = 387.10;
const SVG_VIEW_Y = 410.07;
const SVG_VIEW_W = 867.91;
const SVG_VIEW_H = 515.22;

const STROKE_NUCLEAR = '#b4822e';
const STROKE_OTHER = '#7d746a';

// Below this scale the form starts to decay-distort.
const DECAY_THRESHOLD = 0.15;
// Visible (not SVG-space) amplitude of the decay noise at currentScale=0.
// Pre-divided by currentScale below to compensate for per-point shrinkage.
const DECAY_AMP_VISIBLE = 6;
// Decay noise spatial frequency at the threshold.
const DECAY_K_BASE = 0.04;
// Frequency multiplier as the form approaches zero.
const DECAY_K_RAMP = 3;
const DECAY_W = 0.55;

// Constant interior flow amplitude (SVG space). The form's overall
// motion register is "serious" — small enough that static forms
// don't read as frozen, small enough not to read as playful.
const INTERIOR_FLOW_AMP = 4;

interface PreparedLine {
  pts: Float32Array;
  n: number;
  depth: number;
  dw: number;
}

interface PreparedForm {
  id: SourceId;
  lines: PreparedLine[];
  bbox: BBox;
  centroid: [number, number];
  maxDeaths: number;
  stroke: string;
}

const FORMS: PreparedForm[] = SOURCE_IDS.map((id) => {
  const data = (formsData as Record<
    SourceId,
    {
      paths: string[];
      bbox: { minX: number; minY: number; maxX: number; maxY: number };
      centroid: [number, number];
      deaths: number;
    }
  >)[id];
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
  return {
    id,
    lines,
    bbox,
    centroid: data.centroid,
    maxDeaths: MAX_DEATHS_FOR_SOURCE[id],
    stroke: id === 'nuclear' ? STROKE_NUCLEAR : STROKE_OTHER,
  };
});

// Strip the per-source form groups from the deaths SVG so the
// remaining content (text labels, value annotations) renders as a
// non-interactive overlay above the canvas.
function stripFormGroups(svgText: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgText;
  // Top-level <g> children whose subtree contains many fill="none"
  // strokes are the organic-blob form-groups (or wrappers around
  // them). 40 is well above any text-label glyph count.
  const topGroups = Array.from(svg.children).filter(
    (el) => el.tagName.toLowerCase() === 'g',
  );
  for (const g of topGroups) {
    const formish = g.querySelectorAll('[fill="none"]').length;
    if (formish >= 40) g.remove();
  }
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute(
    'style',
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;',
  );
  return new XMLSerializer().serializeToString(svg);
}

export interface Poster003CanvasDeathsProps {
  vizState: VizState;
}

export default function Poster003CanvasDeaths({
  vizState,
}: Poster003CanvasDeathsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [overlaySvg, setOverlaySvg] = useState<string | null>(null);
  const [overlayError, setOverlayError] = useState(false);

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

  // ─── Fetch + strip the overlay SVG ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', SVG_URL, true);
    xhr.responseType = 'text';
    xhr.onload = () => {
      if (cancelled) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          setOverlaySvg(stripFormGroups(xhr.responseText));
        } catch {
          setOverlayError(true);
        }
      } else {
        setOverlayError(true);
      }
    };
    xhr.onerror = () => {
      if (!cancelled) setOverlayError(true);
    };
    xhr.send();
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
      // Map SVG (x, y) → canvas device px:
      //   px = ((x - SVG_VIEW_X) * scale + offsetX) * DPR
      // Equivalent to:
      //   setTransform(scale*DPR, 0, 0, scale*DPR,
      //                (offsetX - SVG_VIEW_X*scale)*DPR,
      //                (offsetY - SVG_VIEW_Y*scale)*DPR)
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
      const tDecay = DECAY_W * t;

      for (const form of FORMS) {
        const sourceState = viz.geometricSources[form.id];
        const currentDeaths = sourceState.deaths;
        if (currentDeaths <= 0) continue;
        // sqrt so visible area ∝ deaths (area-proportional convention,
        // matches the printed dendrogram and the standard data-viz
        // convention for proportional 2D shapes).
        const currentScale = Math.sqrt(currentDeaths / form.maxDeaths);
        if (currentScale <= 0) continue;

        const cx = form.centroid[0];
        const cy = form.centroid[1];

        // Decay parameters — only active below threshold.
        let decayActive = false;
        let decayAmp = 0;
        let decayK = DECAY_K_BASE;
        if (currentScale < DECAY_THRESHOLD) {
          const progress = 1 - currentScale / DECAY_THRESHOLD; // 0..1
          decayAmp =
            (progress * DECAY_AMP_VISIBLE) /
            Math.max(currentScale, 0.025);
          decayK = DECAY_K_BASE * (1 + progress * DECAY_K_RAMP);
          decayActive = decayAmp > 0;
        }

        ctx.strokeStyle = form.stroke;

        // Per-form interior flow scales with currentScale so the
        // wobble stays proportional to the form's visible size.
        const interiorAmpScaled = INTERIOR_FLOW_AMP * currentScale;

        for (let bucket = 0; bucket < NUM_BUCKETS; bucket++) {
          const bucketDepthMid = (bucket + 0.5) / NUM_BUCKETS;
          ctx.globalAlpha = 0.55 + 0.45 * (1 - bucketDepthMid);

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
            const flowAmp = isInterior ? interiorAmpScaled * line.dw : 0;
            const useDecay = decayActive && isInterior;

            for (let kk = 0; kk < n; kk++) {
              // 1) Per-point shrink around the form's centroid.
              let x = cx + (pts[kk * 2] - cx) * currentScale;
              let y = cy + (pts[kk * 2 + 1] - cy) * currentScale;

              // 2) Constant interior flow (proportional drift).
              if (flowAmp > 0) {
                const ax1 = k1 * x + t1off;
                const ay1 = k1 * y + t1offY;
                const dx = Math.sin(ax1) * Math.cos(ay1);
                const dy = -Math.cos(ax1) * Math.sin(ay1);
                x += flowAmp * dx;
                y += flowAmp * dy;
              }

              // 3) Decay distortion — interior lines only, growing
              //    amplitude / tightening frequency as scale → 0.
              if (useDecay) {
                const ax = decayK * x + tDecay;
                const ay = decayK * y + tDecay * 0.83;
                const dx = Math.sin(ax) * Math.cos(ay);
                const dy = Math.cos(ax) * Math.sin(ay);
                x += decayAmp * dx;
                y += decayAmp * dy;
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
        {overlaySvg && (
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            dangerouslySetInnerHTML={{ __html: overlaySvg }}
          />
        )}
        {overlayError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-base text-muted-foreground">
              Unable to load the visualisation overlay.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
