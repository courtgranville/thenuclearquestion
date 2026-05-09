// Poster 004 animation engine.
//
// Stateless module functions that mutate an AnimState in place. The
// component owns one AnimState in animRef.current and calls
// tickAnimation each frame; the engine schedules its own internal
// chain of cascade events via the .scheduled queue.
//
// Single shared cascade primitive — startCascade(branches, dim, now).
//   • startHubCascade fires all six branches with no dimming.
//   • startCarrierFocus fires one branch and dims the other five.
// In both cases pulses originate from the hub: hub physical-pulses,
// then hub→carrier pulses fan out, each carrier physical-pulses on
// arrival, and finally carrier→sector pulses absorb into the dots.
//
// Connector lines reveal via stroke-dasharray + stroke-dashoffset
// keyed off connectorDrawProgress[id] (the component reads this and
// writes the dashoffset attribute). Each in-flight pulse drives its
// connector's drawProgress = max(prev, pulse.progress). Once 1, the
// connector stays drawn-in for every subsequent replay.
//
// Reduced motion: every entrypoint checks anim.reduced (set at
// makeInitialAnimState time from prefers-reduced-motion) and collapses
// the visible state to a single 200 ms opacity fade with no chained
// timings or pulse-tip travel.

import linksData from '@/assets/poster-004-forms.json';
import { CARRIER_IDS, type CarrierId } from './poster004State';

// ─── Timing & visual constants ───────────────────────────────────
// Cascade end-to-end target ~3 s — slowed from the original ~1.8 s
// so the eye can follow the construction. Tune to taste; everything
// scales together.
export const HUB_PHYSICAL_PULSE_MS    = 360;
export const CARRIER_PHYSICAL_PULSE_MS = 360;
export const HUB_PULSE_PEAK_SCALE     = 1.15;
export const CARRIER_PULSE_PEAK_SCALE = 1.12;
export const PULSE_LAUNCH_AT_MS       = 180;
export const PULSE_TRAVEL_SPEED_PX_PER_MS = 0.20;
// In CARRIER_FOCUS the hub→carrier segment is preamble — the user's
// attention is on the destination carrier and its sectors, not on
// watching the pulse trundle out from the centre. Carrier→sector
// speed stays at base. CASCADE_FULL ignores this multiplier (initial
// reveal is paced for first-time discovery).
export const HUB_TO_CARRIER_FOCUS_SPEED_MULTIPLIER = 2.0;
export const ABSORB_BLIP_MS           = 320;
export const ABSORB_BLIP_PEAK_SCALE   = 1.15;
// Sector dots grow from scale 0 → 1 the first time their pulse
// arrives (i.e., when sectorScale was still 0). Duration scales
// with the dot's final radius so big sectors visibly take longer
// than small ones — clamped at both ends.
// Subsequent arrivals (replays from FULL or CARRIER_FOCUS) skip the
// grow and fire the absorb-blip instead.
export const SECTOR_GROW_RATE_PX_PER_MS = 0.025;
export const SECTOR_GROW_MIN_MS         = 250;
export const SECTOR_GROW_MAX_MS         = 1200;
export const LABEL_FADE_MS            = 300;
export const OPACITY_CROSSFADE_MS     = 300;
export const HOVER_DEBOUNCE_MS        = 300;
export const DIM_OPACITY              = 0.05;
export const INSTRUCTION_FADE_IN_DELAY_MS = 800;
export const INSTRUCTION_FADE_IN_MS   = 200;

// Reduced-motion cascades collapse to a single 200 ms fade.
const REDUCED_FADE_MS = 200;

// Pulse render constants (used by the component, exported here for
// co-location with timing).
export const PULSE_TAIL_PX            = 14;
export const PULSE_HALO_RADIUS        = 7;
export const PULSE_HALO_ALPHA         = 0.25;
export const PULSE_STROKE_ALPHA       = 0.85;
export const PULSE_STROKE_WIDTH       = 3.5;

