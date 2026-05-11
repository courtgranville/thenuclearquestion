import type { Quality } from './FissionQualityGate';

type Props = {
  quality: Quality;
};

// Phase 2 placeholder. Phase 3 replaces this with the R3F Canvas
// rendering the breathing particle cloud. We intentionally avoid
// importing three / @react-three/fiber here so the route bundle stays
// small until Phase 3 actually pulls them in.
export default function FissionScene(_props: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A] text-[#ECE7DF]/40">
      <p className="font-serif text-lg italic">
        Scene mounts here in Phase 3
      </p>
    </div>
  );
}
