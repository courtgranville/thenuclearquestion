import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';

type FlashKind = 'click' | 'fission';

type Flash = {
  id: number;
  x: number;
  y: number;
  bornAt: number;
  kind: FlashKind;
};

// Module-level state - intentionally simple imperative API so the
// click handler and engine can fire-and-forget without prop drilling.
let flashId = 0;
const flashes: Flash[] = [];

export function spawnFlash(x: number, y: number, kind: FlashKind = 'click'): void {
  flashes.push({ id: ++flashId, x, y, bornAt: performance.now(), kind });
}

// Kind-dependent parameters. Both flashes are soft additive cream
// discs that fade as they grow - no rings, no outlines, no vector
// clipart. Fission flashes are slightly larger and shorter-lived,
// click flashes a hair smaller and longer-lived so the user clearly
// reads "I did this" before the cascade visuals kick in.
const FLASH_PARAMS: Record<
  FlashKind,
  { radius: number; durationMs: number; opacityStart: number; scaleEnd: number }
> = {
  click: { radius: 0.05, durationMs: 600, opacityStart: 1.0, scaleEnd: 1.6 },
  fission: { radius: 0.08, durationMs: 500, opacityStart: 1.0, scaleEnd: 2.0 },
};

export default function FissionFlash() {
  const [, force] = useState(0);
  const meshRefs = useRef(new Map<number, THREE.Mesh>());

  useFrame(() => {
    const now = performance.now();
    let removed = false;
    for (let i = flashes.length - 1; i >= 0; i--) {
      const params = FLASH_PARAMS[flashes[i].kind];
      const age = now - flashes[i].bornAt;
      if (age > params.durationMs) {
        flashes.splice(i, 1);
        removed = true;
      }
    }
    if (removed) force((n) => n + 1);
    if (flashes.length > meshRefs.current.size) force((n) => n + 1);

    for (const f of flashes) {
      const mesh = meshRefs.current.get(f.id);
      if (!mesh) continue;
      const params = FLASH_PARAMS[f.kind];
      const age = now - f.bornAt;
      const t = age / params.durationMs;
      const opacity = params.opacityStart * (1 - t);
      // Geometry is a unit-radius circle; scale carries both the
      // base radius and the growth-over-time factor.
      const scale = params.radius * (1 + t * (params.scaleEnd - 1));
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
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial
            color="#ECE7DF"
            transparent
            opacity={FLASH_PARAMS[f.kind].opacityStart}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}
