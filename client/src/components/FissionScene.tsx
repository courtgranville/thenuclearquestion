import { useEffect } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { type Quality } from '@/lib/fissionTuning';
import type { FissionEngine } from '@/lib/fissionEngine';
import { setCursorWorld } from '@/lib/fissionCursorBus';
import FissionParticles from './FissionParticles';
import FissionNeutrons from './FissionNeutrons';
import FissionFlash, { spawnFlash } from './FissionFlash';
import FissionPostFx from './FissionPostFx';

type Props = {
  engine: FissionEngine;
  quality: Quality;
};

// Invisible quad behind the particles. Tracks pointer movement so the
// aim arrow follows the cursor. On click, computes which screen edge
// the click points away from and fires a neutron from that edge
// inward toward the form's centre.
function CursorPlane({ engine }: { engine: FissionEngine }) {
  return (
    <mesh
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        engine.setCursor(e.point.x, e.point.y);
        setCursorWorld({ x: e.point.x, y: e.point.y });
      }}
      onPointerOut={() => {
        engine.setCursor(null, null);
        setCursorWorld(null);
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        const cx = e.point.x;
        const cy = e.point.y;
        const cursorDist = Math.hypot(cx, cy);
        // Direction is undefined when clicking at the form's centre;
        // silently ignore.
        if (cursorDist < 0.02) return;

        // Compute the viewport bounds in world units from the ortho
        // camera. The neutron will spawn just outside whichever edge
        // is on the far side of the cursor from origin.
        const cam = e.camera as THREE.OrthographicCamera;
        const halfW = (cam.right - cam.left) / 2 / cam.zoom;
        const halfH = (cam.top - cam.bottom) / 2 / cam.zoom;

        // Ray from origin through cursor, normalised. Find the t where
        // that ray crosses the nearest viewport edge.
        const rayDx = cx / cursorDist;
        const rayDy = cy / cursorDist;
        const margin = 0.3; // spawn just offscreen so the appearance reads as "from the edge"
        const tX =
          rayDx > 0
            ? (halfW + margin - cx) / rayDx
            : rayDx < 0
            ? (-halfW - margin - cx) / rayDx
            : Infinity;
        const tY =
          rayDy > 0
            ? (halfH + margin - cy) / rayDy
            : rayDy < 0
            ? (-halfH - margin - cy) / rayDy
            : Infinity;
        const t = Math.min(tX, tY);

        const sourceX = cx + t * rayDx;
        const sourceY = cy + t * rayDy;

        // Aim straight at origin.
        const sourceDist = Math.hypot(sourceX, sourceY) || 0.0001;
        const speed = engine.currentNeutronSpeed;
        const vx = (-sourceX / sourceDist) * speed;
        const vy = (-sourceY / sourceDist) * speed;

        engine.injectNeutron(sourceX, sourceY, vx, vy);
        // Flash at the cursor (where the user's attention is), not at
        // the offscreen spawn point.
        spawnFlash(cx, cy, 'click');
      }}
      position={[0, 0, -0.1]}
    >
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// Phase 6 dev scaffolding. Visiting /fission?test=cascade triggers
// a programmatic cascade 1 s after mount so the engine can be tuned
// without needing click-to-spawn.
function TestCascadeTrigger({ engine }: { engine: FissionEngine }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('test') !== 'cascade') return;
    const id = window.setTimeout(() => engine.triggerTestCascade(), 1000);
    return () => window.clearTimeout(id);
  }, [engine]);
  return null;
}

export default function FissionScene({ engine, quality }: Props) {
  return (
    <Canvas
      orthographic
      camera={{ zoom: 320, position: [0, 0, 10], near: 0.1, far: 100 }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      }}
      dpr={[1, quality === 'high' ? 2 : 1.5]}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#0A0A0A']} />
      <CursorPlane engine={engine} />
      <FissionParticles engine={engine} quality={quality} />
      <FissionNeutrons engine={engine} />
      <FissionFlash />
      <FissionPostFx quality={quality} />
      <TestCascadeTrigger engine={engine} />
    </Canvas>
  );
}
