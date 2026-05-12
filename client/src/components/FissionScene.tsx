import { useEffect, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { TUNING, type Quality } from '@/lib/fissionTuning';
import type { FissionEngine } from '@/lib/fissionEngine';
import FissionParticles from './FissionParticles';
import FissionNeutrons from './FissionNeutrons';
import FissionCursorIndicator from './FissionCursorIndicator';
import FissionClickFlash, { spawnClickFlash } from './FissionClickFlash';
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
          // No bound particle to aim at - still flash so the click is
          // not silent.
          spawnClickFlash(cx, cy);
          return;
        }

        const tx = engine.rests[target * 2];
        const ty = engine.rests[target * 2 + 1];

        const dx = tx - cx;
        const dy = ty - cy;
        const d = Math.hypot(dx, dy) || 0.0001;
        const vx = (dx / d) * TUNING.NEUTRON_SPEED;
        const vy = (dy / d) * TUNING.NEUTRON_SPEED;

        engine.injectNeutron(cx, cy, vx, vy);
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
      <FissionPostFx quality={quality} />
      <TestCascadeTrigger engine={engine} />
    </Canvas>
  );
}
