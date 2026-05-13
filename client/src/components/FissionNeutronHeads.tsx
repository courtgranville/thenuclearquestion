import { useEffect, useState } from 'react';
import type { FissionEngine } from '@/lib/fissionEngine';

type Props = { engine: FissionEngine };

// Camera zoom matches FissionScene's orthographic camera. If that
// changes, this needs to change too.
const ZOOM = 320;

// DOM overlay that renders each live neutron's head as a glowing
// HTML div above the WebGL canvas. Bypasses the bloom pipeline
// entirely, so the head reads as a clear bright dot regardless of
// how aggressive bloom is. The neutron's trail + sparks still
// render inside WebGL; this is purely the bright-point indicator
// the user tracks across the screen.
export default function FissionNeutronHeads({ engine }: Props) {
  const [, force] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      force((n) => (n + 1) % 1_000_000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (typeof window === 'undefined') return null;
  const w = window.innerWidth;
  const h = window.innerHeight;

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      {engine.neutrons.map((n, i) => {
        if (!n.alive) return null;
        const screenX = w / 2 + n.x * ZOOM;
        const screenY = h / 2 - n.y * ZOOM;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              width: '16px',
              height: '16px',
              transform: 'translate(-50%, -50%)',
              background:
                'radial-gradient(circle, rgba(255,250,240,1) 0%, rgba(255,230,190,0.85) 50%, rgba(255,210,140,0) 100%)',
              boxShadow: '0 0 10px rgba(255,240,210,0.6)',
            }}
          />
        );
      })}
    </div>
  );
}
