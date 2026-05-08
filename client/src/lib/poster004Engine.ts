/**
 * Poster 004 — animation engine (v2).
 *
 * Drives the 5-phase state machine in poster004Store. The engine is
 * the only writer of phase + animation values; pointer handlers in
 * Hub and Carriers call into engine functions, which update state
 * and run RAF loops.
 *
 * Court's rule: "circles only grow once per hover per source". Once
 * a carrier's sectors have grown via any path, hasSeenCarrier[id]
 * becomes true and subsequent enterCarrierFocus on that carrier
 * skips the replay — only the dim mask applies.
 *
 * Cascade semantics:
 *   - CASCADE_HUB pulses to ALL carriers always (carriers haven't
 *     been revealed yet in this state).
 *   - CASCADE_ALL pulses only from carriers where hasSeen is false.
 *     Already-seen carriers do not re-pulse and their sectors do
 *     not re-grow. If all are already seen, CASCADE_ALL is a no-op.
 *   - CASCADE_FOCUS pulses one carrier's sectors. Only fires if
 *     hasSeen is false; otherwise enterCarrierFocus just sets the
 *     dim mask without animation.
 *
 * Cascades are commit-on-start: pointer leaving the trigger does
 * not cancel an in-flight cascade. Only reset() / playAnimation()
 * cancel.
 *
 * Reduced-motion check at every public entrypoint dispatches to a
 * snap variant: 200ms opacity fade to the end state, no pulses, no
 * physical pulses, no scale tweens.
 */

import {
  CARRIERS,
  CARRIER_BY_ID,
  HUB_CX,
  HUB_CY,
  carrierCentre,
  sectorCentre,
  type Carrier,
  type CarrierId,
} from './poster004Data';
import { poster004Store, type Pulse } from './poster004Store';

// ─────────────────────────────────────────────────────────────────────
// Timing constants — exported for commit 7 polish to tune in one place.
// ─────────────────────────────────────────────────────────────────────

export const HUB_PHYSICAL_PULSE_MS = 240;
export const CARRIER_PHYSICAL_PULSE_MS = 240;
export const HUB_PULSE_PEAK_SCALE = 1.15;
export const CARRIER_PULSE_PEAK_SCALE = 1.12;

/** Pulse launch happens at the peak of the physical pulse (sin-bell midpoint). */
export const PULSE_LAUNCH_AT_MS = 120;

/**
 * Pulse travel speed. With per-carrier hub distances (145–225px), this
 * yields ~453ms travel for Heat (closest) and ~703ms for Petroleum
 * (furthest) — the wave-front feel.
 */
export const PULSE_TRAVEL_SPEED_PX_PER_MS = 0.32;

export const BLOB_GROW_MS = 220;
export const LABEL_FADE_MS = 200;
export const OPACITY_CROSSFADE_MS = 200;

/** Time after CARRIERS settles before sustained hub-hover triggers CASCADE_ALL. */
export const HOVER_EXTEND_THRESHOLD_MS = 700;

/** Grace period: pointerleave from focused carrier waits this long before exiting focus. */
export const HOVER_DEBOUNCE_MS = 300;

export const INSTRUCTION_FADE_IN_DELAY_MS = 800;
export const INSTRUCTION_FADE_IN_MS = 200;

// ─────────────────────────────────────────────────────────────────────
// Internal state
// ─────────────────────────────────────────────────────────────────────

let activeRaf: number | null = null;
let exitFocusTimer: ReturnType<typeof setTimeout> | null = null;
let instructionFadeTimer: ReturnType<typeof setTimeout> | null = null;

function cancelActiveRaf(): void {
  if (activeRaf !== null) {
    cancelAnimationFrame(activeRaf);
    activeRaf = null;
  }
}

function cancelExitFocusTimer(): void {
  if (exitFocusTimer !== null) {
    clearTimeout(exitFocusTimer);
    exitFocusTimer = null;
  }
}

