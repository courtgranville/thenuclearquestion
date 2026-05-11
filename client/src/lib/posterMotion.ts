export const TUNING = {
  // Per-form flow amplitude (px). Outermost line gets zero, innermost
  // line gets the full amount. Quadratically depth-weighted.
  flowAmpMin:     4,         // nuclear - visible drift, still quiet
  flowAmpMax:     30,        // coal - vigorous interior, kept under
                             // the gradient threshold that produces
                             // visible kinks in sparse polyline
                             // segments (gradient ≈ amp × k).

  // Spatial scale of the medium-scale flow layer (1/SVG units).
  // 0.012 means wavelength ≈ 520 SVG units, ~2 eddies across coal.
  // Trade-off: larger eddies (lower k) read as more rigid translation;
  // smaller eddies (higher k) read as deformation but produce angular
  // facets when amp × k exceeds the polyline's segment density.
  flowK1:         0.012,
  // Temporal evolution rate of the medium-scale layer (rad/sec).
  flowW1:         0.50,

  // Smaller-scale layer for fine turbulence on top.
  flowK2:         0.030,
  flowW2:         0.95,
  flowAmp2Weight: 0.38,

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
