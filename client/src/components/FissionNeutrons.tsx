import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TUNING } from '@/lib/fissionTuning';
import type { FissionEngine } from '@/lib/fissionEngine';

// A separate <points> mesh whose buffer is sized to 3x the neutron
// pool: each live neutron renders as 3 trailing points (head + 2
// tail samples) for visual continuity in flight. The 3 slots per
// neutron get pre-computed sizes and opacities baked into per-vertex
// attributes so the shader stays trivial.
//
// Trail strategy: extrapolate backward along the velocity vector by
// fixed time offsets (50 ms and 100 ms) rather than store actual
// past positions. Neutrons move in straight lines (no forces apply
// after spawn), so velocity extrapolation matches the real path
// without needing a ring buffer.

const SLOTS_PER_NEUTRON = 3;
// Time offsets (seconds) for each trail slot behind the head.
const TRAIL_DT = [0, 0.05, 0.10];
// Base point sizes in pixels per slot.
const TRAIL_SIZE = [14, 9, 5];
// Opacity per slot (head is fully opaque, tail fades).
const TRAIL_OPACITY = [1.0, 0.5, 0.2];

const NEUTRON_VS = /* glsl */ `
attribute float aAge;
attribute float aSize;
attribute float aOpacity;

varying float vAge;
varying float vOpacity;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize - aAge * 2.0;
  vAge = aAge;
  vOpacity = aOpacity;
}
`;

const NEUTRON_FS = /* glsl */ `
precision mediump float;
varying float vAge;
varying float vOpacity;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, r);
  alpha *= (1.0 - vAge * 0.3) * vOpacity;
  // Warmer than pure cream so neutrons read as energy quanta against
  // the cloud rather than as miniature cloud particles.
  gl_FragColor = vec4(1.0, 0.92, 0.78, alpha);
}
`;

type Props = { engine: FissionEngine };

export default function FissionNeutrons({ engine }: Props) {
  const max = TUNING.MAX_LIVE_NEUTRONS;
  const totalSlots = max * SLOTS_PER_NEUTRON;

  const { geometry, material, positions, ages } = useMemo(() => {
    const positions = new Float32Array(totalSlots * 3);
    const ages = new Float32Array(totalSlots);
    const sizes = new Float32Array(totalSlots);
    const opacities = new Float32Array(totalSlots);

    for (let i = 0; i < max; i++) {
      for (let s = 0; s < SLOTS_PER_NEUTRON; s++) {
        const slot = i * SLOTS_PER_NEUTRON + s;
        positions[slot * 3] = 99;
        positions[slot * 3 + 1] = 99;
        sizes[slot] = TRAIL_SIZE[s];
        opacities[slot] = TRAIL_OPACITY[s];
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: NEUTRON_VS,
      fragmentShader: NEUTRON_FS,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry, material, positions, ages };
  }, [max, totalSlots]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(() => {
    const neutrons = engine.neutrons;
    const elapsed = engine.elapsedMs;
    for (let i = 0; i < neutrons.length; i++) {
      const n = neutrons[i];
      if (n.alive) {
        const ageMs = elapsed - n.bornAt;
        const age = Math.min(1, ageMs / TUNING.NEUTRON_LIFE_MS);
        for (let s = 0; s < SLOTS_PER_NEUTRON; s++) {
          const slot = i * SLOTS_PER_NEUTRON + s;
          const dt = TRAIL_DT[s];
          positions[slot * 3] = n.x - n.vx * dt;
          positions[slot * 3 + 1] = n.y - n.vy * dt;
          positions[slot * 3 + 2] = 0;
          ages[slot] = age;
        }
      } else {
        for (let s = 0; s < SLOTS_PER_NEUTRON; s++) {
          const slot = i * SLOTS_PER_NEUTRON + s;
          positions[slot * 3] = 99;
          positions[slot * 3 + 1] = 99;
          ages[slot] = 0;
        }
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAge.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} />;
}
