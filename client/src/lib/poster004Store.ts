/**
 * Poster 004 — minimal pub/sub store for the dendrogram cascade.
 *
 * Mirrors the shape of `poster003Store.ts`: plain class, Set of
 * subscribers, synchronous notify. Holds all animation state that
 * the engine writes and the viz layers (Hub, Carriers, Sectors,
 * Pulses) read. Layers subscribe and apply changes via direct DOM
 * mutation / canvas redraw — they do NOT re-render through React
 * during animations.
 *
 * Only the Viz assembly component, ProgressButton, and FramingLabel
 * commit React updates on phase transitions. Everything else is
 * imperative.
 */

import {
  CARRIERS,
  CARRIER_IDS,
  type CarrierId,
} from './poster004Data';

export type Phase =
  | 'DEFAULT'
  | 'CASCADE_1'
  | 'CARRIERS_ONLY'
  | 'CASCADE_2'
  | 'FULL'
  | 'CARRIER_FOCUS'
  | 'STATIC';

export interface Pulse {
  /** Stable id for canvas redraw bookkeeping. */
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Path length in px (for now, straight-line; commit 3 may swap to SVG path). */
  pathLength: number;
  /** 0..1, advanced per frame at constant px/ms speed. */
  progress: number;
  colour: string;
  carrierId: CarrierId;
}

export interface State {
  phase: Phase;
  hoveredCarrier: CarrierId | null;
  hasSeenCarrier: Record<CarrierId, boolean>;

  hubPulseScale: number;
  carrierPulseScales: Record<CarrierId, number>;
  carrierScales: Record<CarrierId, number>;
  sectorScales: Record<string, number>;

  activePulses: Pulse[];
}

function emptyCarrierMap<T>(value: T): Record<CarrierId, T> {
  const out = {} as Record<CarrierId, T>;
  for (const id of CARRIER_IDS) out[id] = value;
  return out;
}

function emptySectorScales(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of CARRIERS) {
    for (const s of c.sectors) out[s.id] = 0;
  }
  return out;
}

function makeInitialState(): State {
  return {
    phase: 'DEFAULT',
    hoveredCarrier: null,
    hasSeenCarrier: emptyCarrierMap(false),

    hubPulseScale: 1,
    carrierPulseScales: emptyCarrierMap(1),
    carrierScales: emptyCarrierMap(0),
    sectorScales: emptySectorScales(),

    activePulses: [],
  };
}

type Subscriber = (state: State) => void;

class Poster004Store {
  private state: State = makeInitialState();
  private subscribers = new Set<Subscriber>();

  getState(): State {
    return this.state;
  }

  /**
   * Apply a partial update and notify subscribers synchronously.
   * The engine is the only writer; viz layers are read-only.
   */
  setState(partial: Partial<State>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  /**
   * Mutate a single carrier's scale without rebuilding the whole map.
   * Frequent during cascades; avoids object allocation per frame.
   */
  setCarrierScale(id: CarrierId, scale: number): void {
    this.state.carrierScales[id] = scale;
    // No notify here — the engine's per-frame notify() collects the
    // result of all per-frame mutations.
  }

  setCarrierPulseScale(id: CarrierId, scale: number): void {
    this.state.carrierPulseScales[id] = scale;
  }

  setSectorScale(sectorId: string, scale: number): void {
    this.state.sectorScales[sectorId] = scale;
  }

  setHubPulseScale(scale: number): void {
    this.state.hubPulseScale = scale;
  }

  setActivePulses(pulses: Pulse[]): void {
    this.state.activePulses = pulses;
  }

  setPhase(phase: Phase): void {
    this.state.phase = phase;
  }

  setHoveredCarrier(id: CarrierId | null): void {
    this.state.hoveredCarrier = id;
  }

  markSeen(id: CarrierId): void {
    this.state.hasSeenCarrier[id] = true;
  }

  /** Reset to DEFAULT state, used by the Reset button. */
  resetAll(): void {
    this.state = makeInitialState();
    this.notify();
  }

  /** Notify all subscribers of the current state. Called per frame
   *  during cascades and on every phase transition. */
  notify(): void {
    this.subscribers.forEach((cb) => cb(this.state));
  }

  subscribe(cb: Subscriber): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }
}

export const poster004Store = new Poster004Store();
