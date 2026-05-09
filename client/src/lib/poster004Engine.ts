// Poster 004 animation engine.
//
// Stateless module functions that mutate an AnimState in place. The
// component owns one AnimState in animRef.current and calls
// tickAnimation each frame; the engine schedules its own internal
// chain of cascade events via the .scheduled queue.
//
// Reduced motion: every entrypoint checks anim.reduced (set at
// makeInitialAnimState time from prefers-reduced-motion) and collapses
// to a single 200 ms opacity fade with no chained timings or pulses.

import linksData from '@/assets/poster-004-forms.json';
import { CARRIER_IDS, type CarrierId } from './poster004State';

// ─── Timing & visual constants ───────────────────────────────────
export const HUB_PHYSICAL_PULSE_MS    = 240;
export const CARRIER_PHYSICAL_PULSE_MS = 240;
export const HUB_PULSE_PEAK_SCALE     = 1.15;
export const CARRIER_PULSE_PEAK_SCALE = 1.12;
export const PULSE_LAUNCH_AT_MS       = 120;
export const PULSE_TRAVEL_SPEED_PX_PER_MS = 0.32;
export const ABSORB_BLIP_MS           = 220;
export const ABSORB_BLIP_PEAK_SCALE   = 1.15;
export const LABEL_FADE_MS            = 200;
export const OPACITY_CROSSFADE_MS     = 200;
export const HOVER_DEBOUNCE_MS        = 300;
export const DIM_OPACITY              = 0.05;
export const INSTRUCTION_FADE_IN_DELAY_MS = 800;
export const INSTRUCTION_FADE_IN_MS   = 200;

// Reduced-motion cascades collapse to a single 200 ms fade.
const REDUCED_FADE_MS = 200;

// Pulse render constants (used by the component, exported here for
// co-location with timing).
export const PULSE_TAIL_PX            = 14;
export const PULSE_HEAD_RADIUS        = 4;
export const PULSE_HALO_RADIUS        = 7;
export const PULSE_HALO_ALPHA         = 0.25;
export const PULSE_STROKE_ALPHA       = 0.85;
export const PULSE_STROKE_WIDTH       = 3.5;

export const CARRIER_COLOURS: Record<CarrierId, string> = {
  petroleum:   '#a51e22',
  naturalGas:  '#1c3867',
  electricity: '#b5822e',
  bioenergy:   '#217b3d',
  heat:        '#4a6e70',
  solidFuel:   '#7d736a',
};

// ─── Link metadata (parsed once at module load) ──────────────────

interface RawHubLink   { carrier: string; d: string }
interface RawSectorLink { carrier: string; sectorId: string; d: string }

export interface Link {
  id: string;            // 'hub-<carrier>' or sector id
  d: string;
  carrier: CarrierId;
  sectorId: string | null;
}

const data = linksData as unknown as {
  links: {
    hub_to_carrier: RawHubLink[];
    carrier_to_sector: RawSectorLink[];
  };
  sectors: Array<{ id: string; carrier: string }>;
};

export const HUB_LINKS: Link[] = data.links.hub_to_carrier.map((l) => ({
  id: `hub-${l.carrier}`,
  d: l.d,
  carrier: l.carrier as CarrierId,
  sectorId: null,
}));

export const SECTOR_LINKS: Link[] = data.links.carrier_to_sector.map((l) => ({
  id: l.sectorId,
  d: l.d,
  carrier: l.carrier as CarrierId,
  sectorId: l.sectorId,
}));

const SECTOR_LINKS_BY_CARRIER: Record<CarrierId, Link[]> = {
  petroleum: [], naturalGas: [], electricity: [],
  bioenergy: [], heat: [], solidFuel: [],
};
for (const l of SECTOR_LINKS) SECTOR_LINKS_BY_CARRIER[l.carrier].push(l);

const ALL_SECTOR_IDS: string[] = data.sectors.map((s) => s.id);
const ALL_CONNECTOR_IDS: string[] = [
  ...HUB_LINKS.map((l) => l.id),
  ...SECTOR_LINKS.map((l) => l.id),
];

