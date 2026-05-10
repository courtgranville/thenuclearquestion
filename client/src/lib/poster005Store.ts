// ─────────────────────────────────────────────────────────────────
// poster005Store.ts — pub/sub store for the three Poster 005 views.
//
// Mirrors poster003Store.ts: plain TS, Set<Subscriber>, no external
// dependencies. The store holds the page's global interaction state:
//
//   - filteredStatus  one of underConstruction / operating / retired /
//                     cancelled / null. Click on a status legend
//                     button toggles. When non-null, the map circles,
//                     dendrogram leaves, and timeline bars whose
//                     status doesn't match dim to 0.1 opacity. The
//                     matched status stays full.
//
//   - hoveredReactor  canonical reactor id (matches Reactor.id and
//                     the `data-unit` attribute in every SVG). Set by
//                     any view's pointerover; cleared on pointerout.
//                     The reactor detail panel + the brushing across
//                     all three views read from this.
//
// Composition rule (per brief): hover overrides filter. A hovered
// reactor of a different status is rendered at full opacity even when
// a filter dims its category — the filter resumes when hover ends.
// Components apply this by checking
//   const visible = hoveredReactor === r.id || filteredStatus === null
//                                            || filteredStatus === r.status;
// and choosing the opacity accordingly.
//
// All three views subscribe via subscribe(); their per-frame loops
// read getCurrent() synchronously and apply opacity / transform via
// direct DOM mutation rather than React re-render.
// ─────────────────────────────────────────────────────────────────

import type { ReactorStatus } from './poster005Data';

export interface Poster005State {
  filteredStatus: ReactorStatus | null;
  hoveredReactor: string | null;
}

type Subscriber = (state: Poster005State) => void;

class Poster005Store {
  private state: Poster005State = {
    filteredStatus: null,
    hoveredReactor: null,
  };
  private subscribers = new Set<Subscriber>();

  getCurrent(): Poster005State {
    return this.state;
  }

  setFilteredStatus(status: ReactorStatus | null): void {
    if (this.state.filteredStatus === status) return;
    this.state = { ...this.state, filteredStatus: status };
    this.notify();
  }

  /** Toggle a status filter: if the same status is already filtered,
   *  clear; otherwise set. Wires up the legend's click-to-toggle UX. */
  toggleFilteredStatus(status: ReactorStatus): void {
    this.setFilteredStatus(this.state.filteredStatus === status ? null : status);
  }

  setHoveredReactor(reactorId: string | null): void {
    if (this.state.hoveredReactor === reactorId) return;
    this.state = { ...this.state, hoveredReactor: reactorId };
    this.notify();
  }

  subscribe(cb: Subscriber): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify(): void {
    this.subscribers.forEach((sub) => sub(this.state));
  }
}

export const poster005Store = new Poster005Store();
