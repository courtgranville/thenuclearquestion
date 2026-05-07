export const TUNING = {
  // Drift amplitude (px in canvas space)
  driftAmpMin:     2,    // nuclear
  driftAmpMax:     12,   // coal
  // Drift period (seconds)
  driftPeriodMin:  4,    // coal — faster
  driftPeriodMax:  11,   // nuclear — slower
  // Breathing scale wobble (fraction)
  breathMagMin:    0.005,  // nuclear: 0.5%
  breathMagMax:    0.04,   // coal: 4%
  // Breathing period (seconds)
  breathPeriodMin: 3,    // coal
  breathPeriodMax: 9,    // nuclear
  // Per-line jitter (px)
  jitterAmpMin:    0.05, // nuclear
  jitterAmpMax:    0.30, // coal
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
    offsetY: m.driftAmp * 0.7 * Math.cos(time * wDrift * 0.83 + m.phaseDrift),
    scale:   1 + m.breathMag * Math.sin(time * wBreath + m.phaseBreath),
  };
}