// ─── AnimState ───────────────────────────────────────────────────

export interface PulseInFlight {
  id: string;
  pathId: string;        // matches Link.id; component looks up SVG <path>
  carrier: CarrierId;
  sectorId: string | null;
  startTime: number;
  duration: number;
  color: string;
  progress: number;      // 0..1, written by tickAnimation
  focusReplay: boolean;  // sector pulses fired during CARRIER_FOCUS use
                         // an absorb-blip instead of a snap-in
}

interface PhysicalPulse {
  startTime: number;
  duration: number;
  peakScale: number;
}

interface BlipState {
  startTime: number;
  duration: number;
}

interface OpacityTween {
  startTime: number;
  duration: number;
  from: number;
  to: number;
}

interface ScheduledEvent {
  time: number;
  run: (a: AnimState, t: number) => void;
}

export interface AnimState {
  // Visual outputs read by the component each frame.
  hubPulseScale: number;
  carrierPulseScale: Record<CarrierId, number>;
  formAlpha: Record<CarrierId | 'total', number>;
  pulses: PulseInFlight[];
  sectorScale: Record<string, number>;
  sectorBlip: Record<string, number>;
  connectorOpacity: Record<string, number>;
  labelOpacity: Record<string, number>;

  // Internal scheduling.
  linkLengths: Record<string, number>;   // populated by the component
  hubPulse: PhysicalPulse | null;
  carrierPulses: Partial<Record<CarrierId, PhysicalPulse>>;
  sectorBlips: Record<string, BlipState>;
  formAlphaTweens: Partial<Record<CarrierId | 'total', OpacityTween>>;
  connectorTweens: Record<string, OpacityTween>;
  labelTweens: Record<string, OpacityTween>;
  scheduled: ScheduledEvent[];
  cascadeFullActive: boolean;
  cascadePending: Set<string>;
  cascadeAlreadyReported: boolean;
  reduced: boolean;
  pulseCounter: number;
}

function emptyCarrierRecord<T>(v: T): Record<CarrierId, T> {
  return {
    petroleum: v, naturalGas: v, electricity: v,
    bioenergy: v, heat: v, solidFuel: v,
  };
}

function recordFromIds<T>(ids: string[], v: T): Record<string, T> {
  const out: Record<string, T> = {};
  for (const id of ids) out[id] = v;
  return out;
}

export function makeInitialAnimState(): AnimState {
  const reduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    hubPulseScale: 1,
    carrierPulseScale: emptyCarrierRecord(1),
    formAlpha: { total: 1, ...emptyCarrierRecord(0) },
    pulses: [],
    sectorScale: recordFromIds(ALL_SECTOR_IDS, 0),
    sectorBlip: recordFromIds(ALL_SECTOR_IDS, 0),
    connectorOpacity: recordFromIds(ALL_CONNECTOR_IDS, 0),
    labelOpacity: recordFromIds(ALL_SECTOR_IDS, 0),
    linkLengths: {},
    hubPulse: null,
    carrierPulses: {},
    sectorBlips: {},
    formAlphaTweens: {},
    connectorTweens: {},
    labelTweens: {},
    scheduled: [],
    cascadeFullActive: false,
    cascadePending: new Set(),
    cascadeAlreadyReported: false,
    reduced,
    pulseCounter: 0,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────

function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3);
}

function pulseScaleAt(p: PhysicalPulse | null, now: number): number {
  if (!p) return 1;
  const t = (now - p.startTime) / p.duration;
  if (t <= 0 || t >= 1) return 1;
  return 1 + (p.peakScale - 1) * Math.sin(t * Math.PI);
}

function blipAt(b: BlipState | undefined, now: number): number {
  if (!b) return 0;
  const t = (now - b.startTime) / b.duration;
  if (t <= 0 || t >= 1) return 0;
  return Math.sin(t * Math.PI);
}

function tweenValue(tw: OpacityTween, now: number): number {
  const t = (now - tw.startTime) / tw.duration;
  if (t <= 0) return tw.from;
  if (t >= 1) return tw.to;
  return tw.from + (tw.to - tw.from) * easeOutCubic(t);
}

