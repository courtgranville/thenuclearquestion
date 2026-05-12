import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Quality } from '@/lib/fissionTuning';
import type { FissionEngine } from '@/lib/fissionEngine';
import FissionParticles from './FissionParticles';
import FissionPostFx from './FissionPostFx';

type Props = {
  engine: FissionEngine;
  quality: Quality;
};

// Invisible quad behind the particles. Receives pointer events from
// the canvas and forwards cursor coordinates to the engine. Lives in
// world space; e.point.x/y is the cursor in normalised world units.
// Will also be the click target for Phase 7's neutron spawning.
function CursorPlane({ engine }: { engine: FissionEngine }) {
  return (
    <mesh
      onPointerMove={(e) => engine.setCursor(e.point.x, e.point.y)}
      onPointerOut={() => engine.setCursor(null, null)}
      position={[0, 0, -0.1]}
    >
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// Phase 6 dev scaffolding. Visiting /fission?test=cascade triggers
// a programmatic cascade 1 s after mount so the engine can be tuned
// without needing click-to-spawn (Phase 7).
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
      <CursorPlane engine={engine} />
      <FissionParticles engine={engine} quality={quality} />
      <FissionPostFx quality={quality} />
      <TestCascadeTrigger engine={engine} />
    </Canvas>
  );
}
