/**
 * Poster 004 — "view static poster" button.
 *
 * Snaps the visualisation to its post-cascade resting state — full
 * carriers, full sectors, all labels, no hover, no pulses. Hidden
 * in STATIC (the action is a no-op there).
 *
 * Per Court's clarification: this dismisses the interactivity, it
 * does NOT swap in the print PDF or the processed print SVG. The
 * print PDF stays available via the existing "Download
 * full-resolution PDF" link further down the page.
 */

import { useEffect, useState } from 'react';
import { poster004Store, type Phase } from '@/lib/poster004Store';
import { goStatic } from '@/lib/poster004Engine';

export default function Poster004StaticButton() {
  const [phase, setPhase] = useState<Phase>(
    poster004Store.getState().phase,
  );

  useEffect(() => {
    return poster004Store.subscribe((state) => setPhase(state.phase));
  }, []);

  if (phase === 'STATIC') return null;

  return (
    <button
      type="button"
      onClick={goStatic}
      aria-label="View static poster — dismiss interactive animation"
      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
      style={{ fontFamily: "'Playfair', Georgia, serif" }}
    >
      View static poster
    </button>
  );
}
