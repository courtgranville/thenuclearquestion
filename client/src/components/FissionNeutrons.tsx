import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TUNING } from '@/lib/fissionTuning';
import type { FissionEngine } from '@/lib/fissionEngine';

// A separate <points> mesh whose buffer is sized to the neutron pool
// (TUNING.MAX_LIVE_NEUTRONS). Each frame we copy the engine's neutron
// positions into the position attribute and ages into aAge for the
// shader to use for size + alpha falloff. Dead neutrons are parked
// off-screen at (99, 99) so they discard naturally in the fragment
// shader without per-frame index churn.

const NEUTRON_VS = /* glsl */ `
attribute float aAge;
varying float vAge;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = 6.0 - aAge * 2.0;
  vAge = aAge;
}
`;

const NEUTRON_FS = /* glsl */ `
precision mediump float;
varying float vAge;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, r);
  alpha *= (1.0 - vAge * 0.3);
  gl_FragColor = vec4(1.0, 0.95, 0.85, alpha);
}
`;

type Props = { engine: FissionEngine };

export default function FissionNeutrons({ engine }: Props) {
  const max = TUNING.MAX_LIVE_NEUTRONS;

  const { geometry, material, positions, ages } = useMemo(() => {
    const positions = new Float32Array(max * 3);
    const ages = new Float32Array(max);
    for (let i = 0; i < max; i++) {
      positions[i * 3] = 99;
      positions[i * 3 + 1] = 99;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: NEUTRON_VS,
      fragmentShader: NEUTRON_FS,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry, material, positions, ages };
  }, [max]);

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
        positions[i * 3] = n.x;
        positions[i * 3 + 1] = n.y;
        positions[i * 3 + 2] = 0;
        const ageMs = elapsed - n.bornAt;
        ages[i] = Math.min(1, ageMs / TUNING.NEUTRON_LIFE_MS);
      } else {
        positions[i * 3] = 99;
        positions[i * 3 + 1] = 99;
        ages[i] = 0;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAge.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} />;
}
