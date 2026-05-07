export const TUNING = {
  // Per-form flow amplitude (px). Outermost line gets zero, innermost
  // line gets the full amount. Quadratically depth-weighted.
  flowAmpMin:     4,         // nuclear — visible drift, still quiet
  flowAmpMax:     38,        // coal — vigorous interior deformation

  // Spatial scale of the medium-scale flow layer (1/SVG units).
  // 0.022 means wavelength ≈ 285 SVG units, ~4 eddies across coal.
  // This is the layer that drives actual deformation: different
  // points on a single line see different field directions, so
  // lines stretch and compress.
  flowK1:         0.022,
  // Temporal evolution rate of the medium-scale layer (rad/sec).
  flowW1:         0.55,

  // Smaller-scale layer for fine turbulence on top.
  // 0.062 = wavelength ≈ 100 SVG units (~10 eddies across coal).
  flowK2:         0.062,
  flowW2:         1.10,
  flowAmp2Weight: 0.42,

  // Outline stability threshold.
  outlineDepthThreshold: 0.06,
} as const;

// Log scale 5.6 → 970 maps to 0 → 1
function emissionsT(emissions: number, eMin = 5.6, eMax = 970): number {
  return Math.log10(emissions / eMin) / Math.log10(eMax / eMin);
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

export interface FormMotion {
  flowAmp: number;
}

export function resolveMotion(emissions: number): FormMotion {
  const t = emissionsT(emissions);
  return {
    flowAmp: lerp(TUNING.flowAmpMin, TUNING.flowAmpMax, t),
  };
}

// Smoothstep used for depth weighting.
export function depthWeight(depth: number): number {
  if (depth < TUNING.outlineDepthThreshold) return 0;
  const dw =
    (depth - TUNING.outlineDepthThreshold) /
    (1 - TUNING.outlineDepthThreshold);
  return dw * dw * (3 - 2 * dw);
}
