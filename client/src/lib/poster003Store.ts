import { interpolate, type VizState } from './poster003Data';

/**
 * Poster 003 — minimal pub/sub store for the deaths-by-source layer.
 *
 * Sits alongside React state — does not replace it. The dot grid,
 * dendrogram, ScenarioReadout, and tickers continue to receive their
 * `vizState` through React props. Only Poster003CanvasDeaths reads
 * from this store, which lets that layer skip the React render path
 * during slider drag (the drag dispatches go through the store; the
 * canvas's RAF loop polls; SVG labels and connector lines are
 * written via refs + setAttribute, no React commits).
 *
 * No external dependencies. Plain class with a Set<Subscriber>.
 */

type Subscriber = (state: VizState) => void;

class Poster003Store {
  private currentState: VizState = interpolate(0);
  private subscribers = new Set<Subscriber>();

  getCurrent(): VizState {
    return this.currentState;
  }

  /**
   * Push a new slider fraction. Notifies subscribers synchronously;
   * subscribers are expected to either do trivially-cheap work or
   * defer heavier work to requestAnimationFrame so it aligns with
   * the canvas redraw rather than the pointer-event timing.
   */
  update(fraction: number): void {
    this.currentState = interpolate(fraction);
    this.subscribers.forEach((sub) => sub(this.currentState));
  }

  subscribe(cb: Subscriber): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }
}

export const poster003Store = new Poster003Store();