// Lens-shaped pulse head — vesica oriented along the path's tangent
// at the head position. Sharp points front and back, rotated to
// follow the connector. White-hot core is a smaller lens of the same
// orientation, scaled by PULSE_CORE_RADIUS_RATIO.
export const PULSE_LENGTH             = 14;
export const PULSE_WIDTH              = 4;
export const PULSE_CORE_ALPHA         = 0.9;
export const PULSE_CORE_RADIUS_RATIO  = 0.55;
// Subtle shimmer driven by sin(now * 0.05) — multiplies the core
// lens dimensions per-frame so the head reads as alive.
export const PULSE_SHIMMER_AMPLITUDE  = 0.15;

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
  sectors: Array<{ id: string; carrier: string; r: number }>;
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
const SECTOR_BY_ID: Record<string, { carrier: CarrierId; r: number }> = {};
for (const s of data.sectors) {
  SECTOR_BY_ID[s.id] = { carrier: s.carrier as CarrierId, r: s.r };
}

function sectorGrowDuration(radius: number): number {
  const raw = radius / SECTOR_GROW_RATE_PX_PER_MS;
  if (raw < SECTOR_GROW_MIN_MS) return SECTOR_GROW_MIN_MS;
  if (raw > SECTOR_GROW_MAX_MS) return SECTOR_GROW_MAX_MS;
  return raw;
}

// ─── AnimState ───────────────────────────────────────────────────

export type PulseSegment = 'hub-to-carrier' | 'carrier-to-sector';

export interface PulseInFlight {
  id: string;
  pathId: string;        // matches Link.id; component looks up SVG <path>
  carrier: CarrierId;
  sectorId: string | null;
  segment: PulseSegment;
  startTime: number;
  duration: number;
  color: string;
  progress: number;      // 0..1, written by tickAnimation
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
  // Dim mask (1 = bright, DIM_OPACITY = dimmed). Independent from
  // drawProgress; both modulate the rendered connector / dot.
  connectorOpacity: Record<string, number>;
  labelOpacity: Record<string, number>;
  // Trail reveal (0 = invisible, 1 = fully drawn, sticky once 1).
  // Component writes stroke-dashoffset = pathLength * (1 - progress).
  connectorDrawProgress: Record<string, number>;

  // Internal scheduling.
  linkLengths: Record<string, number>;   // populated by the component
  hubPulse: PhysicalPulse | null;
  carrierPulses: Partial<Record<CarrierId, PhysicalPulse>>;
  sectorBlips: Record<string, BlipState>;
  // First-arrival grow-from-zero tweens for sector dots (pulse
  // arrives → 0 → 1 over SECTOR_GROW_MS). Reused-arrival pulses
  // populate sectorBlips instead.
  sectorScaleTweens: Record<string, OpacityTween>;
  formAlphaTweens: Partial<Record<CarrierId | 'total', OpacityTween>>;
  connectorTweens: Record<string, OpacityTween>;
  labelTweens: Record<string, OpacityTween>;
  scheduled: ScheduledEvent[];
  cascadeActive: boolean;
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
    // Connectors default bright — drawProgress + dashoffset hide them
    // until a pulse traces them.
    connectorOpacity: recordFromIds(ALL_CONNECTOR_IDS, 1),
    labelOpacity: recordFromIds(ALL_SECTOR_IDS, 0),
    connectorDrawProgress: recordFromIds(ALL_CONNECTOR_IDS, 0),
    linkLengths: {},
    hubPulse: null,
    carrierPulses: {},
    sectorBlips: {},
    sectorScaleTweens: {},
    formAlphaTweens: {},
    connectorTweens: {},
    labelTweens: {},
    scheduled: [],
    cascadeActive: false,
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
  if (current === to) {
    delete store[key];
    return;
  }
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
  for (const id of ALL_CONNECTOR_IDS) {
    anim.connectorOpacity[id] = 1;
    anim.connectorDrawProgress[id] = 0;
  }
  anim.hubPulse = null;
  anim.carrierPulses = {};
  anim.sectorBlips = {};
  anim.formAlphaTweens = {};
  anim.connectorTweens = {};
  anim.labelTweens = {};
  anim.scheduled = [];
  anim.cascadeActive = false;
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
  for (const id of ALL_CONNECTOR_IDS) {
    anim.connectorOpacity[id] = 1;
    anim.connectorDrawProgress[id] = 1;
  }
  anim.hubPulse = null;
  anim.carrierPulses = {};
  anim.sectorBlips = {};
  anim.sectorScaleTweens = {};
  anim.formAlphaTweens = {};
  anim.connectorTweens = {};
  anim.labelTweens = {};
  anim.scheduled = [];
  anim.cascadeActive = false;
  anim.cascadePending = new Set();
  anim.cascadeAlreadyReported = false;
}

