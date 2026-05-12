import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { QUALITY } from '@/lib/fissionTuning';
import { vertexShader, fragmentShader } from '@/lib/fissionShaders';
import type { FissionEngine } from '@/lib/fissionEngine';
import type { Quality } from '@/lib/fissionTuning';

type Props = {
  engine: FissionEngine;
  quality: Quality;
};

type Bundle = {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
};

// Renderer for the engine-driven cloud. Consumes the engine's typed
// arrays (positions, rests, phases, heat) directly as BufferAttributes
// - no copying. Per frame: tick the engine, flag the position + aHeat
// attributes as dirty, the shader uniforms pick up the new time.
function buildBundle(engine: FissionEngine, quality: Quality): Bundle {
  const { pointSize } = QUALITY[quality];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(engine.positions, 3));
  geometry.setAttribute('aRest', new THREE.BufferAttribute(engine.rests, 2));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(engine.phases, 1));
  geometry.setAttribute('aHeat', new THREE.BufferAttribute(engine.heat, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPointSize: { value: pointSize },
      uColorCold: { value: new THREE.Color(0xECE7DF) },
      uColorWarm: { value: new THREE.Color(0xB5822E) },
      uColorHot: { value: new THREE.Color(0xA51E22) },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return { geometry, material };
}

export default function FissionParticles({ engine, quality }: Props) {
  const bundle = useMemo<Bundle>(() => buildBundle(engine, quality), [engine, quality]);
  const pointsRef = useRef<THREE.Points>(null);

  useEffect(() => {
    return () => {
      bundle.geometry.dispose();
      bundle.material.dispose();
    };
  }, [bundle]);

  useFrame((state, dt) => {
    engine.step(dt * 1000);
    bundle.material.uniforms.uTime.value = state.clock.elapsedTime;
    bundle.geometry.attributes.position.needsUpdate = true;
    bundle.geometry.attributes.aHeat.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={bundle.geometry} material={bundle.material} />
  );
}
