import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';

type Ring = { id: number; x: number; y: number; bornAt: number };

// Module-level state, same pattern as FissionClickFlash. Engine
// imports spawnBurstRing and calls it at the moment of each fission;
// the renderer drains the array. Small coupling between engine and
// render, but the alternative (event emitter on the engine, scene
// subscribes) is more machinery for no real win.
let ringId = 0;
const rings: Ring[] = [];

export function spawnBurstRing(x: number, y: number): void {
  rings.push({ id: ++ringId, x, y, bornAt: performance.now() });
}

const RING_LIFETIME_MS = 500;
// Final scale factor at end of life. The base ringGeometry sits at
// (innerR 0.005, outerR 0.007); at MAX_SCALE this becomes
// (innerR 0.05, outerR 0.07), matching the brief's expanding-ring
// punctuation at the moment of fission.
const MAX_SCALE = 10;

export default function FissionBurstRings() {
  // Force a re-render when the rings list changes. The list itself
  // is module-scoped, not React state.
  const [, force] = useState(0);
  const meshRefs = useRef(new Map<number, THREE.Mesh>());

  useFrame(() => {
    const now = performance.now();
    let removed = false;
    for (let i = rings.length - 1; i >= 0; i--) {
      const age = now - rings[i].bornAt;
      if (age > RING_LIFETIME_MS) {
        rings.splice(i, 1);
        removed = true;
      }
    }
    if (removed) force((n) => n + 1);

    if (rings.length > meshRefs.current.size) {
      force((n) => n + 1);
    }

    for (const r of rings) {
      const mesh = meshRefs.current.get(r.id);
      if (!mesh) continue;
      const age = now - r.bornAt;
      const t = age / RING_LIFETIME_MS;
      const opacity = 0.7 * (1 - t);
      // Ease-out scale: grows fast initially, slows toward MAX_SCALE.
      const eased = 1 - Math.pow(1 - t, 2);
      const scale = 1 + eased * (MAX_SCALE - 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      mesh.scale.setScalar(scale);
    }
  });

  return (
    <>
      {rings.map((r) => (
        <mesh
          key={r.id}
          position={[r.x, r.y, 0.02]}
          ref={(m) => {
            if (m) meshRefs.current.set(r.id, m);
            else meshRefs.current.delete(r.id);
          }}
        >
          <ringGeometry args={[0.005, 0.007, 32]} />
          <meshBasicMaterial
            color="#ECE7DF"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}
