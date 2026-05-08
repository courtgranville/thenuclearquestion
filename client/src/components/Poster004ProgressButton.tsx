/**
 * Poster 004 — contextual progress button.
 *
 * Visible only in DEFAULT and CARRIERS_ONLY. Label changes per
 * phase. Provides a touch-/keyboard-accessible alternative to the
 * hub-hover progression so the visualisation is reachable without
 * a pointer.
 */

import { useEffect, useState } from 'react';
import { poster004Store, type Phase } from '@/lib/poster004Store';
import { startCascade1, startCascade2 } from '@/lib/poster004Engine';

export default function Poster004ProgressButton() {
  const [phase, setPhase] = useState<Phase>(
    poster004Store.getState().phase,
  );

  useEffect(() => {
    return poster004Store.subscribe((state) => setPhase(state.phase));
  }, []);

  if (phase !== 'DEFAULT' && phase !== 'CARRIERS_ONLY') return null;

  const label =
    phase === 'DEFAULT'
      ? 'Reveal the energy system'
      : 'Show how each carrier flows to its end uses';

  const action =
    phase === 'DEFAULT' ? startCascade1 : startCascade2;

  return (
    <button
      type="button"
      onClick={action}
      aria-label={label}
      className="px-4 py-2 text-sm border border-foreground/40 rounded-sm hover:bg-foreground hover:text-background transition-colors duration-200"
      style={{ fontFamily: "'Playfair', Georgia, serif" }}
    >
      {label}
    </button>
  );
}
