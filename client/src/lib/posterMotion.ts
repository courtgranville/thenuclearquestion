export const TUNING = {
  // Drift amplitude (px in canvas space)
  driftAmpMin:     1.5,   // nuclear — barely perceptible
  driftAmpMax:     10,    // coal — visible wander
  // Drift period (seconds)
  driftPeriodMin:  5,     // coal — faster
  driftPeriodMax:  14,    // nuclear — slow, glacial
  // Breathing scale wobble (fraction)
  breathMagMin:    0.003,   // nuclear: 0.3%
  breathMagMax:    0.025,   // coal: 2.5%
  // Breathing period (seconds)
  breathPeriodMin: 4,     // coal
  breathPeriodMax: 11,    // nuclear
  // Per-line jitter (px)
  jitterAmpMin:    0.03,  // nuclear
  jitterAmpMax:    0.20,  // coal
} as const;

// Log scale 5.6 → 970 maps to 0 → 1
function emissionsT(emissions: number, eMin = 5.6, eMax = 970): number {
  return Math.log10(emissions / eMin) / Math.log10(eMax / eMin);
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

export interface FormMotion {
  driftAmp: number;
  driftPeriod: number;
  breathMag: number;
  breathPeriod: number;
  jitterAmp: number;
  phaseDrift: number;
  phaseBreath: number;
}

export function resolveMotion(emissions: number): FormMotion {
  const t = emissionsT(emissions);
  return {
    driftAmp:     lerp(TUNING.driftAmpMin,     TUNING.driftAmpMax,     t),
    driftPeriod:  lerp(TUNING.driftPeriodMax,   TUNING.driftPeriodMin,  t),
    breathMag:    lerp(TUNING.breathMagMin,     TUNING.breathMagMax,    t),
    breathPeriod: lerp(TUNING.breathPeriodMax,  TUNING.breathPeriodMin, t),
    jitterAmp:    lerp(TUNING.jitterAmpMin,     TUNING.jitterAmpMax,    t),
    phaseDrift:   Math.random() * Math.PI * 2,
    phaseBreath:  Math.random() * Math.PI * 2,
  };
}

export function applyMotion(
  m: FormMotion,
  time: number,
): { offsetX: number; offsetY: number; scale: number } {
  const wDrift  = (Math.PI * 2) / m.driftPeriod;
  const wBreath = (Math.PI * 2) / m.breathPeriod;
  return {
    offsetX: m.driftAmp * Math.sin(time * wDrift + m.phaseDrift),
    offsetY: m.driftAmp * 0.6 * Math.cos(time * wDrift * 0.73 + m.phaseDrift),
    // Two-frequency breathing — less periodic, more "drifting" feel
    scale: 1 + m.breathMag * (
      0.7 * Math.sin(time * wBreath + m.phaseBreath) +
      0.3 * Math.sin(time * wBreath * 1.7 + m.phaseBreath * 1.3)
    ),
  };
}
