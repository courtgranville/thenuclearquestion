import * as THREE from 'three';
import { TUNING } from '@/lib/fissionTuning';

type Props = { cursor: { x: number; y: number } | null };

// Faint cream ring at the cursor's world position, sized to the
// cursor magnetism radius so the user can see exactly what they're
// pushing. Opacity 0.18 keeps it as a presence rather than a hard
// pointer. Hidden on touch devices: the indicator is only meaningful
// when there's an actual mouse cursor following it.
export default function FissionCursorIndicator({ cursor }: Props) {
  if (!cursor) return null;
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)').matches
  ) {
    return null;
  }
  return (
    <mesh position={[cursor.x, cursor.y, 0]} renderOrder={-1}>
      <ringGeometry args={[TUNING.CURSOR_RADIUS - 0.01, TUNING.CURSOR_RADIUS, 64]} />
      <meshBasicMaterial
        color="#ECE7DF"
        transparent
        opacity={0.18}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
