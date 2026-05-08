/**
 * Poster 004 — buttons row.
 *
 * Three text-only links separated by middots:
 *   Play animation · View as poster · Reset
 *
 * Muted-foreground colour, hover ⇒ foreground, focus-visible ⇒
 * a quiet ring. No border, no background, no padding box. The
 * buttons should not compete with the diagram for attention.
 *
 * Single React subscription to phase. Visibility rules in v2:
 *   - All three visible in DEFAULT, CASCADE_HUB, POST_HUB,
 *     CASCADE_ALL, CASCADE_FOCUS.
 *   - "Play animation" hidden once every carrier has hasSeen=true
 *     AND the diagram is at rest (no active cascade) — at that
 *     point Play would do nothing visible without a Reset first.
 *
 * Court's brief: buttons are accessibility / touch / keyboard
 * fallbacks. They are visually secondary; the diagram is the
 * centre of gravity.
 */

import { useEffect, useState } from 'react';
import { CARRIER_IDS } from '@/lib/poster004Data';
import { poster004Store, type State } from '@/lib/poster004Store';
import {
  playAnimation,
  goFull,
  reset,
} from '@/lib/poster004Engine';

const buttonClass =
  'text-muted-foreground hover:text-foreground transition-colors duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm';

const buttonStyle = {
  fontFamily: "'Playfair', Georgia, serif",
  fontSize: 13,
};

function allCarriersSeen(state: State): boolean {
  for (const id of CARRIER_IDS) {
    if (!state.hasSeenCarrier[id]) return false;
  }
  return true;
}

export default function Poster004Buttons() {
  const [state, setState] = useState<State>(poster004Store.getState());

  useEffect(() => {
    return poster004Store.subscribe((s) => setState(s));
  }, []);

  const showPlay = !allCarriersSeen(state);

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1"
      style={{ ...buttonStyle, color: 'var(--muted-foreground)' }}
    >
      {showPlay && (
        <>
          <button
            type="button"
            onClick={playAnimation}
            aria-label="Play animation: reveal carriers and end-use sectors"
            className={buttonClass}
            style={buttonStyle}
          >
            Play animation
          </button>
          <span aria-hidden="true" className="text-muted-foreground/60">·</span>
        </>
      )}
      <button
        type="button"
        onClick={goFull}
        aria-label="View as poster: jump to the fully revealed diagram with no animation"
        className={buttonClass}
        style={buttonStyle}
      >
        View as poster
      </button>
      <span aria-hidden="true" className="text-muted-foreground/60">·</span>
      <button
        type="button"
        onClick={reset}
        aria-label="Reset to start: hide carriers and sectors, return to the central total"
        className={buttonClass}
        style={buttonStyle}
      >
        Reset
      </button>
    </div>
  );
}