function cancelInstructionFadeTimer(): void {
  if (instructionFadeTimer !== null) {
    clearTimeout(instructionFadeTimer);
    instructionFadeTimer = null;
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Cubic ease-in-out — used for blob grow and opacity tweens.
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Sin-bell — used for the physical-pulse scale tween. f(0)=0, f(0.5)=1, f(1)=0.
function sinBell(t: number): number {
  return Math.sin(t * Math.PI);
}

// ─────────────────────────────────────────────────────────────────────
// Hover instruction
// ─────────────────────────────────────────────────────────────────────

/**
 * Called by the Viz on mount. Schedules the hover instruction to fade
 * in after the initial delay. The instruction is hidden the moment
 * any cascade fires.
 */
export function scheduleHoverInstruction(): void {
  cancelInstructionFadeTimer();
  instructionFadeTimer = setTimeout(() => {
    instructionFadeTimer = null;
    if (poster004Store.getState().phase === 'DEFAULT') {
      poster004Store.setHoverInstructionVisible(true);
      poster004Store.notify();
    }
  }, INSTRUCTION_FADE_IN_DELAY_MS);
}

function dismissHoverInstruction(): void {
  cancelInstructionFadeTimer();
  if (poster004Store.getState().hoverInstructionVisible) {
    poster004Store.setHoverInstructionVisible(false);
    // Notify via the cascade's RAF; no extra notify needed here.
  }
}

// ─────────────────────────────────────────────────────────────────────
// Pulse construction helpers
// ─────────────────────────────────────────────────────────────────────

function buildHubToCarrierPulses(): Pulse[] {
  return CARRIERS.map((carrier) => {
    const cc = carrierCentre(carrier);
    const dx = cc.x - HUB_CX;
    const dy = cc.y - HUB_CY;
    return {
      id: `hub-${carrier.id}`,
      spokeId: `hub-${carrier.id}`,
      fromX: HUB_CX,
      fromY: HUB_CY,
      toX: cc.x,
      toY: cc.y,
      pathLength: Math.hypot(dx, dy),
      progress: 0,
      colour: carrier.colour,
      carrierId: carrier.id,
      sectorId: null,
    };
  });
}

function buildCarrierToSectorPulses(carrier: Carrier): Pulse[] {
  const cc = carrierCentre(carrier);
  return carrier.sectors.map((sector) => {
    const sc = sectorCentre(carrier, sector);
    return {
      id: `${carrier.id}-${sector.id}`,
      spokeId: `${carrier.id}-${sector.id}`,
      fromX: cc.x,
      fromY: cc.y,
      toX: sc.x,
      toY: sc.y,
      pathLength: Math.hypot(sc.x - cc.x, sc.y - cc.y),
      progress: 0,
      colour: carrier.colour,
      carrierId: carrier.id,
      sectorId: sector.id,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────
// CASCADE_HUB: total → carriers
// ─────────────────────────────────────────────────────────────────────

export function triggerHubCascade(): void {
  const state = poster004Store.getState();
  if (state.phase !== 'DEFAULT') return;

  cancelActiveRaf();
  dismissHoverInstruction();
  poster004Store.setPhase('CASCADE_HUB');

  if (prefersReducedMotion()) {
    runOpacitySnap(() => {
      for (const c of CARRIERS) {
        poster004Store.setCarrierScale(c.id, 1);
      }
    }, () => {
      poster004Store.setPhase('POST_HUB');
    });
    return;
  }

  const t0 = performance.now();
  let pulsesLaunched = false;
  const blobGrowStart: Partial<Record<CarrierId, number>> = {};

  const animate = (now: number) => {
    const t = now - t0;

    // Hub physical pulse over 0..HUB_PHYSICAL_PULSE_MS.
    if (t <= HUB_PHYSICAL_PULSE_MS) {
      const u = t / HUB_PHYSICAL_PULSE_MS;
      poster004Store.setHubPulseScale(
        1 + (HUB_PULSE_PEAK_SCALE - 1) * sinBell(u),
      );
    } else {
      poster004Store.setHubPulseScale(1);
    }

    // Launch pulses at PULSE_LAUNCH_AT_MS.
    if (!pulsesLaunched && t >= PULSE_LAUNCH_AT_MS) {
      pulsesLaunched = true;
      poster004Store.setActivePulses(buildHubToCarrierPulses());
    }

    // Advance pulses; trigger blob grow on arrival.
    if (pulsesLaunched) {
      const elapsed = t - PULSE_LAUNCH_AT_MS;
      const remaining: Pulse[] = [];
      for (const p of poster004Store.getState().activePulses) {
        const distance = elapsed * PULSE_TRAVEL_SPEED_PX_PER_MS;
        const progress = Math.min(1, distance / p.pathLength);
        if (progress >= 1) {
          if (blobGrowStart[p.carrierId] === undefined) {
            blobGrowStart[p.carrierId] = now;
          }
        } else {
          remaining.push({ ...p, progress });
        }
      }
      poster004Store.setActivePulses(remaining);
    }

    // Update blob scales.
    let allDone = pulsesLaunched;
    for (const carrier of CARRIERS) {
      const start = blobGrowStart[carrier.id];
      if (start === undefined) {
        allDone = false;
        continue;
      }
      const u = Math.min(1, (now - start) / BLOB_GROW_MS);
      poster004Store.setCarrierScale(carrier.id, easeInOutCubic(u));
      if (u < 1) allDone = false;
    }

    poster004Store.notify();

    if (allDone) {
      poster004Store.setPhase('POST_HUB');
      poster004Store.setActivePulses([]);
      poster004Store.notify();
      activeRaf = null;
      return;
    }
    activeRaf = requestAnimationFrame(animate);
  };
  activeRaf = requestAnimationFrame(animate);
}

// ─────────────────────────────────────────────────────────────────────
// CASCADE_ALL: not-yet-seen carriers → their sectors
// ─────────────────────────────────────────────────────────────────────

export function triggerAllCascade(): void {
  const state = poster004Store.getState();
  if (state.phase !== 'POST_HUB') return;

  // Collect carriers whose sectors haven't been revealed yet.
  const pending = CARRIERS.filter((c) => !state.hasSeenCarrier[c.id]);
  if (pending.length === 0) return; // No-op: everything already seen.

  cancelActiveRaf();
  poster004Store.setPhase('CASCADE_ALL');

  if (prefersReducedMotion()) {
    runOpacitySnap(() => {
      for (const c of pending) {
        for (const s of c.sectors) {
          poster004Store.setSectorScale(s.id, 1);
        }
        poster004Store.markSeen(c.id);
      }
    }, () => {
      poster004Store.setPhase('POST_HUB');
    });
    return;
  }

  const t0 = performance.now();
  let pulsesLaunched = false;
  const sectorGrowStart: Record<string, number> = {};
  const allPendingSectorIds = pending.flatMap((c) => c.sectors.map((s) => s.id));

  const animate = (now: number) => {
    const t = now - t0;

    // Pending carriers physical-pulse simultaneously.
    if (t <= CARRIER_PHYSICAL_PULSE_MS) {
      const u = t / CARRIER_PHYSICAL_PULSE_MS;
      const scale = 1 + (CARRIER_PULSE_PEAK_SCALE - 1) * sinBell(u);
      for (const c of pending) {
        poster004Store.setCarrierPulseScale(c.id, scale);
      }
    } else {
      for (const c of pending) {
        poster004Store.setCarrierPulseScale(c.id, 1);
      }
    }

    if (!pulsesLaunched && t >= PULSE_LAUNCH_AT_MS) {
      pulsesLaunched = true;
      const pulses = pending.flatMap((c) => buildCarrierToSectorPulses(c));
      poster004Store.setActivePulses(pulses);
    }

    if (pulsesLaunched) {
      const elapsed = t - PULSE_LAUNCH_AT_MS;
      const remaining: Pulse[] = [];
      for (const p of poster004Store.getState().activePulses) {
        const distance = elapsed * PULSE_TRAVEL_SPEED_PX_PER_MS;
        const progress = Math.min(1, distance / p.pathLength);
        if (progress >= 1) {
          if (p.sectorId && sectorGrowStart[p.sectorId] === undefined) {
            sectorGrowStart[p.sectorId] = now;
          }
        } else {
          remaining.push({ ...p, progress });
        }
      }
      poster004Store.setActivePulses(remaining);
    }

    let allDone = pulsesLaunched;
    for (const sectorId of allPendingSectorIds) {
      const start = sectorGrowStart[sectorId];
      if (start === undefined) {
        allDone = false;
        continue;
      }
      const u = Math.min(1, (now - start) / BLOB_GROW_MS);
      poster004Store.setSectorScale(sectorId, easeInOutCubic(u));
      if (u < 1) allDone = false;
    }

    poster004Store.notify();

    if (allDone) {
      for (const c of pending) {
        poster004Store.markSeen(c.id);
      }
      poster004Store.setPhase('POST_HUB');
      poster004Store.setActivePulses([]);
      poster004Store.notify();
      activeRaf = null;
      return;
    }
    activeRaf = requestAnimationFrame(animate);
  };
  activeRaf = requestAnimationFrame(animate);
}

// ─────────────────────────────────────────────────────────────────────
// CASCADE_FOCUS: one carrier → its sectors (first-hover replay only)
// ─────────────────────────────────────────────────────────────────────

export function enterCarrierFocus(id: CarrierId): void {
  const state = poster004Store.getState();
  if (state.phase !== 'POST_HUB' && state.phase !== 'CASCADE_FOCUS') return;

  // Cancel any pending exit-focus timer (re-targeting between carriers).
  cancelExitFocusTimer();

  const wasSeen = state.hasSeenCarrier[id];
  poster004Store.setFocusCarrier(id);

  if (wasSeen || prefersReducedMotion()) {
    // Snap variant: dim mask only, no replay.
    poster004Store.notify();
    return;
  }

  // First-hover replay for carrier id.
  cancelActiveRaf();
  poster004Store.setPhase('CASCADE_FOCUS');
  poster004Store.markSeen(id);

  const carrier = CARRIER_BY_ID[id];
  const t0 = performance.now();
  let pulsesLaunched = false;
  const sectorGrowStart: Record<string, number> = {};

  const animate = (now: number) => {
    const t = now - t0;

    if (t <= CARRIER_PHYSICAL_PULSE_MS) {
      const u = t / CARRIER_PHYSICAL_PULSE_MS;
      poster004Store.setCarrierPulseScale(
        id,
        1 + (CARRIER_PULSE_PEAK_SCALE - 1) * sinBell(u),
      );
    } else {
      poster004Store.setCarrierPulseScale(id, 1);
    }

    if (!pulsesLaunched && t >= PULSE_LAUNCH_AT_MS) {
      pulsesLaunched = true;
      poster004Store.setActivePulses(buildCarrierToSectorPulses(carrier));
    }

    if (pulsesLaunched) {
      const elapsed = t - PULSE_LAUNCH_AT_MS;
      const remaining: Pulse[] = [];
      for (const p of poster004Store.getState().activePulses) {
        const distance = elapsed * PULSE_TRAVEL_SPEED_PX_PER_MS;
        const progress = Math.min(1, distance / p.pathLength);
        if (progress >= 1) {
          if (p.sectorId && sectorGrowStart[p.sectorId] === undefined) {
            sectorGrowStart[p.sectorId] = now;
          }
        } else {
          remaining.push({ ...p, progress });
        }
      }
      poster004Store.setActivePulses(remaining);
    }

    let allDone = pulsesLaunched;
    for (const s of carrier.sectors) {
      const start = sectorGrowStart[s.id];
      if (start === undefined) {
        allDone = false;
        continue;
      }
      const u = Math.min(1, (now - start) / BLOB_GROW_MS);
      poster004Store.setSectorScale(s.id, easeInOutCubic(u));
      if (u < 1) allDone = false;
    }

    poster004Store.notify();

    if (allDone) {
      poster004Store.setPhase('POST_HUB');
      poster004Store.setActivePulses([]);
      poster004Store.notify();
      activeRaf = null;
      return;
    }
    activeRaf = requestAnimationFrame(animate);
  };
  activeRaf = requestAnimationFrame(animate);
}

export function exitCarrierFocus(): void {
  // Debounced — gives the user 300ms to re-enter another carrier
  // without the dim mask collapsing.
  cancelExitFocusTimer();
  exitFocusTimer = setTimeout(() => {
    exitFocusTimer = null;
    const state = poster004Store.getState();
    if (state.focusCarrier === null) return;
    poster004Store.setFocusCarrier(null);
    poster004Store.notify();
  }, HOVER_DEBOUNCE_MS);
}

/** Cancel a pending exit-focus timer. Used when a different carrier is entered. */
export function cancelPendingExitFocus(): void {
  cancelExitFocusTimer();
}

// ─────────────────────────────────────────────────────────────────────
// Play animation: hard reset + auto-cascade
// ─────────────────────────────────────────────────────────────────────

export function playAnimation(): void {
  cancelActiveRaf();
  cancelExitFocusTimer();
  poster004Store.resetAll();

  // Run the cascades in sequence, separated by HOVER_EXTEND_THRESHOLD_MS.
  triggerHubCascade();

  // Watch for CASCADE_HUB to settle, then chain into CASCADE_ALL.
  const unsub = poster004Store.subscribe((s) => {
    if (s.phase === 'POST_HUB') {
      unsub();
      setTimeout(() => {
        if (poster004Store.getState().phase === 'POST_HUB') {
          triggerAllCascade();
        }
      }, HOVER_EXTEND_THRESHOLD_MS);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────
// View as poster: snap to fully-revealed
// ─────────────────────────────────────────────────────────────────────

export function goFull(): void {
  cancelActiveRaf();
  cancelExitFocusTimer();
  poster004Store.snapToFull();
}

// ─────────────────────────────────────────────────────────────────────
// Reset
// ─────────────────────────────────────────────────────────────────────

export function reset(): void {
  cancelActiveRaf();
  cancelExitFocusTimer();
  cancelInstructionFadeTimer();
  poster004Store.resetAll();
}

// ─────────────────────────────────────────────────────────────────────
// Reduced-motion snap helper
// ─────────────────────────────────────────────────────────────────────

/**
 * Run a 200ms opacity-only fade from current state to the target
 * state described by `applyTargets`. Used by every cascade entrypoint
 * under reduced motion.
 *
 * Implementation is simple: we set the targets immediately and rely
 * on CSS opacity transitions in the viz layers. The store's scale
 * values jump to 1 in one frame; the visual fade is owed by the SVG
 * `<g>` elements' `style.transition: opacity 200ms`.
 */
function runOpacitySnap(
  applyTargets: () => void,
  onSettled: () => void,
): void {
  applyTargets();
  poster004Store.notify();
  // After OPACITY_CROSSFADE_MS, transition phase.
  setTimeout(() => {
    onSettled();
    poster004Store.notify();
  }, OPACITY_CROSSFADE_MS);
}
