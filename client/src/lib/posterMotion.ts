export const TUNING = {
  // Per-form flow amplitude (px). Outermost line gets zero, innermost
  // line gets the full amount. Quadratically depth-weighted.
  flowAmpMin:     3,         // nuclear — barely visible drift
  flowAmpMax:     28,        // coal — vigorous interior swirl

  // Spatial scale of the large-scale flow layer (1/SVG units).
  // ~0.006 means one wavelength ≈ 1000 SVG units, roughly the size
  // of the largest form. Larger = smaller eddies.
  flowK1:         0.006,
  // Temporal evolution rate of the large-scale layer (rad/sec).
  // Lower = slower drift.
  flowW1:         0.45,

  // Smaller-scale layer for local turbulence. Higher k = finer detail,
  // higher w = faster shimmer. Amplitude weight relative to large
  // layer.
  flowK2:         0.020,
  flowW2:         0.85,
  flowAmp2Weight: 0.35,

  // Outline stability threshold. Lines with depth < this get zero
  // displacement and use pre-built Path2D for speed.
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
