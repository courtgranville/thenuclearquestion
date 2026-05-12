// Tuning constants for the Fission Room. Every dimensional value is
// expressed in normalised world units, where the nucleus form spans
// exactly [-1, +1] (see scripts/extract-fission-form.mjs). That makes
// each constant readable as a fraction of the form's width, which is
// what the brief intends. Hot-tune these without touching the engine.

export type Quality = 'low' | 'medium' | 'high';

export const TUNING = {
  // Spring constants - how strongly bound particles return to rest.
  SPRING_K: 4.5,
  DAMPING: 0.86,

  // Cursor: significantly stronger and reach-ier so the effect is
  // legible. Combined with the visible cursor indicator, this takes
  // equilibrium particle displacement to roughly 7% of form width.
  CURSOR_RADIUS: 0.18,
  CURSOR_FORCE: 1.5,

  // Cascade: sub-critical at default moderator so a single click
  // produces a short visible chain that decays, not a runaway.
  CASCADE_RADIUS: 0.025,
  CASCADE_PROBABILITY_BASE: 0.06,
  // Slow each fission so it's individually visible.
  REACTION_WINDOW_MS: 280,
  RECOHERE_DELAY_MS: 1800,
  RECOHERE_BAND: 0.015,

  // Neutrons: one per fission, smaller hit radius, slower so they're
  // visible in flight as discrete travelling points.
  NEUTRON_SPEED: 1.4,
  NEUTRON_HIT_RADIUS: 0.006,
  NEUTRONS_PER_FISSION: 1,
  NEUTRON_LIFE_MS: 2200,
  MAX_LIVE_NEUTRONS: 80,

  // Energy (Phase 10).
  ENERGY_PER_FISSION_MEV: 200,

  // Release kick - reduced so released particles don't overshoot the
  // recohere band and oscillate (was tuned for the old runaway).
  RELEASE_KICK_SPEED: 0.5,

  // Sub-critical default; the slider takes the user supercritical.
  MODERATOR_DEFAULT: 0.35,
  // After this idle period (no live excited, no live neutrons), spent
  // flags reset silently so the next click starts fresh.
  AUTO_RESET_IDLE_MS: 4000,

  // Time clamp inside the engine to defend against frame stutters.
  // dtMs above this is integrated as MAX_DT_MS instead, so a single
  // long hitch can't explode the simulation.
  MAX_DT_MS: 32,
} as const;

// Per-quality render settings. `particleScale` thins the base point
// cloud by even-stride sampling (so the outline survives), `postfx`
// gates the Phase 5 post-processing stack per effect, `pointSize` is
// the GLSL uPointSize starting value (re-tuned by eye against bloom).
//
// Bloom config is per-quality. Low gets gentler bloom with
// mipmapBlur disabled so the cheap glow softens hard pixel edges
// without paying for the wide downsampled halo. Medium / High share
// the brief's cinematic baseline. Vignette is cheap and stays on at
// every quality - it's part of the room's photographic register, not
// an opt-in effect.
export const QUALITY: Record<
  Quality,
  {
    particleScale: number;
    pixelRatio: number;
    maxNeutrons: number;
    multiNucleus: boolean;
    pointSize: number;
    postfx: {
      bloom: {
        enabled: boolean;
        intensity: number;
        luminanceThreshold: number;
        luminanceSmoothing: number;
        mipmapBlur: boolean;
      };
      vignette: boolean;
    };
  }
> = {
  low: {
    particleScale: 0.33,
    pixelRatio: 1.0,
    maxNeutrons: 150,
    multiNucleus: false,
    pointSize: 2.4,
    postfx: {
      bloom: {
        enabled: true,
        intensity: 0.5,
        luminanceThreshold: 0.0,
        luminanceSmoothing: 0.4,
        mipmapBlur: false,
      },
      vignette: true,
    },
  },
  medium: {
    particleScale: 0.66,
    pixelRatio: 1.5,
    maxNeutrons: 350,
    multiNucleus: true,
    pointSize: 1.8,
    postfx: {
      bloom: {
        enabled: true,
        intensity: 1.2,
        luminanceThreshold: 0.0,
        luminanceSmoothing: 0.4,
        mipmapBlur: true,
      },
      vignette: true,
    },
  },
  high: {
    particleScale: 1.0,
    pixelRatio: 2.0,
    maxNeutrons: 600,
    multiNucleus: true,
    pointSize: 1.4,
    postfx: {
      bloom: {
        enabled: true,
        intensity: 1.2,
        luminanceThreshold: 0.0,
        luminanceSmoothing: 0.4,
        mipmapBlur: true,
      },
      vignette: true,
    },
  },
};

// Vignette tuning is identical across qualities - cheap, part of the
// room's photographic identity.
export const VIGNETTE = {
  offset: 0.3,
  darkness: 0.4,
} as const;

// Brownian breath. Two octaves of sin/cos around each particle's
// phase, applied as a force in Phase 6 rather than as a direct
// position assignment (Phase 3's approach). Amplitudes and base
// frequencies mirror Phase 3 so the resting cloud looks visually
// identical; the difference is that the engine now produces the
// breathing through spring + force, not by clobbering position.
export const BREATHING = {
  AMP_PRIMARY: 0.003,
  AMP_SECONDARY: 0.001,
  FREQ_PRIMARY: 0.6, // rad/s
  FREQ_SECONDARY: 1.4, // rad/s
} as const;
