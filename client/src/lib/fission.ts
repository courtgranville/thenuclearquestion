/**
 * Tuning constants for the nucleus hero animation.
 * All magic numbers from the original vanilla JS, surfaced here.
 */
export const TUNING = {
  // Cursor magnetism / drift
  driftStrength: 0.24, // fraction of fieldR pulled toward cursor
  baseBulge: 0.13,     // proximity-bulge base gain
  strength: 1.5,       // global multiplier (was the 'magnetism' tweak)

  // Sizing
  fieldRFrac: 0.54,    // field radius = min(W,H) * this
  restRFrac: 0.66,     // rest nucleus radius = fieldR * this

  // Fission gating
  triggerRadius: 0.85, // cursor must be within this normalised radius
  fastSpeedBase: 2.0,
  requiredTBase: 2.2,

  // Phase durations (seconds)
  splitTime: 0.55,
  bounceTime: 0.55,
  holdTime: 1.0,
  reformTime: 1.2,
  cooldown: 1.2,

  // Half geometry (fraction of fieldR)
  sepRest: 0.50,
  sepOvershoot: 0.74,
  halfScaleRest: 0.50,

  // Particles
  burstColors: ['#fff2a8', '#fde274', '#f3c13a', '#e8b51c', '#f59321', '#ef6b1a', '#d44214', '#a02410'] as const,
  maxParticles: 9000,
  burstCount: 4800,
  particleGravity: 520,
} as const;

export type FissionPhase = 'idle' | 'splitting' | 'bouncing' | 'split' | 'reforming';

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  size: number;
  ci: number; // color index into burstColors
}

export interface FissionState {
  tension: number;
  fastT: number;
  shakeScore: number;
  lastVx: number; lastVy: number;
  phase: FissionPhase;
  pf: number;
  splitAng: number;
  splitX: number; splitY: number;
  particles: Particle[];
  cooldown: number;
  bouncedImpact: boolean;
}

export function makeFissionState(): FissionState {
  return {
    tension: 0,
    fastT: 0,
    shakeScore: 0,
    lastVx: 0, lastVy: 0,
    phase: 'idle',
    pf: 0,
    splitAng: 0,
    splitX: 0, splitY: 0,
    particles: [],
    cooldown: 0,
    bouncedImpact: false,
  };
}

/** Map isotope (0..1) → (FAST_SPEED, REQUIRED_T, shakeNeeded). U-235 stable, U-238 enriched (much easier). */
export function isotopeToGates(
  isotope: number,
): { fastSpeed: number; requiredT: number; shakeNeeded: number } {
  const k = Math.max(0, Math.min(1, isotope));
  return {
    fastSpeed: 2.4 - k * 1.4,   // 2.4 → 1.0
    requiredT: 1.9 - k * 1.5,   // 1.9s → 0.4s
    shakeNeeded: 8 - k * 4,     // 8 → 4 reversals
  };
}
