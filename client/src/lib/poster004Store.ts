/**
 * Poster 004 — minimal pub/sub store (v2).
 *
 * Mirrors poster003Store.ts shape: plain class, Set<Subscriber>,
 * synchronous notify. The engine writes; the viz layers (Skeleton,
 * Hub, Carriers, Sectors, Pulses, HoverInstruction) subscribe and
 * apply changes via direct DOM mutation. Components do not
 * re-render through React during animations.
 *
 * State machine has five phases:
 *   - DEFAULT       only the total form is visible
 *   - CASCADE_HUB   animating: total → carriers
 *   - POST_HUB      resting: carriers visible. Per-carrier sector
 *                   visibility tracked separately via hasSeenCarrier
 *                   and per-sector scales.
 *   - CASCADE_ALL   animating: all-not-yet-seen carriers → their sectors
 *   - CASCADE_FOCUS animating: one carrier → its sectors (first-hover replay)
 *
 * focusCarrier is orthogonal to phase — set whenever a carrier is
 * being focus-hovered, regardless of whether an animation is in flight.
 *
 * Court's rule: "circles only grow once per hover per source". Once
 * a carrier's sectors have grown via any path (CASCADE_FOCUS,
 * CASCADE_ALL, or goFull), hasSeenCarrier[id] becomes true and
 * subsequent hovers of that carrier just apply the dim mask without
 * a replay. Reset clears hasSeenCarrier.
 */

import {
  CARRIERS,
  CARRIER_IDS,
  type CarrierId,
} from './poster004Data';

export type Phase =
  | 'DEFAULT'
  | 'CASCADE_HUB'
  | 'POST_HUB'
  | 'CASCADE_ALL'
  | 'CASCADE_FOCUS';

export interface Pulse {
  /** Stable id for canvas redraw bookkeeping. */
  id: string;
  /** Spoke id in the Skeleton path registry. */
  spokeId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  pathLength: number;
  /** 0..1, advanced by the engine each frame. */
  progress: number;
  colour: string;
  carrierId: CarrierId;
  /** Sector id (for CASCADE_ALL / CASCADE_FOCUS) or null (for CASCADE_HUB). */
  sectorId: string | null;
}

export interface State {
  phase: Phase;
  focusCarrier: CarrierId | null;
  hasSeenCarrier: Record<CarrierId, boolean>;

  hubPulseScale: number;
  carrierScales: Record<CarrierId, number>;
  carrierPulseScales: Record<CarrierId, number>;
  sectorScales: Record<string, number>;

  activePulses: Pulse[];

  /** True in DEFAULT (after the 800ms fade-in delay), false thereafter. */
  hoverInstructionVisible: boolean;
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
    focusCarrier: null,
    hasSeenCarrier: emptyCarrierMap(false),

    hubPulseScale: 1,
    carrierScales: emptyCarrierMap(0),
    carrierPulseScales: emptyCarrierMap(1),
    sectorScales: emptySectorScales(),

    activePulses: [],
    hoverInstructionVisible: false,
  };
}

type Subscriber = (state: State) => void;

class Poster004Store {
  private state: State = makeInitialState();
  private subscribers = new Set<Subscriber>();

  getState(): State {
    return this.state;
  }

  // ─────────────────────────────────────────────────────────────────
  // Setters — the engine calls multiple per RAF tick, then notify()
  // once. Callers are responsible for calling notify() — the setters
  // mutate in place without notifying.
  // ─────────────────────────────────────────────────────────────────

  setPhase(phase: Phase): void {
    this.state.phase = phase;
  }

  setFocusCarrier(id: CarrierId | null): void {
    this.state.focusCarrier = id;
  }

  markSeen(id: CarrierId): void {
    this.state.hasSeenCarrier[id] = true;
  }

  setHubPulseScale(scale: number): void {
    this.state.hubPulseScale = scale;
  }

  setCarrierScale(id: CarrierId, scale: number): void {
    this.state.carrierScales[id] = scale;
  }

  setCarrierPulseScale(id: CarrierId, scale: number): void {
    this.state.carrierPulseScales[id] = scale;
  }

  setSectorScale(sectorId: string, scale: number): void {
    this.state.sectorScales[sectorId] = scale;
  }

  setActivePulses(pulses: Pulse[]): void {
    this.state.activePulses = pulses;
  }

  setHoverInstructionVisible(v: boolean): void {
    this.state.hoverInstructionVisible = v;
  }

  /** Reset to DEFAULT. Used by the Reset button and on Viz unmount. */
  resetAll(): void {
    this.state = makeInitialState();
    this.notify();
  }

  /** Snap to fully-revealed state. Used by "View as poster". */
  snapToFull(): void {
    this.state.phase = 'POST_HUB';
    this.state.focusCarrier = null;
    this.state.hubPulseScale = 1;
    this.state.activePulses = [];
    this.state.hoverInstructionVisible = false;
    for (const c of CARRIERS) {
      this.state.hasSeenCarrier[c.id] = true;
      this.state.carrierScales[c.id] = 1;
      this.state.carrierPulseScales[c.id] = 1;
      for (const s of c.sectors) {
        this.state.sectorScales[s.id] = 1;
      }
    }
    this.notify();
  }

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
