// Vertex + fragment GLSL for the FissionParticles point cloud.
// Phase 6.1 replaces the discrete state-to-colour mapping with a
// continuous thermal gradient (cream → ochre → red) driven by the
// per-particle `aHeat` attribute. `aHeat` is in [0, 1]; the engine's
// updateHeat() pass computes it each frame.
//
// `aRest` is declared (and uploaded as a BufferAttribute by
// FissionParticles) for forward compatibility with future engine
// passes that may want spring forces evaluated on the GPU. A trivial
// reference keeps the GL linker from stripping the attribute, which
// would otherwise produce a Three.js warning about a buffer
// attribute with no shader location.

export const vertexShader = /* glsl */ `
attribute vec2 aRest;
attribute float aHeat;
attribute float aPhase;

uniform float uTime;
uniform float uPointSize;

varying float vHeat;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Breathing - subtle low-frequency size modulation.
  float breath = 0.92 + 0.08 * sin(uTime * 0.6 + aPhase);

  // Heat-driven size. Phase 11 toned the heat bonus 2.5 → 1.5 and
  // the peak spike 2.0 → 0.5 so peaked particles read as bright
  // points rather than 30-40 px bloomed orbs.
  float heatBonus = 1.0 + aHeat * 1.5;
  float spike = smoothstep(0.85, 1.0, aHeat) * 0.5;
  heatBonus += spike;

  gl_PointSize = uPointSize * breath * heatBonus;

  // Phase 6.2 tried removing the aRest reference; the linker still
  // strips it cleanly with no warning when no shader code uses the
  // attribute, but FissionParticles continues to upload aRest as a
  // BufferAttribute for Phase 9's planned GPU spring-force pass.
  // Keep the attribute declaration, drop the trivial reference.

  vHeat = aHeat;
}
`;

export const fragmentShader = /* glsl */ `
precision mediump float;

varying float vHeat;

uniform vec3 uColorCold;       // cream  #ECE7DF - at-rest baseline
uniform vec3 uColorWarm;       // ochre  #B5822E - warming up
uniform vec3 uColorHot;        // red    #A51E22 - peak fission heat
uniform float uEnrichment;     // 0..1 - drives the peak heat cap

void main() {
  // gl_PointCoord is [0,1]^2 over the point sprite.
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;

  // Soft disc: smoothstep falloff with bright core.
  float alpha = smoothstep(0.5, 0.0, r);
  alpha = pow(alpha, 1.7);

  // Phase 11 - clamp the visible peak based on enrichment so the
  // colour signal distinguishes reactor from weapons regime
  // without the user reading the slider. At 3% enrichment the
  // peak caps at warm yellow (no aggressive reds or whites); at
  // 90% the full white-hot peak is reached.
  float maxHeat = 0.4 + uEnrichment * 0.6;
  float visibleHeat = min(vHeat, maxHeat);

  // Thermal gradient: cream → ochre at 0.5 → red at 0.85 → toned
  // yellow-white at peak. Peak colour 0.95/0.85/0.55 stays below
  // 1.0 so bloom amplifies it proportionally rather than producing
  // the distinct ball-shaped halos Phase 7.x had.
  vec3 color;
  if (visibleHeat < 0.5) {
    color = mix(uColorCold, uColorWarm, visibleHeat * 2.0);
  } else if (visibleHeat < 0.85) {
    color = mix(uColorWarm, uColorHot, (visibleHeat - 0.5) / 0.35);
  } else {
    vec3 peakColor = vec3(0.95, 0.85, 0.55);
    color = mix(uColorHot, peakColor, (visibleHeat - 0.85) / 0.15);
  }

  // Intensity ramp 0.65 → 0.45 to match the more restrained peak.
  float intensity = 0.55 + visibleHeat * 0.45;

  gl_FragColor = vec4(color * intensity, alpha);
}
`;