function tweenDone(tw: OpacityTween, now: number): boolean {
  return now >= tw.startTime + tw.duration;
}

function pulseDuration(linkLength: number | undefined): number {
  if (!linkLength || linkLength <= 0) return 300;
  return linkLength / PULSE_TRAVEL_SPEED_PX_PER_MS;
}

function startTween(
  store: Record<string, OpacityTween>,
  key: string,
  current: number,
  to: number,
  startTime: number,
  duration: number,
): void {
  store[key] = { startTime, duration, from: current, to };
}

// ─── Public API ──────────────────────────────────────────────────

export function reset(anim: AnimState): void {
  anim.hubPulseScale = 1;
  for (const c of CARRIER_IDS) anim.carrierPulseScale[c] = 1;
  anim.formAlpha.total = 1;
  for (const c of CARRIER_IDS) anim.formAlpha[c] = 0;
  anim.pulses = [];
  for (const id of ALL_SECTOR_IDS) {
    anim.sectorScale[id] = 0;
    anim.sectorBlip[id] = 0;
    anim.labelOpacity[id] = 0;
  }
  for (const id of ALL_CONNECTOR_IDS) anim.connectorOpacity[id] = 0;
  anim.hubPulse = null;
  anim.carrierPulses = {};
  anim.sectorBlips = {};
  anim.formAlphaTweens = {};
  anim.connectorTweens = {};
  anim.labelTweens = {};
  anim.scheduled = [];
  anim.cascadeFullActive = false;
  anim.cascadePending = new Set();
  anim.cascadeAlreadyReported = false;
}

export function snapToFull(anim: AnimState): void {
  anim.hubPulseScale = 1;
  for (const c of CARRIER_IDS) anim.carrierPulseScale[c] = 1;
  anim.formAlpha.total = 1;
  for (const c of CARRIER_IDS) anim.formAlpha[c] = 1;
  anim.pulses = [];
  for (const id of ALL_SECTOR_IDS) {
    anim.sectorScale[id] = 1;
    anim.sectorBlip[id] = 0;
    anim.labelOpacity[id] = 1;
  }
  for (const id of ALL_CONNECTOR_IDS) anim.connectorOpacity[id] = 1;
  anim.hubPulse = null;
  anim.carrierPulses = {};
  anim.sectorBlips = {};
  anim.formAlphaTweens = {};
  anim.connectorTweens = {};
  anim.labelTweens = {};
  anim.scheduled = [];
  anim.cascadeFullActive = false;
  anim.cascadePending = new Set();
  anim.cascadeAlreadyReported = false;
}

export function startHubCascade(anim: AnimState, now: number): void {
  reset(anim);
  anim.cascadeFullActive = true;
  anim.cascadeAlreadyReported = false;

  if (anim.reduced) {
    // Snap geometry to its FULL state but tween every visible
    // opacity from 0 → 1 over a single REDUCED_FADE_MS so the
    // transition is perceptible without any chained motion.
    for (const id of ALL_SECTOR_IDS) anim.sectorScale[id] = 1;
    for (const c of CARRIER_IDS) {
      startTween(
        anim.formAlphaTweens as Record<string, OpacityTween>,
        c, 0, 1, now, REDUCED_FADE_MS,
      );
    }
    for (const id of ALL_CONNECTOR_IDS) {
      startTween(anim.connectorTweens, id, 0, 1, now, REDUCED_FADE_MS);
    }
    for (const id of ALL_SECTOR_IDS) {
      startTween(anim.labelTweens, id, 0, 1, now, REDUCED_FADE_MS);
    }
    return;
  }

  // Hub physical-pulse begins now.
  anim.hubPulse = {
    startTime: now,
    duration: HUB_PHYSICAL_PULSE_MS,
    peakScale: HUB_PULSE_PEAK_SCALE,
  };

  // At PULSE_LAUNCH_AT_MS into the hub pulse, fire six hub→carrier pulses.
  const launchTime = now + PULSE_LAUNCH_AT_MS;
  anim.scheduled.push({
    time: launchTime,
    run: (a, t) => launchHubPulses(a, t),
  });

  // cascadePending starts populated with every sector — it's drained
  // as each carrier→sector pulse arrives. Avoids races where a few
  // sub-cascades have completed but others are still pending launch.
  anim.cascadePending = new Set(ALL_SECTOR_IDS);
}

