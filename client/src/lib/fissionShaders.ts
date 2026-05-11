// Vertex + fragment GLSL for the FissionParticles point cloud.
// `aRest` is declared (and uploaded as a BufferAttribute by
// FissionParticles) for forward compatibility with Phase 6's engine,
// which will mutate position back toward rest via GPU-side spring
// forces. Until then a trivial reference keeps the GL linker from
// stripping the attribute, which would otherwise produce a Three.js
// warning about an attribute with no shader location.

export const vertexShader = /* glsl */ `
attribute vec2 aRest;
attribute float aState;
attribute float aPhase;

uniform float uTime;
uniform float uPointSize;

varying float vState;
varying float vIntensity;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size scales mildly with state (excited = bigger) and breathing.
  float breath = 0.92 + 0.08 * sin(uTime * 0.6 + aPhase);
  float stateBonus = aState > 0.5 ? 1.6 : 1.0;
  gl_PointSize = uPointSize * breath * stateBonus;

  // Forward-compat: reference aRest so the attribute survives linking.
  // Phase 6 will replace this with real spring-force usage.
  gl_PointSize += 0.0 * (aRest.x + aRest.y);

  vState = aState;
  vIntensity = aState > 0.5 ? 1.0 : 0.55;
}
`;

export const fragmentShader = /* glsl */ `
precision mediump float;

varying float vState;
varying float vIntensity;

uniform vec3 uColorBound;
uniform vec3 uColorExcited;
uniform vec3 uColorCold;

void main() {
  // gl_PointCoord is [0,1]^2 over the point sprite.
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;

  // Soft disc: smoothstep falloff with bright core.
  float alpha = smoothstep(0.5, 0.0, r);
  alpha = pow(alpha, 1.7);

  vec3 color = uColorBound;
  if (vState > 1.5) {
    color = mix(uColorBound, uColorCold, 0.7); // released = cooled
  } else if (vState > 0.5) {
    color = uColorExcited;                     // excited = red
  }

  gl_FragColor = vec4(color * vIntensity, alpha);
}
`;
