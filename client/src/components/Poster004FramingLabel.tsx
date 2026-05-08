/**
 * Poster 004 — framing label.
 *
 * Hint text below the diagram. Visible in DEFAULT and (optionally)
 * CARRIERS_ONLY to suggest the next step. Empty in cascade phases,
 * FULL, CARRIER_FOCUS, and STATIC.
 *
 * The label is a small piece of UI copy — it is not in posterData
 * because it's interactive scaffolding, not editorial content.
 */

import { useEffect, useState } from 'react';
import { poster004Store, type Phase } from '@/lib/poster004Store';

function labelFor(phase: Phase): string {
  if (phase === 'DEFAULT') return 'Hover the centre to begin.';
  if (phase === 'CARRIERS_ONLY')
    return 'Keep hovering the centre, or click the button below to continue.';
  return '';
}

export default function Poster004FramingLabel() {
  const [phase, setPhase] = useState<Phase>(
    poster004Store.getState().phase,
  );

  useEffect(() => {
    return poster004Store.subscribe((state) => setPhase(state.phase));
  }, []);

  const text = labelFor(phase);
  return (
    <p
      aria-live="polite"
      className="text-sm text-muted-foreground italic text-center min-h-[1.5em]"
      style={{
        fontFamily: "'Playfair', Georgia, serif",
        opacity: text ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    >
      {text || ' '}
    </p>
  );
}
