import { useEffect, useState } from 'react';
import { subscribeCursorWorld, type Cursor } from '@/lib/fissionCursorBus';

// DOM overlay above the canvas. Reads the cursor's world position
// from the module-level bus and renders a cream line + triangle
// glyph pointing from the cursor toward the form's centre. Because
// it lives outside the WebGL canvas, the post-fx bloom pipeline
// doesn't touch it - this fixes the "aim indicator gets bloomed
// into a featureless blob" failure mode of earlier phases.
//
// Camera zoom is hard-coded to 320 to match FissionScene's
// orthographic camera; if the zoom changes, this constant must too.

const ZOOM = 320;
const LINE_LENGTH_PX = 80;
const TIP_SIZE_PX = 14;

export default function FissionAimArrow() {
  const [cursor, setCursor] = useState<Cursor>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  useEffect(() => subscribeCursorWorld(setCursor), []);

  useEffect(() => {
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (!cursor) return null;
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)').matches
  ) {
    return null;
  }

  const cursorDist = Math.hypot(cursor.x, cursor.y);
  if (cursorDist < 0.05) return null;

  // World → screen. Camera centre is the viewport centre; world y
  // points up while screen y points down.
  const screenX = viewport.w / 2 + cursor.x * ZOOM;
  const screenY = viewport.h / 2 - cursor.y * ZOOM;

  // Angle of the line from cursor toward origin, in screen space.
  // World direction is (-x, -y); screen y flips, so screen direction
  // is (-x, +y) → atan2(y, -x).
  const dirAngle = Math.atan2(cursor.y, -cursor.x);
  const angleDeg = (dirAngle * 180) / Math.PI;

  const tipX = screenX + Math.cos(dirAngle) * LINE_LENGTH_PX;
  const tipY = screenY + Math.sin(dirAngle) * LINE_LENGTH_PX;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      aria-hidden="true"
    >
      {/* Line */}
      <div
        style={{
          position: 'absolute',
          left: `${screenX}px`,
          top: `${screenY}px`,
          width: `${LINE_LENGTH_PX}px`,
          height: '2px',
          background: 'rgba(236, 231, 223, 0.55)',
          transformOrigin: '0 50%',
          transform: `rotate(${angleDeg}deg)`,
        }}
      />
      {/* Tip - CSS triangle, rotated to match line direction */}
      <div
        style={{
          position: 'absolute',
          left: `${tipX}px`,
          top: `${tipY}px`,
          width: 0,
          height: 0,
          borderTop: `${TIP_SIZE_PX / 2}px solid transparent`,
          borderBottom: `${TIP_SIZE_PX / 2}px solid transparent`,
          borderLeft: `${TIP_SIZE_PX}px solid rgba(236, 231, 223, 0.7)`,
          transformOrigin: '0 50%',
          transform: `translateY(-${TIP_SIZE_PX / 2}px) rotate(${angleDeg}deg)`,
        }}
      />
    </div>
  );
}
