export const TUNING_LIQUID = {
  // Per-form interior amplitude. UNIFORM across forms - not scaled to value.
  flowAmp:                  6,        // px (vs 001's 4 - 30 range)
  flowK1:                   0.006,    // half of 001's 0.012 → larger eddies
  flowW1:                   0.20,     // 40% of 001's 0.50 → slower, viscous
  // No flowK2/flowW2 layer - water is smooth, no small-scale chaos.
  outlineDepthThreshold:    0.06,     // same as 001 - outline stays stable

  // Cursor magnetism - only active in Combined + Water modes.
  cursorFalloffPad:         0.15,     // padding fraction of bbox max-dim
  cursorAmpMax:             60,       // max push amplitude (SVG units) when cursor on form
  cursorSigmaMul:           1.5,      // multiplier on halfMaxDim for Gaussian sigma
  cursorSpeedFloor:         0.05,     // below this normalised speed → no effect
  cursorSpeedSat:           1.5,      // above this normalised speed → max amplitude
} as const;

// Smoothstep used for depth weighting - same as posterMotion.ts::depthWeight.
export function depthWeightLiquid(depth: number): number {
  if (depth < TUNING_LIQUID.outlineDepthThreshold) return 0;
  const dw =
    (depth - TUNING_LIQUID.outlineDepthThreshold) /
    (1 - TUNING_LIQUID.outlineDepthThreshold);
  return dw * dw * (3 - 2 * dw);
}

/**
 * Compute cursor influence for a single form.
 * Returns 0 - 1, Gaussian falloff from form centroid.
 * Returns 0 outside (1 + cursorFalloffPad) × formBboxMaxDim / 2.
 */
export function cursorInfluence(
  cursorSvgX: number,
  cursorSvgY: number,
  formCentroidX: number,
  formCentroidY: number,
  formBboxMaxDim: number,
): number {
  const dx = cursorSvgX - formCentroidX;
  const dy = cursorSvgY - formCentroidY;
  const dist = Math.hypot(dx, dy);
  const radius = (1 + TUNING_LIQUID.cursorFalloffPad) * formBboxMaxDim / 2;
  if (dist > radius) return 0;
  // Gaussian: sigma = radius / 2.5 so it's ~0 at the edge
  const sigma = radius / 2.5;
  return Math.exp(-(dist * dist) / (2 * sigma * sigma));
}
