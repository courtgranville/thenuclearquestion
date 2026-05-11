import { memo, useEffect, useRef, useState } from 'react';
import { DOT_ORDERING } from '@/lib/poster003Data';
import { poster003Store } from '@/lib/poster003Store';

/**
 * Poster 003 - death-toll dots layer (699 dots on a single canvas).
 *
 * Architecture (commit 19): the layer subscribes to poster003Store
 * directly. The component renders ONCE on mount (a single <canvas>)
 * and never re-renders during slider drag. Subscription callback
 * schedules a canvas redraw via requestAnimationFrame; the redraw
 * reads the current vizState + dragging from the store and draws
 * 699 filled circles, batched into two fill calls (one for red,
 * one for green) for speed.
 *
 * Editorial constraints (preserved from the React era):
 * - No source attribution per dot - DOT_ORDERING is a stable
 *     seeded permutation; no tooltips, no hover, no click.
 * - The dot grid's count formula switches at snap so the editorial
 *     livesSaved value (anchorState.livesSaved) holds at settle  -
 *     same behaviour as before commit 19.
 */

const SVG_URL = '/assets/003-S1-dots_009b59b1.svg';
const NUM_DOTS = 699;
const DOT_RADIUS = 2.16;
const COLOR_RED = '#a51e23';
const COLOR_GREEN = '#217b3d';
const DOT_OPACITY = 0.85;
const VIEWBOX_PADDING = 6;

interface DotPosition {
  cx: number;
  cy: number;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Module-level cache so a re-mount doesn't re-fetch and re-parse.
let cachedPositions: DotPosition[] | null = null;
let cachedViewBox: ViewBox | null = null;
let cachedAspect = 1;

interface ParsedDots {
  positions: DotPosition[];
  viewBox: ViewBox;
  aspect: number;
}

function parseDotsSvg(svgText: string): ParsedDots | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  const circleEls = Array.from(svg.querySelectorAll('circle'));
  if (circleEls.length === 0) return null;
  const positions: DotPosition[] = circleEls.map((c) => ({
    cx: parseFloat(c.getAttribute('cx') || '0'),
    cy: parseFloat(c.getAttribute('cy') || '0'),
  }));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of positions) {
    if (p.cx < minX) minX = p.cx;
    if (p.cx > maxX) maxX = p.cx;
    if (p.cy < minY) minY = p.cy;
    if (p.cy > maxY) maxY = p.cy;
  }
  const viewBox: ViewBox = {
    x: minX - DOT_RADIUS - VIEWBOX_PADDING,
    y: minY - DOT_RADIUS - VIEWBOX_PADDING,
    w: maxX - minX + 2 * (DOT_RADIUS + VIEWBOX_PADDING),
    h: maxY - minY + 2 * (DOT_RADIUS + VIEWBOX_PADDING),
  };
  return { positions, viewBox, aspect: viewBox.w / viewBox.h };
}

/**
 * Same count formula the React component used pre-commit-19 - kept
 * here so the snap-corrected editorial value (anchorState.livesSaved)
 * holds at settle, including the S2 1-dot case where the data
 * doesn't satisfy livesSaved + totalDeaths = 699 exactly.
 */
function targetGreenCount(
  geometricTotalDeaths: number,
  livesSavedAtAnchor: number,
  dragging: boolean,
): number {
  const raw = dragging ? NUM_DOTS - geometricTotalDeaths : livesSavedAtAnchor;
  return Math.max(0, Math.min(NUM_DOTS, Math.round(raw)));
}

