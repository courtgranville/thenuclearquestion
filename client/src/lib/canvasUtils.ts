/**
 * canvasUtils.ts - shared DPR-aware canvas sizing.
 *
 * Every canvas viz on the site (NucleusHero, Poster001/002/004
 * CanvasViz, Poster005DendroQuadrant, Poster006WasteInversion)
 * repeats the same sizing scaffold: read devicePixelRatio,
 * multiply the backing store, set CSS dimensions in px.
 *
 * Per-component DPR caps. Each canvas viz declares its own
 * maxDpr based on its per-frame stroke cost - the heavier the
 * canvas, the lower the cap. Firefox's canvas2D path (Cairo) is
 * significantly slower than Chrome's (Skia), so heavy canvases
 * tip into unusable framerates at retina DPR even when Chrome
 * remains smooth.
 *
 * Historical context: every poster canvas was originally
 * hardcoded at its own cap (1.5 for the heavy ones, 2.0 for the
 * lighter ones). The May 2026 migration to fitCanvasToDpr
 * collapsed these into a single global MAX_DPR=3, which caused
 * Firefox + Safari poster pages to regress from usable to 3-9 Hz.
 * Per-component caps restored here.
 */

export interface FitCanvasResult {
  ctx: CanvasRenderingContext2D;
  /** The devicePixelRatio used for this fit (after the soft cap).
   *  Returned so callers can compose their own transform. */
  dpr: number;
}

/** Default ceiling - used when a caller doesn't pass an explicit
 *  maxDpr. Effectively only applies on devices with native DPR
 *  above the caller's cap. */
export const MAX_DPR = 3;

/**
 * Resize a canvas's backing store + CSS dimensions for crisp
 * native-DPR rendering. Returns the 2D context and the DPR used.
 *
 * The optional `maxDpr` parameter caps DPR for performance-sensitive
 * canvases. Heavy canvases (Posters 001/002/005/006) should pass
 * 1.5; medium canvases (NucleusHero, Poster 004) should pass 2.0;
 * canvases with light per-frame work can omit the cap entirely.
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
  maxDpr: number = MAX_DPR,
): FitCanvasResult {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

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
