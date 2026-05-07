export const TUNING = {
  // Per-line drift amplitude (px in canvas space, at maximum depth).
  // The outermost line (depth 0) gets zero drift; the innermost line
  // (depth 1) gets the full amount. Mid-depth lines are interpolated.
  lineDriftAmpMin:     4,      // nuclear — quiet interior
  lineDriftAmpMax:     18,     // coal — vigorous swirl

  // Period of the slow drift (seconds). Each line's drift direction
  // rotates over time at this period. Lower = faster swirl.
  lineDriftPeriodMin:  14,     // coal — interior swirls faster
  lineDriftPeriodMax:  26,     // nuclear — interior swirls slower

  // Per-line amplitude wobble (independent of drift direction):
  // each line's drift magnitude pulses gently.
  lineWobbleMin:       0.4,    // weaker near outline
  lineWobbleMax:       0.8,    // stronger toward centre

  // Outline stability threshold. Lines with depth < this value
  // are treated as outline and get ZERO motion. This is what keeps
  // the form boundary visually stable.
  outlineDepthThreshold: 0.06,

  // Optional: a tiny form-level "trying to escape" outward bias for
  // the highest-emission forms only. Set to 0 to disable.
  outwardBiasMax:      1.5,    // px, applied to coal-class forms only
} as const;

// Log scale 5.6 → 970 maps to 0 → 1
function emissionsT(emissions: number, eMin = 5.6, eMax = 970): number {
  return Math.log10(emissions / eMin) / Math.log10(eMax / eMin);
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

export interface FormMotion {
  // Per-form scalars derived from emissions
  lineDriftAmp: number;
  lineDriftPeriod: number;
  outwardBias: number;

  // Per-line state, populated at init by the canvas component once
  // the line count is known. Each entry corresponds to a polyline.
  linePhases?: Float32Array;     // unique phase 0..2π per line
  lineAngles?: Float32Array;     // base drift angle 0..2π per line
  lineRotRates?: Float32Array;   // angular velocity per line (rad/sec)
}

export function resolveMotion(emissions: number): FormMotion {
  const t = emissionsT(emissions);
  return {
    lineDriftAmp:    lerp(TUNING.lineDriftAmpMin,    TUNING.lineDriftAmpMax,    t),
    lineDriftPeriod: lerp(TUNING.lineDriftPeriodMax,  TUNING.lineDriftPeriodMin, t),
    outwardBias:     lerp(0, TUNING.outwardBiasMax, t * t), // quadratic — only top forms get it
  };
}

// Initialise per-line state for a form. Called once after the form's
// polylines are known (canvas component does this at module init).
export function initLineMotion(motion: FormMotion, lineCount: number): void {
  const phases = new Float32Array(lineCount);
  const angles = new Float32Array(lineCount);
  const rotRates = new Float32Array(lineCount);
  for (let i = 0; i < lineCount; i++) {
    phases[i] = Math.random() * Math.PI * 2;
    angles[i] = Math.random() * Math.PI * 2;
    // Each line rotates its drift angle at a slightly different rate.
    // Range ~0.03 to 0.12 rad/s = period of ~50s to ~200s. Slow.
    rotRates[i] = 0.03 + Math.random() * 0.09;
  }
  motion.linePhases = phases;
  motion.lineAngles = angles;
  motion.lineRotRates = rotRates;
}

// Compute the (offsetX, offsetY) for a single line at a given time.
// depth: 0 = outermost (outline), 1 = innermost (centre).
// formCentroidOffset: outward direction unit vector for this form, for
// the optional escape-bias contribution. Pass [0, 0] to disable.
export function applyLineMotion(
  motion: FormMotion,
  lineIndex: number,
  depth: number,
  time: number,
  formCentroidOffset: [number, number],
): { offsetX: number; offsetY: number } {
  // Outline: zero motion. This is what keeps the form boundary stable.
  if (depth < TUNING.outlineDepthThreshold) {
    return { offsetX: 0, offsetY: 0 };
  }

  // Depth-weighted amplitude: lines deeper in the stack drift more.
  // Smooth ramp from outlineDepthThreshold → 1.
  const dw =
    (depth - TUNING.outlineDepthThreshold) /
    (1 - TUNING.outlineDepthThreshold);
  const depthWeight = dw * dw * (3 - 2 * dw); // smoothstep

  const phases = motion.linePhases!;
  const angles = motion.lineAngles!;
  const rotRates = motion.lineRotRates!;

  // Slowly-rotating drift angle per line.
  const angle = angles[lineIndex] + time * rotRates[lineIndex];

  // Amplitude wobble per line.
  const wobble =
    lerp(TUNING.lineWobbleMin, TUNING.lineWobbleMax, depth) *
    (0.6 + 0.4 * Math.sin(time * 0.6 + phases[lineIndex]));

  const amp = motion.lineDriftAmp * depthWeight * wobble;

  // Outward bias: top-emission forms have a small constant push
  // toward their outward direction (away from the SVG centre).
  const biasX = formCentroidOffset[0] * motion.outwardBias * depthWeight;
  const biasY = formCentroidOffset[1] * motion.outwardBias * depthWeight;

  return {
    offsetX: amp * Math.cos(angle) + biasX,
    offsetY: amp * Math.sin(angle) + biasY,
  };
}
