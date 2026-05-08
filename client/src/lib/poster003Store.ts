import { interpolate, type VizState } from './poster003Data';

/**
 * Poster 003 — minimal pub/sub store for the slider-driven layers.
 *
 * Drives the deaths-by-source canvas (commit 18), the dot grid,
 * the dendrogram, and the live tickers (commit 19) — none of which
 * re-render through React during slider drag. The slider in
 * Poster003Viz dispatches `update(fraction)` on every drag tick and
 * `setDragging(true/false)` on press / release; subscribers read
 * the current state synchronously from `getCurrent()` /
 * `isDragging()` and apply changes via direct DOM mutation or
 * canvas redraw.
 *
 * The dragging flag is needed alongside `vizState` because the
 * dot grid's count formula switches at snap:
 *   dragging:  greenCount = 699 − geometricTotalDeaths
 *   settled:   greenCount = anchorState.livesSaved
 * The two formulas can differ by ±1 dot at S2 (data rounding —
 * S2 totalDeaths 297 + livesSaved 401 = 698, not 699). The split
 * preserves the editorial value at snap.
 *
 * No external dependencies. Plain class with a Set<Subscriber>.
 */

type Subscriber = (state: VizState) => void;

class Poster003Store {
  private currentState: VizState = interpolate(0);
  private dragging = false;
  private subscribers = new Set<Subscriber>();

  getCurrent(): VizState {
    return this.currentState;
  }

  isDragging(): boolean {
    return this.dragging;
  }

  /**
   * Push a new slider fraction. Notifies subscribers synchronously;
   * subscribers are expected to either do trivially-cheap work or
   * defer heavier work to requestAnimationFrame so it aligns with
   * the canvas redraw rather than the pointer-event timing.
   */
  update(fraction: number): void {
    this.currentState = interpolate(fraction);
    this.notify();
  }

  /**
   * Update the press/release state. Notifies subscribers so the
   * dot grid and tickers can re-evaluate their snap-vs-geometric
   * count formula.
   */
  setDragging(d: boolean): void {
    if (this.dragging === d) return;
    this.dragging = d;
    this.notify();
  }

  subscribe(cb: Subscriber): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify(): void {
    this.subscribers.forEach((sub) => sub(this.currentState));
  }
}

export const poster003Store = new Poster003Store();
