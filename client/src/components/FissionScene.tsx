import { Canvas } from '@react-three/fiber';
import type { Quality } from '@/lib/fissionTuning';
import FissionParticles from './FissionParticles';
import FissionPostFx from './FissionPostFx';

type Props = {
  quality: Quality;
};

export default function FissionScene({ quality }: Props) {
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
      <FissionParticles quality={quality} />
      <FissionPostFx quality={quality} />
    </Canvas>
  );
}
