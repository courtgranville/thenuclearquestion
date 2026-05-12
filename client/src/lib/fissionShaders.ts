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

  // Size scales mildly with heat (hot particles read bigger) and
  // breathing.
  float breath = 0.92 + 0.08 * sin(uTime * 0.6 + aPhase);
  float heatBonus = 1.0 + aHeat * 0.6;
  gl_PointSize = uPointSize * breath * heatBonus;

  // Forward-compat: reference aRest so the attribute survives
  // linking. Future GPU spring-force passes will use it.
  gl_PointSize += 0.0 * (aRest.x + aRest.y);

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

  // Thermal gradient: cream → ochre at 0.5 → red at 1.0.
  vec3 color;
  if (vHeat < 0.5) {
    color = mix(uColorCold, uColorWarm, vHeat * 2.0);
  } else {
    color = mix(uColorWarm, uColorHot, (vHeat - 0.5) * 2.0);
  }

  // Hot particles brighter so they pop under bloom.
  float intensity = 0.55 + vHeat * 0.7;

  gl_FragColor = vec4(color * intensity, alpha);
}
`;