export function startCarrierFocus(
  anim: AnimState,
  carrier: CarrierId,
  _hasSeen: boolean,
  now: number,
): void {
  // Cancel any in-flight pulses or scheduled launches from a prior
  // focus — we're starting a fresh focus animation. (Note: this is
  // only called from phase === 'FULL', so any leftover schedule is
  // from a previous focus that's being replaced.)
  anim.pulses = [];
  anim.scheduled = [];
  anim.carrierPulses = {};
  anim.sectorBlips = {};

  // Tween form alphas: focused → 1, others → DIM_OPACITY.
  for (const c of CARRIER_IDS) {
    const target = c === carrier ? 1 : DIM_OPACITY;
    startTween(
      anim.formAlphaTweens as Record<string, OpacityTween>,
      c, anim.formAlpha[c], target, now,
      anim.reduced ? REDUCED_FADE_MS : OPACITY_CROSSFADE_MS,
    );
  }

  // Hub→carrier connectors: focused → 1, others → DIM_OPACITY.
  for (const l of HUB_LINKS) {
    const target = l.carrier === carrier ? 1 : DIM_OPACITY;
    startTween(
      anim.connectorTweens, l.id,
      anim.connectorOpacity[l.id], target, now,
      anim.reduced ? REDUCED_FADE_MS : OPACITY_CROSSFADE_MS,
    );
  }

  // Carrier→sector connectors: focused branch → 1, others → DIM_OPACITY.
  for (const l of SECTOR_LINKS) {
    const target = l.carrier === carrier ? 1 : DIM_OPACITY;
    startTween(
      anim.connectorTweens, l.id,
      anim.connectorOpacity[l.id], target, now,
      anim.reduced ? REDUCED_FADE_MS : OPACITY_CROSSFADE_MS,
    );
  }

  // Sector labels: focused branch → 1, others → 0.
  for (const l of SECTOR_LINKS) {
    const target = l.carrier === carrier ? 1 : 0;
    if (!l.sectorId) continue;
    startTween(
      anim.labelTweens, l.sectorId,
      anim.labelOpacity[l.sectorId], target, now,
      anim.reduced ? REDUCED_FADE_MS : LABEL_FADE_MS,
    );
  }

  if (anim.reduced) return;

  // Focused carrier physical-pulses; at peak, sector pulses launch.
  anim.carrierPulses[carrier] = {
    startTime: now,
    duration: CARRIER_PHYSICAL_PULSE_MS,
    peakScale: CARRIER_PULSE_PEAK_SCALE,
  };
  anim.scheduled.push({
    time: now + PULSE_LAUNCH_AT_MS,
    run: (a, t) => launchSectorPulses(a, carrier, t, /* duringFocus */ true),
  });
}

export function endCarrierFocus(anim: AnimState, now: number): void {
  // Crossfade everything back: form alphas → 1, connectors → 1,
  // labels → 1. Cancel pulses + blips in flight.
  anim.pulses = [];
  anim.scheduled = [];
  anim.carrierPulses = {};
  anim.sectorBlips = {};

  for (const c of CARRIER_IDS) {
    startTween(
      anim.formAlphaTweens as Record<string, OpacityTween>,
      c, anim.formAlpha[c], 1, now,
      anim.reduced ? REDUCED_FADE_MS : OPACITY_CROSSFADE_MS,
    );
  }
  for (const id of ALL_CONNECTOR_IDS) {
    startTween(
      anim.connectorTweens, id,
      anim.connectorOpacity[id], 1, now,
      anim.reduced ? REDUCED_FADE_MS : OPACITY_CROSSFADE_MS,
    );
  }
  for (const id of ALL_SECTOR_IDS) {
    startTween(
      anim.labelTweens, id,
      anim.labelOpacity[id], 1, now,
      anim.reduced ? REDUCED_FADE_MS : LABEL_FADE_MS,
    );
  }
}

