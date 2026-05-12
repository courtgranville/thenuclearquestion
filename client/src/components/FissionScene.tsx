import { useEffect, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { TUNING, type Quality } from '@/lib/fissionTuning';
import type { FissionEngine } from '@/lib/fissionEngine';
import FissionParticles from './FissionParticles';
import FissionNeutrons from './FissionNeutrons';
import FissionCursorIndicator from './FissionCursorIndicator';
import FissionClickFlash, { spawnClickFlash } from './FissionClickFlash';
import FissionBurstRings from './FissionBurstRings';
import FissionPostFx from './FissionPostFx';

type Props = {
  engine: FissionEngine;
  quality: Quality;
};

type CursorState = { x: number; y: number } | null;

// Invisible quad behind the particles. Receives pointer events from
// the canvas and forwards them to the engine (cursor magnetism) and
// to local state (cursor indicator). Also fields clicks: each click
// spawns a neutron aimed at the nearest bound particle and a brief
// cream flash at the click point.
function CursorPlane({
  engine,
  setCursor,
}: {
  engine: FissionEngine;
  setCursor: (c: CursorState) => void;
}) {
  return (
    <mesh
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        engine.setCursor(e.point.x, e.point.y);
        setCursor({ x: e.point.x, y: e.point.y });
      }}
      onPointerOut={() => {
        engine.setCursor(null, null);
        setCursor(null);
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        const cx = e.point.x;
        const cy = e.point.y;

        const target = engine.findNearestBound(cx, cy);
        if (target === null) {
          // No bound, non-spent particle exists - everything has
          // fissioned and we're in the idle-reset window. Flash so
          // the click isn't silent.
          spawnClickFlash(cx, cy);
          return;
        }

        // Use the particle's *current* position (not rest) so a
        // recohered particle that drifted slightly still registers
        // at its visible location.
        const tx = engine.positions[target * 3];
        const ty = engine.positions[target * 3 + 1];
        const d = Math.hypot(tx - cx, ty - cy);

        if (d < TUNING.CLICK_DIRECT_RADIUS) {
          // Click landed on or near a particle - excite it directly.
          // No flying neutron; the chain starts from this particle.
          engine.exciteDirect(target);
        } else {
          // Click landed off the cloud - launch a visible neutron
          // projectile aimed at the nearest bound particle.
          const ux = (tx - cx) / (d || 0.0001);
          const uy = (ty - cy) / (d || 0.0001);
          engine.injectNeutron(
            cx,
            cy,
            ux * TUNING.NEUTRON_SPEED,
            uy * TUNING.NEUTRON_SPEED,
          );
        }
        spawnClickFlash(cx, cy);
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
  // Cursor in world coordinates. Local mirror of the engine's cursor
  // state so the visible ring can render without polling the engine.
  const [cursor, setCursor] = useState<CursorState>(null);

  return (
    <Canvas
      orthographic
      camera={{ zoom: 220, position: [0, 0, 10], near: 0.1, far: 100 }}
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
      <CursorPlane engine={engine} setCursor={setCursor} />
      <FissionParticles engine={engine} quality={quality} />
      <FissionNeutrons engine={engine} />
      <FissionCursorIndicator cursor={cursor} />
      <FissionClickFlash />
      <FissionBurstRings />
      <FissionPostFx quality={quality} />
      <TestCascadeTrigger engine={engine} />
    </Canvas>
  );
}