// ─── Shared cascade primitive ────────────────────────────────────
//
// Plays a hub→branches→sectors cascade with optional dimming of
// non-branch carriers. Used for both startHubCascade (all branches,
// no dim) and startCarrierFocus (one branch, dim the rest).

function startCascade(
  anim: AnimState,
  branches: CarrierId[],
  dimNonBranches: boolean,
  now: number,
): void {
  // Cancel anything in flight from a prior cascade or focus.
  anim.pulses = [];
  anim.scheduled = [];
  anim.carrierPulses = {};
  anim.sectorBlips = {};
  anim.sectorScaleTweens = {};

  anim.cascadeActive = true;
  anim.cascadeAlreadyReported = false;

  const branchSet = new Set(branches);
  const dimDuration = anim.reduced ? REDUCED_FADE_MS : OPACITY_CROSSFADE_MS;
  const labelDuration = anim.reduced ? REDUCED_FADE_MS : LABEL_FADE_MS;

  // Form alphas: branches → 1, non-branches → DIM_OPACITY (if dim) or 1.
  // Non-branches at 1 means "everything visible at full" — used by
  // startHubCascade where the cascade is showing all six.
  for (const c of CARRIER_IDS) {
    const target = branchSet.has(c) ? 1 : (dimNonBranches ? DIM_OPACITY : 1);
    startTween(
      anim.formAlphaTweens as Record<string, OpacityTween>,
      c, anim.formAlpha[c], target, now, dimDuration,
    );
  }

  // Connector dim mask. Branch connectors → 1, non-branch → DIM (or 1).
  // The TRAIL reveal (drawProgress) is independent and handled per-pulse.
  for (const l of HUB_LINKS) {
    const target = branchSet.has(l.carrier) ? 1 : (dimNonBranches ? DIM_OPACITY : 1);
    startTween(
      anim.connectorTweens, l.id,
      anim.connectorOpacity[l.id], target, now, dimDuration,
    );
  }
  for (const l of SECTOR_LINKS) {
    const target = branchSet.has(l.carrier) ? 1 : (dimNonBranches ? DIM_OPACITY : 1);
    startTween(
      anim.connectorTweens, l.id,
      anim.connectorOpacity[l.id], target, now, dimDuration,
    );
  }

  // Sector labels: branch → 1, non-branch → 0 (if dim) or 1.
  for (const l of SECTOR_LINKS) {
    if (!l.sectorId) continue;
    const onBranch = branchSet.has(l.carrier);
    // For branch sectors we let the per-arrival labelTween fade them in
    // — sets up the cascade reveal naturally.  Non-branch labels tween
    // to 0 (or stay at 1 if no dim).
    if (onBranch) {
      // Cancel any non-branch dim tween that might be in-flight; the
      // arrival callback will set a fresh fade-in.
      delete anim.labelTweens[l.sectorId];
    } else {
      const target = dimNonBranches ? 0 : 1;
      startTween(
        anim.labelTweens, l.sectorId,
        anim.labelOpacity[l.sectorId], target, now, labelDuration,
      );
    }
  }

  if (anim.reduced) {
    // Reduced motion: snap geometry; rely on the form/connector/label
    // tweens above for the visible fade. No pulse-tip travel and no
    // chained timing — completion fires once the fades settle.
    for (const id of ALL_SECTOR_IDS) {
      anim.sectorScale[id] = 1;
    }
    for (const id of ALL_CONNECTOR_IDS) {
      anim.connectorDrawProgress[id] = 1;
    }
    // Branch sectors get labels = 1 too (the per-arrival tween path
    // doesn't run under reduced motion).
    for (const sid of ALL_SECTOR_IDS) {
      const carrier = SECTOR_BY_ID[sid]?.carrier;
      if (!carrier) continue;
      if (branchSet.has(carrier)) {
        startTween(
          anim.labelTweens, sid,
          anim.labelOpacity[sid], 1, now, labelDuration,
        );
      }
    }
    // No pulses ever fire under reduced motion — drain pending set so
    // the completion check passes once the tweens settle.
    anim.cascadePending = new Set();
    return;
  }

  // Hub physical-pulse begins now.
  anim.hubPulse = {
    startTime: now,
    duration: HUB_PHYSICAL_PULSE_MS,
    peakScale: HUB_PULSE_PEAK_SCALE,
  };

  // At PULSE_LAUNCH_AT_MS into the hub pulse, fire one hub→carrier
  // pulse per branch. In CARRIER_FOCUS the hub-segment runs at
  // HUB_TO_CARRIER_FOCUS_SPEED_MULTIPLIER × base speed (preamble);
  // CASCADE_FULL keeps base speed for first-time discovery pacing.
  const hubSpeedMultiplier =
    dimNonBranches ? HUB_TO_CARRIER_FOCUS_SPEED_MULTIPLIER : 1;
  anim.scheduled.push({
    time: now + PULSE_LAUNCH_AT_MS,
    run: (a, t) => launchHubPulses(a, branches, t, hubSpeedMultiplier),
  });

  // cascadePending tracks the sector ids whose pulses still need to
  // arrive before the cascade is considered done. Only branch sectors
  // are tracked — non-branches don't fire pulses in this cascade.
  const pending = new Set<string>();
  for (const l of SECTOR_LINKS) {
    if (l.sectorId && branchSet.has(l.carrier)) pending.add(l.sectorId);
  }
  anim.cascadePending = pending;
}