// ─── Tick ────────────────────────────────────────────────────────

export function tickAnimation(
  anim: AnimState,
  now: number,
): { changed: boolean; cascadeFullComplete: boolean } {
  let changed = false;

  // 1. Run scheduled events whose time has passed.
  if (anim.scheduled.length > 0) {
    const remaining: ScheduledEvent[] = [];
    for (const ev of anim.scheduled) {
      if (now >= ev.time) {
        ev.run(anim, ev.time);
        changed = true;
      } else {
        remaining.push(ev);
      }
    }
    anim.scheduled = remaining;
  }

  // 2. Hub pulse-scale.
  if (anim.hubPulse) {
    const v = pulseScaleAt(anim.hubPulse, now);
    if (anim.hubPulseScale !== v) { anim.hubPulseScale = v; changed = true; }
    if (now >= anim.hubPulse.startTime + anim.hubPulse.duration) {
      anim.hubPulse = null;
      anim.hubPulseScale = 1;
    }
  }

  // 3. Each carrier's physical pulse.
  for (const c of CARRIER_IDS) {
    const cp = anim.carrierPulses[c];
    if (cp) {
      const v = pulseScaleAt(cp, now);
      if (anim.carrierPulseScale[c] !== v) {
        anim.carrierPulseScale[c] = v;
        changed = true;
      }
      if (now >= cp.startTime + cp.duration) {
        delete anim.carrierPulses[c];
        anim.carrierPulseScale[c] = 1;
      }
    }
  }

  // 4. Pulse-tip progress + arrivals.
  if (anim.pulses.length > 0) {
    const survivors: PulseInFlight[] = [];
    for (const p of anim.pulses) {
      const t = (now - p.startTime) / p.duration;
      if (t >= 1) {
        p.progress = 1;
        const arrivalT = p.startTime + p.duration;
        handlePulseArrival(anim, p, arrivalT);
        changed = true;
      } else if (t > 0) {
        if (p.progress !== t) { p.progress = t; changed = true; }
        survivors.push(p);
      } else {
        survivors.push(p);
      }
    }
    anim.pulses = survivors;
  }

  // 5. Sector blips (CARRIER_FOCUS replays).
  for (const id of Object.keys(anim.sectorBlips)) {
    const b = anim.sectorBlips[id];
    const v = blipAt(b, now);
    if (anim.sectorBlip[id] !== v) {
      anim.sectorBlip[id] = v;
      changed = true;
    }
    if (now >= b.startTime + b.duration) {
      anim.sectorBlip[id] = 0;
      delete anim.sectorBlips[id];
    }
  }

  // 6. Tweens.
  for (const k of Object.keys(anim.formAlphaTweens) as (CarrierId | 'total')[]) {
    const tw = anim.formAlphaTweens[k];
    if (!tw) continue;
    const v = tweenValue(tw, now);
    if (anim.formAlpha[k] !== v) { anim.formAlpha[k] = v; changed = true; }
    if (tweenDone(tw, now)) delete anim.formAlphaTweens[k];
  }
  for (const k of Object.keys(anim.connectorTweens)) {
    const tw = anim.connectorTweens[k];
    const v = tweenValue(tw, now);
    if (anim.connectorOpacity[k] !== v) { anim.connectorOpacity[k] = v; changed = true; }
    if (tweenDone(tw, now)) delete anim.connectorTweens[k];
  }
  for (const k of Object.keys(anim.labelTweens)) {
    const tw = anim.labelTweens[k];
    const v = tweenValue(tw, now);
    if (anim.labelOpacity[k] !== v) { anim.labelOpacity[k] = v; changed = true; }
    if (tweenDone(tw, now)) delete anim.labelTweens[k];
  }

  // 7. Cascade-completion check.
  let cascadeFullComplete = false;
  if (
    anim.cascadeFullActive &&
    !anim.cascadeAlreadyReported &&
    anim.scheduled.length === 0 &&
    anim.pulses.length === 0 &&
    anim.hubPulse === null &&
    Object.keys(anim.carrierPulses).length === 0 &&
    anim.cascadePending.size === 0 &&
    Object.keys(anim.formAlphaTweens).length === 0 &&
    Object.keys(anim.connectorTweens).length === 0 &&
    Object.keys(anim.labelTweens).length === 0
  ) {
    anim.cascadeAlreadyReported = true;
    anim.cascadeFullActive = false;
    cascadeFullComplete = true;
    changed = true;
  }

  // The reduced-motion path has no pulses or pending sectors to
  // drain; complete once all reduced-fade tweens finish.
  if (
    anim.reduced &&
    anim.cascadeFullActive &&
    !anim.cascadeAlreadyReported &&
    Object.keys(anim.formAlphaTweens).length === 0 &&
    Object.keys(anim.connectorTweens).length === 0 &&
    Object.keys(anim.labelTweens).length === 0
  ) {
    anim.cascadeAlreadyReported = true;
    anim.cascadeFullActive = false;
    cascadeFullComplete = true;
    changed = true;
  }

  return { changed, cascadeFullComplete };
}

