import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';

type Flash = { id: number; x: number; y: number; bornAt: number };

// Module-level state - intentionally simple imperative API so the
// click handler in CursorPlane can fire-and-forget without prop
// drilling. Flashes are short-lived (250 ms) so the array never
// grows; per-click the click handler pushes one entry, the useFrame
// in FissionClickFlash drains entries older than 250 ms.
let flashId = 0;
const flashes: Flash[] = [];

export function spawnClickFlash(x: number, y: number): void {
  flashes.push({ id: ++flashId, x, y, bornAt: performance.now() });
}

const FLASH_LIFETIME_MS = 250;

export default function FissionClickFlash() {
  // Force a render whenever the flash list changes (e.g. on spawn or
  // expire). The list itself isn't React state - it's module-scoped -
  // so we use a counter as the actual state.
  const [, force] = useState(0);
  const meshRefs = useRef(new Map<number, THREE.Mesh>());

  useFrame(() => {
    const now = performance.now();
    let removed = false;
    for (let i = flashes.length - 1; i >= 0; i--) {
      const age = now - flashes[i].bornAt;
      if (age > FLASH_LIFETIME_MS) {
        flashes.splice(i, 1);
        removed = true;
      }
    }
    if (removed) force((n) => n + 1);

    // If a new flash was pushed since the last render, trigger one
    // too. The cheap path: check if there are more flashes than known
    // mesh refs.
    if (flashes.length > meshRefs.current.size) {
      force((n) => n + 1);
    }

    // Tween opacity + scale on existing flashes.
    for (const f of flashes) {
      const mesh = meshRefs.current.get(f.id);
      if (!mesh) continue;
      const age = now - f.bornAt;
      const t = age / FLASH_LIFETIME_MS;
      const opacity = 0.6 * (1 - t);
      const scale = 1 + t * 0.6;
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      mesh.scale.setScalar(scale);
    }
  });

  return (
    <>
      {flashes.map((f) => (
        <mesh
          key={f.id}
          position={[f.x, f.y, 0.01]}
          ref={(m) => {
            if (m) meshRefs.current.set(f.id, m);
            else meshRefs.current.delete(f.id);
          }}
        >
          <circleGeometry args={[0.02, 32]} />
          <meshBasicMaterial
            color="#ECE7DF"
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}
