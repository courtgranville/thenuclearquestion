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

  // Heat-driven size: cool particles stay near base, hot particles
  // grow significantly larger. A spike near peak heat (aHeat > 0.85)
  // adds a sharp punch at the moment of fission so the eye catches
  // each event as a discrete beat.
  float heatBonus = 1.0 + aHeat * 2.5;
  float spike = smoothstep(0.85, 1.0, aHeat) * 2.0;
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

void main() {
  // gl_PointCoord is [0,1]^2 over the point sprite.
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;

  // Soft disc: smoothstep falloff with bright core.
  float alpha = smoothstep(0.5, 0.0, r);
  alpha = pow(alpha, 1.7);

  // Thermal gradient: cream → ochre at 0.5 → red at 0.85 → white-hot
  // at peak. The fourth stop (whiteHot) deliberately exceeds 1.0 so
  // bloom lifts it into a bright halo - the "flash" at the moment of
  // fission.
  vec3 color;
  if (vHeat < 0.5) {
    color = mix(uColorCold, uColorWarm, vHeat * 2.0);
  } else if (vHeat < 0.85) {
    color = mix(uColorWarm, uColorHot, (vHeat - 0.5) / 0.35);
  } else {
    vec3 whiteHot = vec3(1.4, 1.2, 1.0);
    color = mix(uColorHot, whiteHot, (vHeat - 0.85) / 0.15);
  }

  // Boost peak brightness so the white-hot moment really pops.
  float intensity = 0.55 + vHeat * 1.0;

  gl_FragColor = vec4(color * intensity, alpha);
}
`;
