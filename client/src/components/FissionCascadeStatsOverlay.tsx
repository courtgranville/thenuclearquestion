import { useEffect, useState } from 'react';
import type { FissionEngine } from '@/lib/fissionEngine';

type Props = { engine: FissionEngine };

// Dev-only cascade statistics overlay, gated behind ?stats=1 in the
// URL (parallel to ?fps=1). Reads engine.getCascadeStats() at 4 Hz
// and renders a single line above the FPS readout. Reset of the
// counters is handled inside the engine on idle auto-reset.
export default function FissionCascadeStatsOverlay({ engine }: Props) {
  const [enabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('stats') === '1';
  });
  const [stats, setStats] = useState(() => engine.getCascadeStats());

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      setStats(engine.getCascadeStats());
    }, 250);
    return () => window.clearInterval(id);
  }, [enabled, engine]);

  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none hidden md:block absolute bottom-12 right-8 z-40 font-sans text-sm text-[#ECE7DF]/30 tabular-nums"
    >
      fired {stats.totalNeutronsFired} · hit {stats.totalHits} · fissions {stats.totalFissions} · hit-rate {(stats.hitRate * 100).toFixed(0)}%
    </div>
  );
}
