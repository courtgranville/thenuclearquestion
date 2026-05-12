import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TUNING } from '@/lib/fissionTuning';
import type { FissionEngine } from '@/lib/fissionEngine';
import { spawnNeutronTrailSpark } from './FissionSparks';

// Separate <points> mesh sized to 4x the neutron pool: each live
// neutron renders as 4 trailing points (head + 3 tail samples) along
// the velocity vector. Pre-computed per-slot sizes and opacities
// keep the shader trivial.
//
// Trail strategy: extrapolate backward along the velocity vector by
// fixed time offsets. Neutrons travel in straight lines, so
// extrapolation matches the real path without a ring buffer.

const SLOTS_PER_NEUTRON = 4;
const TRAIL_DT = [0, 0.04, 0.08, 0.13]; // seconds back from head
const TRAIL_SIZE = [32, 22, 14, 7]; // px
const TRAIL_OPACITY = [1.0, 0.7, 0.4, 0.18];

const NEUTRON_VS = /* glsl */ `
attribute float aAge;
attribute float aSize;
attribute float aOpacity;

varying float vAge;
varying float vOpacity;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize - aAge * 4.0;
  vAge = aAge;
  vOpacity = aOpacity;
}
`;

const NEUTRON_FS = /* glsl */ `
precision mediump float;
varying float vAge;
varying float vOpacity;

uniform vec3 uColorTint;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, r);
  alpha *= (1.0 - vAge * 0.3) * vOpacity;
  gl_FragColor = vec4(uColorTint, alpha);
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
      uniforms: {
        // Default to a warm cream; useFrame updates this per frame
        // based on the engine's current neutron speed.
        uColorTint: { value: new THREE.Color(1.1, 0.95, 0.78) },
      },
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
    // Speed-tinted neutron colour: fast neutrons read whiter (high
    // energy), slow neutrons warmer (thermalised). Gives the user a
    // colour cue about what kind of projectile they fired.
    const ratio = engine.neutronSpeedRatio;
    const r = 1.1 - ratio * 0.05;
    const g = 1.0 - ratio * 0.15;
    const b = 0.95 - ratio * 0.25;
    (material.uniforms.uColorTint.value as THREE.Color).setRGB(r, g, b);

    const neutrons = engine.neutrons;
    const elapsed = engine.elapsedMs;
    for (let i = 0; i < neutrons.length; i++) {
      const n = neutrons[i];
      if (n.alive) {
        const ageMs = elapsed - n.bornAt;
        // Per-neutron lifetime: click neutrons live 8 s, cascade
        // neutrons 900 ms. Trail fade tracks each neutron's actual
        // lifespan.
        const age = Math.min(1, ageMs / n.lifeMs);
        for (let s = 0; s < SLOTS_PER_NEUTRON; s++) {
          const slot = i * SLOTS_PER_NEUTRON + s;
          const dt = TRAIL_DT[s];
          positions[slot * 3] = n.x - n.vx * dt;
          positions[slot * 3 + 1] = n.y - n.vy * dt;
          positions[slot * 3 + 2] = 0;
          ages[slot] = age;
        }
        // Drop a warm spark behind the neutron with ~40% probability
        // per frame. Combined with the 4-slot trail, the projectile
        // reads as a luminous bullet shedding sparks - highly
        // trackable across the screen.
        if (Math.random() < 0.4) {
          const speedMag = Math.hypot(n.vx, n.vy) || 0.0001;
          const back = 0.03 + Math.random() * 0.06;
          const perpScale = (Math.random() - 0.5) * 0.02;
          const px = n.x - n.vx * back + (-n.vy / speedMag) * perpScale;
          const py = n.y - n.vy * back + (n.vx / speedMag) * perpScale;
          spawnNeutronTrailSpark(px, py);
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
