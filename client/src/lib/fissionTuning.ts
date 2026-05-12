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

  REACTION_WINDOW_MS: 280,
  RECOHERE_DELAY_MS: 1800,
  RECOHERE_BAND: 0.015,

  // Neutron speed range - slider 0..1 maps FAST → SLOW. Fast neutrons
  // pass through with low fission probability (4%); slow neutrons
  // drift and fission reliably (92%). This is the real physics that
  // distinguishes a reactor from a weapon.
  NEUTRON_SPEED_FAST: 2.4,
  NEUTRON_SPEED_SLOW: 0.5,
  FISSION_PROB_FAST: 0.04,
  FISSION_PROB_SLOW: 0.92,

  // Phase 7.2: walked HIT_RADIUS back from 7.1's 0.014. 0.010
  // proved too far (both regimes went sub-critical), 0.011 is the
  // sweet spot found empirically: reactor regime stays in single
  // digits, bomb regime sustains a visible chain. NEUTRONS_BASE
  // stays at 2 - the two-emission margin is what keeps the bomb
  // regime alive at high enrichment.
  NEUTRON_HIT_RADIUS: 0.011,
  NEUTRON_NEAR_MISS_RADIUS: 0.07,
  NEUTRON_LIFE_MS: 1400,
  NEUTRONS_BASE: 2,
  MAX_LIVE_NEUTRONS: 80,

  // Energy (Phase 10 will format this).
  ENERGY_PER_FISSION_MEV: 200,

  // Release kick at the moment of fission. Phase 7 raised this 5x
  // so released particles fly outward dramatically; at supercritical,
  // the form should visibly explode.
  RELEASE_KICK_SPEED: 2.5,

  // Kinetic punch radius + strength. Each fission pushes nearby
  // bound particles outward. Phase 7.2 dropped strength 4.0 → 2.5
  // because the new spark system now carries most of the visual
  // explosion - the punch can be gentler so the form's structure
  // remains recognisable through cascade peak.
  FISSION_PUNCH_RADIUS: 0.1,
  FISSION_PUNCH_STRENGTH: 2.5,

  // Cursor magnetism - gentle outward push on hover. Restored in
  // Phase 7.2 with weaker force + larger reach than the Phase 6
  // values (was 0.18 / 1.5). Particles visibly perturb without
  // violent disruption. Hover does NOT trigger fission.
  CURSOR_RADIUS: 0.22,
  CURSOR_FORCE: 0.6,

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
//
// Multi-nucleus was originally planned for Phase 9 but has been
// dropped from scope: one large central form, made dramatic via
// scale and visual fidelity, is the experience.
export const QUALITY: Record<
  Quality,
  {
    particleScale: number;
    pixelRatio: number;
    maxNeutrons: number;
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
    pointSize: 4.5,
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
    pointSize: 3.5,
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
    pointSize: 3.0,
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