function Poster003DotsImpl() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep React state to track parse completion (so we can switch
  // from a placeholder div to a canvas div), but do not feed
  // slider-driven values through state - those flow via the store.
  const [parsed, setParsed] = useState<boolean>(!!cachedPositions);
  const [parseError, setParseError] = useState(false);

  // ─── One-time fetch + parse ─────────────────────────────────────
  useEffect(() => {
    if (cachedPositions) return;
    let cancelled = false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', SVG_URL, true);
    xhr.responseType = 'text';
    xhr.onload = () => {
      if (cancelled) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        const result = parseDotsSvg(xhr.responseText);
        if (result && result.positions.length === NUM_DOTS) {
          cachedPositions = result.positions;
          cachedViewBox = result.viewBox;
          cachedAspect = result.aspect;
          setParsed(true);
        } else {
          setParseError(true);
        }
      } else {
        setParseError(true);
      }
    };
    xhr.onerror = () => {
      if (!cancelled) setParseError(true);
    };
    xhr.send();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Canvas setup + store subscription ─────────────────────────
  useEffect(() => {
    if (!parsed) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const positions = cachedPositions;
    const vb = cachedViewBox;
    if (!canvas || !container || !positions || !vb) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;
    let lastGreen = -1;
    let rafId: number | null = null;

    // Pre-build a Path2D each redraw uses by walking the positions
    // array - but the array is fixed, so we can pre-build TWO
    // Path2Ds (red and green) per redraw. Cheaper to just rebuild
    // on each redraw than to maintain stateful Path2Ds.
    const redraw = () => {
      const viz = poster003Store.getCurrent();
      const dragging = poster003Store.isDragging();
      const targetGreen = targetGreenCount(
        viz.geometricTotalDeaths,
        viz.anchorState.livesSaved,
        dragging,
      );
      // Bail if nothing visible has changed.
      if (targetGreen === lastGreen) return;
      lastGreen = targetGreen;

      // Build the green-set: first targetGreen entries of DOT_ORDERING.
      const isGreen = new Uint8Array(NUM_DOTS);
      for (let i = 0; i < targetGreen; i++) isGreen[DOT_ORDERING[i]] = 1;

      // Compose the viewBox-fit transform.
      const fit = Math.min(cssW / vb.w, cssH / vb.h);
      const offX = (cssW - vb.w * fit) / 2;
      const offY = (cssH - vb.h * fit) / 2;
      ctx.setTransform(
        fit * DPR,
        0,
        0,
        fit * DPR,
        (offX - vb.x * fit) * DPR,
        (offY - vb.y * fit) * DPR,
      );
      ctx.clearRect(vb.x, vb.y, vb.w, vb.h);

      ctx.globalAlpha = DOT_OPACITY;

      // Red batch.
      ctx.fillStyle = COLOR_RED;
      ctx.beginPath();
      for (let i = 0; i < NUM_DOTS; i++) {
        if (isGreen[i]) continue;
        const p = positions[i];
        ctx.moveTo(p.cx + DOT_RADIUS, p.cy);
        ctx.arc(p.cx, p.cy, DOT_RADIUS, 0, Math.PI * 2);
      }
      ctx.fill();

      // Green batch.
      ctx.fillStyle = COLOR_GREEN;
      ctx.beginPath();
      for (let i = 0; i < NUM_DOTS; i++) {
        if (!isGreen[i]) continue;
        const p = positions[i];
        ctx.moveTo(p.cx + DOT_RADIUS, p.cy);
        ctx.arc(p.cx, p.cy, DOT_RADIUS, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    const scheduleRedraw = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        redraw();
      });
    };

    const resize = () => {
      const r = container.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      canvas.width = Math.max(1, Math.floor(cssW * DPR));
      canvas.height = Math.max(1, Math.floor(cssH * DPR));
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      // Force redraw after size change (lastGreen comparison still
      // holds; but the canvas has been cleared so we need to repaint).
      lastGreen = -1;
      scheduleRedraw();
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const unsubscribe = poster003Store.subscribe(() => scheduleRedraw());

    // Initial paint at the current store state.
    scheduleRedraw();

    return () => {
      unsubscribe();
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [parsed]);

  if (parseError) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <p className="text-base text-muted-foreground">
          Unable to load the dots visualisation.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full mx-auto"
      style={{ aspectRatio: cachedAspect, maxWidth: 600 }}
    >
      {parsed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// memo - no props means the default shallow compare always bails.
export default memo(Poster003DotsImpl);