export function startHubCascade(anim: AnimState, now: number): void {
  startCascade(anim, CARRIER_IDS.slice(), /* dim */ false, now);
}

export function startCarrierFocus(
  anim: AnimState,
  carrier: CarrierId,
  _hasSeen: boolean,
  now: number,
): void {
  startCascade(anim, [carrier], /* dim */ true, now);
}

export function endCarrierFocus(anim: AnimState, now: number): void {
  // Crossfade everything back: form alphas → 1, connectors → 1,
  // labels → 1. Cancel pulses + blips in flight (cascade itself
  // ends naturally when its scheduled tail completes).
  anim.pulses = [];
  anim.scheduled = [];
  anim.carrierPulses = {};
  anim.sectorBlips = {};
  anim.sectorScaleTweens = {};
  anim.cascadeActive = false;
  anim.cascadePending = new Set();

  const dimDuration = anim.reduced ? REDUCED_FADE_MS : OPACITY_CROSSFADE_MS;
  const labelDuration = anim.reduced ? REDUCED_FADE_MS : LABEL_FADE_MS;

  for (const c of CARRIER_IDS) {
    startTween(
      anim.formAlphaTweens as Record<string, OpacityTween>,
      c, anim.formAlpha[c], 1, now, dimDuration,
    );
  }
  for (const id of ALL_CONNECTOR_IDS) {
    startTween(
      anim.connectorTweens, id,
      anim.connectorOpacity[id], 1, now, dimDuration,
    );
  }
  for (const id of ALL_SECTOR_IDS) {
    startTween(
      anim.labelTweens, id,
      anim.labelOpacity[id], 1, now, labelDuration,
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

  // 4. Pulse-tip progress + arrivals + connector trail draw-in.
  if (anim.pulses.length > 0) {
    const survivors: PulseInFlight[] = [];
    for (const p of anim.pulses) {
      const t = (now - p.startTime) / p.duration;
      if (t >= 1) {
        p.progress = 1;
        // Lock the trail at 1 — sticky once drawn.
        anim.connectorDrawProgress[p.pathId] = 1;
        const arrivalT = p.startTime + p.duration;
        handlePulseArrival(anim, p, arrivalT);
        changed = true;
      } else if (t > 0) {
        if (p.progress !== t) { p.progress = t; changed = true; }
        // Trail follows the pulse — only grows, never shrinks.
        const prev = anim.connectorDrawProgress[p.pathId] ?? 0;
        if (t > prev) anim.connectorDrawProgress[p.pathId] = t;
        survivors.push(p);
      } else {
        survivors.push(p);
      }
    }
    anim.pulses = survivors;
  }

  // 5a. Sector first-arrival grow tweens (0 → 1, cubic ease-out).
  for (const id of Object.keys(anim.sectorScaleTweens)) {
    const tw = anim.sectorScaleTweens[id];
    const v = tweenValue(tw, now);
    if (anim.sectorScale[id] !== v) {
      anim.sectorScale[id] = v;
      changed = true;
    }
    if (tweenDone(tw, now)) {
      anim.sectorScale[id] = tw.to;
      delete anim.sectorScaleTweens[id];
    }
  }

  // 5b. Sector blips.
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
    anim.cascadeActive &&
    !anim.cascadeAlreadyReported &&
    anim.scheduled.length === 0 &&
    anim.pulses.length === 0 &&
    anim.hubPulse === null &&
    Object.keys(anim.carrierPulses).length === 0 &&
    anim.cascadePending.size === 0 &&
    Object.keys(anim.sectorBlips).length === 0 &&
    Object.keys(anim.sectorScaleTweens).length === 0 &&
    Object.keys(anim.formAlphaTweens).length === 0 &&
    Object.keys(anim.connectorTweens).length === 0 &&
    Object.keys(anim.labelTweens).length === 0
  ) {
    anim.cascadeAlreadyReported = true;
    anim.cascadeActive = false;
    cascadeFullComplete = true;
    changed = true;
  }

  return { changed, cascadeFullComplete };
}

// ─── Internal scheduling callbacks ───────────────────────────────

function launchHubPulses(
  anim: AnimState,
  branches: CarrierId[],
  now: number,
  speedMultiplier: number,
): void {
  const branchSet = new Set(branches);
  for (const l of HUB_LINKS) {
    if (!branchSet.has(l.carrier)) continue;
    const len = anim.linkLengths[l.id];
    anim.pulses.push({
      id: `pulse-${anim.pulseCounter++}`,
      pathId: l.id,
      carrier: l.carrier,
      sectorId: null,
      segment: 'hub-to-carrier',
      startTime: now,
      duration: pulseDuration(len) / speedMultiplier,
      color: CARRIER_COLOURS[l.carrier],
      progress: 0,
    });
  }
}

function launchSectorPulses(
  anim: AnimState,
  carrier: CarrierId,
  now: number,
): void {
  const links = SECTOR_LINKS_BY_CARRIER[carrier];
  for (const l of links) {
    const len = anim.linkLengths[l.id];
    anim.pulses.push({
      id: `pulse-${anim.pulseCounter++}`,
      pathId: l.id,
      carrier,
      sectorId: l.sectorId,
      segment: 'carrier-to-sector',
      startTime: now,
      duration: pulseDuration(len),
      color: CARRIER_COLOURS[carrier],
      progress: 0,
    });
  }
}

function handlePulseArrival(
  anim: AnimState,
  p: PulseInFlight,
  arrivalTime: number,
): void {
  if (p.sectorId === null) {
    // Hub→carrier arrival. Snap formAlpha (no-op on replay), kick the
    // carrier physical-pulse, schedule its sector launch.
    anim.formAlpha[p.carrier] = 1;
    anim.carrierPulses[p.carrier] = {
      startTime: arrivalTime,
      duration: CARRIER_PHYSICAL_PULSE_MS,
      peakScale: CARRIER_PULSE_PEAK_SCALE,
    };
    anim.carrierPulseScale[p.carrier] = 1;
    anim.scheduled.push({
      time: arrivalTime + PULSE_LAUNCH_AT_MS,
      run: (a, t) => launchSectorPulses(a, p.carrier, t),
    });
    return;
  }

  // Carrier→sector arrival. First-time arrival (sectorScale < 1)
  // grows the dot from its current scale to 1 over a duration that
  // scales with the dot's final radius — big dots take ~1000 ms,
  // small ones clamp to MIN. Subsequent arrivals (already at 1 from
  // a prior cascade or focus) fire the absorb-blip instead. Label
  // fade-in runs on every arrival.
  if (anim.sectorScale[p.sectorId] < 1) {
    const sec = SECTOR_BY_ID[p.sectorId];
    anim.sectorScaleTweens[p.sectorId] = {
      startTime: arrivalTime,
      duration: sec ? sectorGrowDuration(sec.r) : SECTOR_GROW_MIN_MS,
      from: anim.sectorScale[p.sectorId],
      to: 1,
    };
  } else {
    anim.sectorBlips[p.sectorId] = {
      startTime: arrivalTime,
      duration: ABSORB_BLIP_MS,
    };
  }
  startTween(
    anim.labelTweens, p.sectorId,
    anim.labelOpacity[p.sectorId], 1,
    arrivalTime, LABEL_FADE_MS,
  );
  anim.cascadePending.delete(p.sectorId);
}
