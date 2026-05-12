// Module-level pub/sub for the cursor's world-space position. The
// cursor originates from a pointer event on the invisible canvas
// plane (deep inside the Canvas tree) but the aim-arrow indicator
// lives as a DOM overlay at the page level (outside the Canvas, so
// it doesn't get bloomed). Threading state across that boundary via
// React props is awkward and causes a Fission-wide re-render on
// every pointer move. This module-level bus avoids both problems.

export type Cursor = { x: number; y: number } | null;

let current: Cursor = null;
const listeners = new Set<(c: Cursor) => void>();

export function setCursorWorld(c: Cursor): void {
  if (
    (current === null && c === null) ||
    (current !== null &&
      c !== null &&
      current.x === c.x &&
      current.y === c.y)
  ) {
    return;
  }
  current = c;
  listeners.forEach((l) => l(c));
}

export function subscribeCursorWorld(l: (c: Cursor) => void): () => void {
  listeners.add(l);
  l(current);
  return () => {
    listeners.delete(l);
  };
}

export function getCursorWorld(): Cursor {
  return current;
}