// ─── Internal scheduling callbacks ───────────────────────────────

function launchHubPulses(anim: AnimState, now: number): void {
  for (const l of HUB_LINKS) {
    const len = anim.linkLengths[l.id];
    anim.pulses.push({
      id: `pulse-${anim.pulseCounter++}`,
      pathId: l.id,
      carrier: l.carrier,
      sectorId: null,
      startTime: now,
      duration: pulseDuration(len),
      color: CARRIER_COLOURS[l.carrier],
      progress: 0,
      focusReplay: false,
    });
  }
}

function launchSectorPulses(
  anim: AnimState,
  carrier: CarrierId,
  now: number,
  duringFocus: boolean,
): void {
  const links = SECTOR_LINKS_BY_CARRIER[carrier];
  for (const l of links) {
    const len = anim.linkLengths[l.id];
    anim.pulses.push({
      id: `pulse-${anim.pulseCounter++}`,
      pathId: l.id,
      carrier,
      sectorId: l.sectorId,
      startTime: now,
      duration: pulseDuration(len),
      color: CARRIER_COLOURS[carrier],
      progress: 0,
      focusReplay: duringFocus,
    });
  }
}

function handlePulseArrival(
  anim: AnimState,
  p: PulseInFlight,
  arrivalTime: number,
): void {
  if (p.sectorId === null) {
    // Hub→carrier arrival.
    anim.formAlpha[p.carrier] = 1;
    anim.carrierPulses[p.carrier] = {
      startTime: arrivalTime,
      duration: CARRIER_PHYSICAL_PULSE_MS,
      peakScale: CARRIER_PULSE_PEAK_SCALE,
    };
    anim.carrierPulseScale[p.carrier] = 1;

    // Reveal the hub→carrier connector itself.
    startTween(
      anim.connectorTweens, p.pathId,
      anim.connectorOpacity[p.pathId], 1,
      arrivalTime, OPACITY_CROSSFADE_MS,
    );

    // Schedule this carrier's sector launch at arrival + 120 ms peak.
    anim.scheduled.push({
      time: arrivalTime + PULSE_LAUNCH_AT_MS,
      run: (a, t) => launchSectorPulses(a, p.carrier, t, /* duringFocus */ false),
    });
    return;
  }

  // Carrier→sector arrival.
  if (p.focusReplay) {
    // Sector dot is already at scale 1 in FULL/FOCUS — fire an
    // absorb-blip on top of it.
    anim.sectorBlips[p.sectorId] = {
      startTime: arrivalTime,
      duration: ABSORB_BLIP_MS,
    };
    return;
  }

  // CASCADE_FULL arrival.
  anim.sectorScale[p.sectorId] = 1;
  startTween(
    anim.connectorTweens, p.sectorId,
    anim.connectorOpacity[p.sectorId], 1,
    arrivalTime, OPACITY_CROSSFADE_MS,
  );
  startTween(
    anim.labelTweens, p.sectorId,
    anim.labelOpacity[p.sectorId], 1,
    arrivalTime, LABEL_FADE_MS,
  );
  anim.cascadePending.delete(p.sectorId);
}
