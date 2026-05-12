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

  // Cursor magnetism (Phase 6).
  CURSOR_RADIUS: 0.12,
  CURSOR_FORCE: 0.8,

  // Cascade behaviour (Phase 6).
  CASCADE_RADIUS: 0.025,
  CASCADE_PROBABILITY_BASE: 0.18,
  REACTION_WINDOW_MS: 120,
  RECOHERE_DELAY_MS: 1800,
  RECOHERE_BAND: 0.015,

  // Neutrons (Phase 6 / 7).
  NEUTRON_SPEED: 1.8,
  NEUTRON_HIT_RADIUS: 0.012,
  NEUTRONS_PER_FISSION: 2,
  MAX_LIVE_NEUTRONS: 600,
  // Lifetime cap on a free neutron. After this, the neutron is
  // silently removed even if it never struck a particle.
  NEUTRON_LIFE_MS: 3000,

  // Energy (Phase 10).
  ENERGY_PER_FISSION_MEV: 200,

  // Velocity of a fission release - the radial outward kick imparted
  // to a particle at the moment it transitions excited -> released.
  RELEASE_KICK_SPEED: 0.8,

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
