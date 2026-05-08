/**
 * Poster 004 — reset button.
 *
 * Always visible. Cancels any active animation and returns the
 * visualisation to DEFAULT.
 */

import { reset } from '@/lib/poster004Engine';

export default function Poster004ResetButton() {
  return (
    <button
      type="button"
      onClick={reset}
      aria-label="Reset visualisation to start"
      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
      style={{ fontFamily: "'Playfair', Georgia, serif" }}
    >
      Reset
    </button>
  );
}
