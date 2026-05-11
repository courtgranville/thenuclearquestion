/**
 * canvasUtils.ts - shared DPR-aware canvas sizing.
 *
 * Every canvas viz on the site (NucleusHero, Poster001/002/004
 * CanvasViz, Poster005DendroQuadrant) repeats the same sizing
 * scaffold: read devicePixelRatio, multiply the backing store,
 * set CSS dimensions in px. The transform after that differs
 * per-component (some set the simple identity-DPR transform,
 * others compose DPR with a viewBox scale + offset).
 *
 * Centralising sizing here:
 *  - Eliminates the per-component DPR caps that were rendering
 *    high-DPR displays at 75% of native resolution. Single
 *    MAX_DPR ceiling lives in one place.
 *  - Reads devicePixelRatio FRESH on every call, so dragging the
 *    window between displays of different DPR refreshes correctly.
 *  - Leaves the transform to the caller (since composite transforms
 *    are component-specific).
 *
 * Usage:
 *
 *   const resize = () => {
 *     const r = container.getBoundingClientRect();
 *     const { ctx, dpr } = fitCanvasToDpr(canvas, r.width, r.height);
 *     // Set whatever transform you need:
 *     ctx.setTransform(dpr, 0, 0, dpr, 0, 0);          // simple
 *     // or composite:
 *     ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr);
 *   };
 *   resize();
 *   const ro = new ResizeObserver(resize);
 *   ro.observe(container);
 */

export interface FitCanvasResult {
  ctx: CanvasRenderingContext2D;
  /** The devicePixelRatio used for this fit (after the soft cap).
   *  Returned so callers can compose their own transform. */
  dpr: number;
}

/** Maximum DPR we'll ask the browser for. 3.0 covers Retina (2x),
 *  Android 3x, and the rare 4x ultra-HD without runaway backing
 *  stores on extreme-DPR-reporting devices. */
export const MAX_DPR = 3;

/**
 * Resize a canvas's backing store + CSS dimensions for crisp
 * native-DPR rendering. Returns the 2D context and the DPR used.
 *
 * Re-reads `window.devicePixelRatio` on every call so this is safe
 * to use inside a ResizeObserver / resize listener. The transform
 * is NOT set - callers do that themselves to support both simple
 * (identity-DPR) and composite (DPR × viewBox-scale) transforms.
 */
export function fitCanvasToDpr(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
): FitCanvasResult {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

  canvas.width = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  return { ctx, dpr };
}
