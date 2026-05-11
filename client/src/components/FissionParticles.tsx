import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { QUALITY, type Quality } from '@/lib/fissionTuning';
import { vertexShader, fragmentShader } from '@/lib/fissionShaders';

type Props = {
  quality: Quality;
};

type FormPoints = {
  count: number;
  boundingRadius: number;
  viewBox: {
    width: number;
    height: number;
    centroid: { x: number; y: number };
    boundingRadiusInViewBox: number;
  };
  positions: number[];
};

type Bundle = {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  positions: Float32Array;
  rests: Float32Array;
  phases: Float32Array;
  effectiveCount: number;
};

function buildBundle(quality: Quality, formPoints: FormPoints): Bundle {
  const baseCount = formPoints.count;
  const sourcePositions = formPoints.positions;
  const { particleScale, pointSize } = QUALITY[quality];
  const effectiveCount = Math.max(1, Math.floor(baseCount * particleScale));

  const positions = new Float32Array(effectiveCount * 3);
  const rests = new Float32Array(effectiveCount * 2);
  const phases = new Float32Array(effectiveCount);
  const states = new Float32Array(effectiveCount);

  // Even-stride sampling. srcIdx walks the source array uniformly so
  // thinning preserves the outline rather than removing a contiguous
  // chunk and leaving bald patches.
  for (let i = 0; i < effectiveCount; i++) {
    const srcIdx = Math.floor((i * baseCount) / effectiveCount);
    const x = sourcePositions[srcIdx * 2];
    const y = sourcePositions[srcIdx * 2 + 1];

    rests[i * 2] = x;
    rests[i * 2 + 1] = y;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = 0;

    phases[i] = Math.random() * Math.PI * 2;
    states[i] = 0; // bound
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aRest', new THREE.BufferAttribute(rests, 2));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aState', new THREE.BufferAttribute(states, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uPointSize: { value: pointSize },
      uColorBound: { value: new THREE.Color(0xECE7DF) },
      uColorExcited: { value: new THREE.Color(0xa51e22) },
      uColorCold: { value: new THREE.Color(0x4a6e70) },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return { geometry, material, positions, rests, phases, effectiveCount };
}

export default function FissionParticles({ quality }: Props) {
  // The form JSON is the heaviest single asset in this route (~780 kB
  // raw). Dynamic-import it so it lands in its own chunk alongside
  // Three.js, keeping the main bundle free of it.
  const [formPoints, setFormPoints] = useState<FormPoints | null>(null);
  useEffect(() => {
    let cancelled = false;
    import('@/assets/fission-form-points.json').then((m) => {
      if (cancelled) return;
      // Vite returns { default: <json> } for JSON modules.
      setFormPoints((m.default ?? m) as FormPoints);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const bundle = useMemo<Bundle | null>(() => {
    if (!formPoints) return null;
    return buildBundle(quality, formPoints);
  }, [quality, formPoints]);

  const pointsRef = useRef<THREE.Points>(null);

  // Dispose Three.js resources on unmount or when the bundle is
  // replaced. R3F disposes JSX-attached objects on unmount, but the
  // geometry and material here are imperatively constructed; explicit
  // cleanup prevents GPU leaks on quality switches and route exits.
  useEffect(() => {
    if (!bundle) return;
    return () => {
      bundle.geometry.dispose();
      bundle.material.dispose();
    };
  }, [bundle]);

  // CPU-side breathing. Two octaves of low-frequency sin/cos around
  // each particle's rest position. Amplitude ~0.4% of form radius -
  // legibly alive, not vibrating. If Phase 6 moves physics to GPGPU,
  // this entire loop disappears in favour of a compute pass.
  useFrame((state) => {
    if (!bundle) return;
    const t = state.clock.elapsedTime;
    bundle.material.uniforms.uTime.value = t;

    const { positions, rests, phases, effectiveCount } = bundle;
    for (let i = 0; i < effectiveCount; i++) {
      const phase = phases[i];
      const dx =
        Math.sin(t * 0.6 + phase) * 0.003 +
        Math.sin(t * 1.4 + phase * 2.1) * 0.001;
      const dy =
        Math.cos(t * 0.5 + phase * 1.3) * 0.003 +
        Math.cos(t * 1.3 + phase * 0.7) * 0.001;

      positions[i * 3] = rests[i * 2] + dx;
      positions[i * 3 + 1] = rests[i * 2 + 1] + dy;
      // z stays 0; no need to write.
    }
    bundle.geometry.attributes.position.needsUpdate = true;
  });

  if (!bundle) return null;

  return (
    <points ref={pointsRef} geometry={bundle.geometry} material={bundle.material} />
  );
}
