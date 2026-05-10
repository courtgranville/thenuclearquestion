// Poster 005 — pub/sub store for the three sub-views.
//
// State split, mirroring the poster003Store / poster004Engine
// pattern: this store carries the structural state (year, focused
// status / reactor / site, hasSeen flag). Per-frame animation
// values (form-motion phase, pulse progress, leaf-scale tween
// progress) live in component refs and are not stored here.
//
// Subscribers register via subscribe(); on every state change the
// store synchronously notifies all subscribers, which then update
// DOM via setAttribute or trigger a canvas redraw on the next RAF
// — the React tree is NOT re-rendered.

import type { ReactorStatus } from '@/assets/poster005';

export interface Poster005State {
  /** Year shown by the timeline scrubber. Default 2026. */
  year: number;
  /** Status currently focused on the dendrogram, null when none. */
  focusStatus: ReactorStatus | null;
  /** Reactor currently focused (e.g. via cluster-inset hover). */
  focusReactor: string | null;
  /** Site currently focused (cluster expansion). */
  focusSite: string | null;
  /** True after the user's first interaction. */
  hasSeen: boolean;
}

type Subscriber = (state: Poster005State) => void;

const INITIAL: Poster005State = {
  year: 2026,
  focusStatus: null,
  focusReactor: null,
  focusSite: null,
  hasSeen: false,
};

class Poster005Store {
  private state: Poster005State = { ...INITIAL };
  private subscribers = new Set<Subscriber>();
  private rafScheduled = false;

  getCurrent(): Poster005State {
    return this.state;
  }

  setYear(year: number): void {
    if (this.state.year === year) return;
    this.state = { ...this.state, year, hasSeen: true };
    this.scheduleNotify();
  }

  setFocusStatus(s: ReactorStatus | null): void {
    if (this.state.focusStatus === s) return;
    this.state = { ...this.state, focusStatus: s, hasSeen: true };
    this.notify();
  }

  setFocusReactor(r: string | null): void {
    if (this.state.focusReactor === r) return;
    this.state = { ...this.state, focusReactor: r, hasSeen: true };
    this.notify();
  }

  setFocusSite(s: string | null): void {
    if (this.state.focusSite === s) return;
    this.state = { ...this.state, focusSite: s, hasSeen: true };
    this.notify();
  }

  /** Clear focusStatus, focusReactor, focusSite (year unchanged). */
  clearFocus(): void {
    if (
      this.state.focusStatus === null &&
      this.state.focusReactor === null &&
      this.state.focusSite === null
    ) return;
    this.state = {
      ...this.state,
      focusStatus: null,
      focusReactor: null,
      focusSite: null,
    };
    this.notify();
  }

  /** Reset to initial (rare — used by tests / dev). */
  reset(): void {
    this.state = { ...INITIAL };
    this.notify();
  }

  subscribe(cb: Subscriber): () => void {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }

  /**
   * For high-frequency state (year scrub during drag), coalesce
   * notifications into the next RAF so subscribers only do work
   * once per frame regardless of pointer-event firing rate.
   */
  private scheduleNotify(): void {
    if (this.rafScheduled) return;
    this.rafScheduled = true;
    requestAnimationFrame(() => {
      this.rafScheduled = false;
      this.notify();
    });
  }

  private notify(): void {
    this.subscribers.forEach((sub) => sub(this.state));
  }
}

export const poster005Store = new Poster005Store();
