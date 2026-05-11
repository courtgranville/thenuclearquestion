import { useEffect, useState } from 'react';

// Dev-only FPS readout for Phase 6 tuning. Gated behind ?fps=1 in the
// URL so it never appears in normal use. Reads RAF callback frequency
// over a rolling 1-second window and refreshes the displayed number 4
// times per second - readable, not flickering.
//
// Hidden on viewports < md to keep the mobile room clean. The overlay
// itself is cheap (one setState per 250ms) and does not measurably
// affect the FPS it reports.
export default function FissionFpsOverlay() {
  const [fps, setFps] = useState<number | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('fps') !== '1') return;
    setActive(true);

    const frameTimes: number[] = [];
    let lastUpdate = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      frameTimes.push(now);
      // Drop samples older than 1 second so the count is always
      // frames-per-last-second.
      while (frameTimes.length > 0 && frameTimes[0] < now - 1000) {
        frameTimes.shift();
      }
      if (now - lastUpdate >= 250) {
        setFps(frameTimes.length);
        lastUpdate = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (!active) return null;

  return (
    <div className="pointer-events-none hidden md:block absolute bottom-2 right-8 z-40 font-sans text-sm text-[#ECE7DF]/30 tabular-nums">
      {fps === null ? '— fps' : `${fps} fps`}
    </div>
  );
}
