/**
 * Poster 004 — animation engine.
 *
 * State machine driving the seven phases (DEFAULT → CASCADE_1 →
 * CARRIERS_ONLY → CASCADE_2 → FULL → CARRIER_FOCUS, plus STATIC),
 * plus the per-frame numeric updates the viz layers read from the
 * store.
 *
 * The engine is the only writer of `phase`, `hubPulseScale`,
 * `carrierPulseScales`, `carrierScales`, `sectorScales`, and
 * `activePulses`. Hub / Carriers / Sectors / Pulses subscribe to
 * the store and apply changes via direct DOM mutation; they do not
 * re-render through React during cascades.
 *
 * Reduced-motion check happens at every public entrypoint. Under
 * `prefers-reduced-motion: reduce` cascades become a 200ms opacity
 * fade-in to the end state (no pulses, no physical pulses, no
 * scaling).
 *
 * Cascades are commit-on-first-frame: once a cascade starts, it
 * runs to completion regardless of pointer state. This avoids the
 * "I twitched and lost the animation" failure mode.
 */

import {
  CARRIERS,
  CARRIER_BY_ID,
  HUB_CX,
  HUB_CY,
  carrierCentre,
  sectorCentre,
  type CarrierId,
} from './poster004Data';
import { poster004Store, type Pulse } from './poster004Store';

// ─────────────────────────────────────────────────────────────────────
// Timing constants — exported so commit 7 polish can tune them in
// one place. Brief specifies cubic ease-in-out throughout. The
// "physical pulse" on hub and carriers uses a simple expand-retract
// scale tween, not a spring.
// ─────────────────────────────────────────────────────────────────────

export const HUB_PULSE_DURATION_MS = 250;
export const HUB_PULSE_PEAK_SCALE = 1.15;

export const CARRIER_PULSE_DURATION_MS = 250;
export const CARRIER_PULSE_PEAK_SCALE = 1.12;

/**
 * Pulse launch happens at peak hub-pulse expansion. With a 250ms
 * pulse following a sin-bell, peak is at 125ms.
 */
export const PULSE_LAUNCH_OFFSET_MS = HUB_PULSE_DURATION_MS / 2;

/**
 * Pulse travel speed. Tuned so cascade-1 nearest pulses arrive at
 * ~600ms and farthest at ~800ms after launch (per brief). Adjust
 * if per-carrier distances change.
 */
export const PULSE_TRAVEL_SPEED_PX_PER_MS = 0.28;

export const BLOB_GROW_DURATION_MS = 200;
export const LABEL_FADE_MS = 200;
export const FOCUS_FADE_MS = 200;

/** Other-carrier opacity in CARRIER_FOCUS. Brief says ~5%. */
export const DIM_OPACITY = 0.05;

// ─────────────────────────────────────────────────────────────────────
// Internal state — each cascade owns its RAF id so reset() can
// cancel cleanly. We never run more than one cascade at a time.
// ─────────────────────────────────────────────────────────────────────

let activeRaf: number | null = null;

function cancelActiveRaf(): void {
  if (activeRaf !== null) {
    cancelAnimationFrame(activeRaf);
    activeRaf = null;
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Cubic ease-in-out — used for blob grow and focus fades.
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Sin-bell — used for the physical pulse scale tween. f(0) = 0,
// f(0.5) = 1 (peak), f(1) = 0.
function sinBell(t: number): number {
  return Math.sin(t * Math.PI);
}

// ─────────────────────────────────────────────────────────────────────
// Cascade 1 — hub physical pulse, then six pulses launch to
// carriers, blobs grow on arrival.
// ─────────────────────────────────────────────────────────────────────

function buildCascade1Pulses(): Pulse[] {
  return CARRIERS.map((carrier) => {
    const cc = carrierCentre(carrier);
    const dx = cc.x - HUB_CX;
    const dy = cc.y - HUB_CY;
    const len = Math.hypot(dx, dy);
    return {
      id: `c1-${carrier.id}`,
      fromX: HUB_CX,
      fromY: HUB_CY,
      toX: cc.x,
      toY: cc.y,
      pathLength: len,
      progress: 0,
      colour: carrier.colour,
      carrierId: carrier.id,
    };
  });
}

export function startCascade1(): void {
  const state = poster004Store.getState();
  if (state.phase !== 'DEFAULT') return;

  cancelActiveRaf();
  poster004Store.setPhase('CASCADE_1');

  if (prefersReducedMotion()) {
    // Snap path: fade carriers in over LABEL_FADE_MS, no pulse.
    const t0 = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - t0) / LABEL_FADE_MS);
      for (const c of CARRIERS) {
        poster004Store.setCarrierScale(c.id, t);
      }
      poster004Store.notify();
      if (t < 1) {
        activeRaf = requestAnimationFrame(animate);
      } else {
        poster004Store.setPhase('CARRIERS_ONLY');
        poster004Store.notify();
        activeRaf = null;
      }
    };
    activeRaf = requestAnimationFrame(animate);
    return;
  }

  // Full animation path.
  let pulsesLaunched = false;
  const blobGrowStartByCarrier: Partial<Record<CarrierId, number>> = {};
  const t0 = performance.now();

  const animate = (now: number) => {
    const t = now - t0;

    // Hub physical pulse.
    if (t <= HUB_PULSE_DURATION_MS) {
      const u = t / HUB_PULSE_DURATION_MS;
      const bell = sinBell(u);
      poster004Store.setHubPulseScale(1 + (HUB_PULSE_PEAK_SCALE - 1) * bell);
    } else {
      poster004Store.setHubPulseScale(1);
    }

    // Launch pulses at hub-pulse peak.
    if (!pulsesLaunched && t >= PULSE_LAUNCH_OFFSET_MS) {
      pulsesLaunched = true;
      poster004Store.setActivePulses(buildCascade1Pulses());
    }

    // Advance pulses; trigger blob grow on arrival.
    if (pulsesLaunched) {
      const elapsedSinceLaunch = t - PULSE_LAUNCH_OFFSET_MS;
      const pulses = poster004Store.getState().activePulses;
      const remaining: Pulse[] = [];
      for (const p of pulses) {
        const distance = elapsedSinceLaunch * PULSE_TRAVEL_SPEED_PX_PER_MS;
        const progress = Math.min(1, distance / p.pathLength);
        if (progress >= 1) {
          // Pulse arrives — start blob grow if not already started.
          if (blobGrowStartByCarrier[p.carrierId] === undefined) {
            blobGrowStartByCarrier[p.carrierId] = now;
          }
          // Pulse dissolves; drop from active list.
        } else {
          remaining.push({ ...p, progress });
        }
      }
      poster004Store.setActivePulses(remaining);
    }

    // Update each carrier's blob scale based on its grow start time.
    let allGrownDone = pulsesLaunched;
    for (const carrier of CARRIERS) {
      const grewAt = blobGrowStartByCarrier[carrier.id];
      if (grewAt === undefined) {
        allGrownDone = false;
        continue;
      }
      const u = Math.min(1, (now - grewAt) / BLOB_GROW_DURATION_MS);
      poster004Store.setCarrierScale(carrier.id, easeInOutCubic(u));
      if (u < 1) allGrownDone = false;
    }

    poster004Store.notify();

    if (allGrownDone) {
      poster004Store.setPhase('CARRIERS_ONLY');
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
// Cascade 2 — all six carriers physical pulse simultaneously, then
// each launches one pulse per sector, sector dots grow on arrival.
// ─────────────────────────────────────────────────────────────────────

function buildCascade2Pulses(): Pulse[] {
  const out: Pulse[] = [];
  for (const carrier of CARRIERS) {
    const cc = carrierCentre(carrier);
    for (const sector of carrier.sectors) {
      const sc = sectorCentre(carrier, sector);
      const dx = sc.x - cc.x;
      const dy = sc.y - cc.y;
      const len = Math.hypot(dx, dy);
      out.push({
        id: `c2-${sector.id}`,
        fromX: cc.x,
        fromY: cc.y,
        toX: sc.x,
        toY: sc.y,
        pathLength: len,
        progress: 0,
        colour: carrier.colour,
        carrierId: carrier.id,
      });
    }
  }
  return out;
}

export function startCascade2(): void {
  const state = poster004Store.getState();
  if (state.phase !== 'CARRIERS_ONLY') return;

  cancelActiveRaf();
  poster004Store.setPhase('CASCADE_2');

  if (prefersReducedMotion()) {
    const t0 = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - t0) / LABEL_FADE_MS);
      for (const c of CARRIERS) {
        for (const s of c.sectors) {
          poster004Store.setSectorScale(s.id, t);
        }
      }
      poster004Store.notify();
      if (t < 1) {
        activeRaf = requestAnimationFrame(animate);
      } else {
        poster004Store.setPhase('FULL');
        poster004Store.notify();
        activeRaf = null;
      }
    };
    activeRaf = requestAnimationFrame(animate);
    return;
  }

  let pulsesLaunched = false;
  const sectorGrowStart: Record<string, number> = {};
  const t0 = performance.now();

  const animate = (now: number) => {
    const t = now - t0;

    // All six carriers pulse together.
    if (t <= CARRIER_PULSE_DURATION_MS) {
      const u = t / CARRIER_PULSE_DURATION_MS;
      const bell = sinBell(u);
      const scale = 1 + (CARRIER_PULSE_PEAK_SCALE - 1) * bell;
      for (const c of CARRIERS) {
        poster004Store.setCarrierPulseScale(c.id, scale);
      }
    } else {
      for (const c of CARRIERS) {
        poster004Store.setCarrierPulseScale(c.id, 1);
      }
    }

    if (!pulsesLaunched && t >= PULSE_LAUNCH_OFFSET_MS) {
      pulsesLaunched = true;
      poster004Store.setActivePulses(buildCascade2Pulses());
    }

    if (pulsesLaunched) {
      const elapsedSinceLaunch = t - PULSE_LAUNCH_OFFSET_MS;
      const pulses = poster004Store.getState().activePulses;
      const remaining: Pulse[] = [];
      for (const p of pulses) {
        const distance = elapsedSinceLaunch * PULSE_TRAVEL_SPEED_PX_PER_MS;
        const progress = Math.min(1, distance / p.pathLength);
        if (progress >= 1) {
          // Sector id is encoded in pulse id as `c2-<sectorId>`.
          const sectorId = p.id.slice(3);
          if (sectorGrowStart[sectorId] === undefined) {
            sectorGrowStart[sectorId] = now;
          }
        } else {
          remaining.push({ ...p, progress });
        }
      }
      poster004Store.setActivePulses(remaining);
    }

    let allDone = pulsesLaunched;
    for (const c of CARRIERS) {
      for (const s of c.sectors) {
        const grewAt = sectorGrowStart[s.id];
        if (grewAt === undefined) {
          allDone = false;
          continue;
        }
        const u = Math.min(1, (now - grewAt) / BLOB_GROW_DURATION_MS);
        poster004Store.setSectorScale(s.id, easeInOutCubic(u));
        if (u < 1) allDone = false;
      }
    }

    poster004Store.notify();

    if (allDone) {
      poster004Store.setPhase('FULL');
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
// Carrier focus — first hover on a given carrier replays the cascade
// for that branch; subsequent hovers snap.
// ─────────────────────────────────────────────────────────────────────

export function startCarrierFocus(id: CarrierId): void {
  const state = poster004Store.getState();
  if (state.phase !== 'FULL' && state.phase !== 'CARRIER_FOCUS') return;

  cancelActiveRaf();
  poster004Store.setPhase('CARRIER_FOCUS');
  poster004Store.setHoveredCarrier(id);

  const seen = state.hasSeenCarrier[id];
  poster004Store.markSeen(id);

  if (prefersReducedMotion() || seen) {
    // Snap variant: just fade other carriers, no replay.
    poster004Store.notify();
    return;
  }

  // First-hover variant: physical carrier pulse + sector retract +
  // re-cascade pulses.
  const carrier = CARRIER_BY_ID[id];
  const cc = carrierCentre(carrier);

  // Retract this carrier's sectors, then replay pulses.
  const retractStart = performance.now();
  let pulsesLaunched = false;
  const sectorRegrowStart: Record<string, number> = {};
  const focusPulses: Pulse[] = carrier.sectors.map((sector) => {
    const sc = sectorCentre(carrier, sector);
    const dx = sc.x - cc.x;
    const dy = sc.y - cc.y;
    return {
      id: `cf-${sector.id}`,
      fromX: cc.x,
      fromY: cc.y,
      toX: sc.x,
      toY: sc.y,
      pathLength: Math.hypot(dx, dy),
      progress: 0,
      colour: carrier.colour,
      carrierId: carrier.id,
    };
  });

  const animate = (now: number) => {
    const t = now - retractStart;

    // Carrier physical pulse 0..CARRIER_PULSE_DURATION_MS.
    if (t <= CARRIER_PULSE_DURATION_MS) {
      const u = t / CARRIER_PULSE_DURATION_MS;
      poster004Store.setCarrierPulseScale(
        id,
        1 + (CARRIER_PULSE_PEAK_SCALE - 1) * sinBell(u),
      );
    } else {
      poster004Store.setCarrierPulseScale(id, 1);
    }

    // Sector retract: reverse blob grow over BLOB_GROW_DURATION_MS,
    // ends right at PULSE_LAUNCH_OFFSET_MS so retraction completes
    // before pulses arrive.
    if (t <= BLOB_GROW_DURATION_MS) {
      const u = Math.min(1, t / BLOB_GROW_DURATION_MS);
      const v = 1 - easeInOutCubic(u);
      for (const s of carrier.sectors) {
        poster004Store.setSectorScale(s.id, v);
      }
    } else {
      for (const s of carrier.sectors) {
        if (sectorRegrowStart[s.id] === undefined) {
          poster004Store.setSectorScale(s.id, 0);
        }
      }
    }

    // Launch focused-branch pulses at the same offset as cascade-2.
    if (!pulsesLaunched && t >= PULSE_LAUNCH_OFFSET_MS) {
      pulsesLaunched = true;
      poster004Store.setActivePulses(focusPulses);
    }

    if (pulsesLaunched) {
      const elapsedSinceLaunch = t - PULSE_LAUNCH_OFFSET_MS;
      const pulses = poster004Store.getState().activePulses;
      const remaining: Pulse[] = [];
      for (const p of pulses) {
        const distance = elapsedSinceLaunch * PULSE_TRAVEL_SPEED_PX_PER_MS;
        const progress = Math.min(1, distance / p.pathLength);
        if (progress >= 1) {
          const sectorId = p.id.slice(3); // strip "cf-"
          if (sectorRegrowStart[sectorId] === undefined) {
            sectorRegrowStart[sectorId] = now;
          }
        } else {
          remaining.push({ ...p, progress });
        }
      }
      poster004Store.setActivePulses(remaining);
    }

    let regrowDone = pulsesLaunched;
    for (const s of carrier.sectors) {
      const grewAt = sectorRegrowStart[s.id];
      if (grewAt === undefined) {
        regrowDone = false;
        continue;
      }
      const u = Math.min(1, (now - grewAt) / BLOB_GROW_DURATION_MS);
      poster004Store.setSectorScale(s.id, easeInOutCubic(u));
      if (u < 1) regrowDone = false;
    }

    poster004Store.notify();

    // Done when all focus pulses landed and re-grew. The carrier
    // remains in CARRIER_FOCUS until endCarrierFocus() is called.
    if (regrowDone) {
      poster004Store.setActivePulses([]);
      poster004Store.notify();
      activeRaf = null;
      return;
    }

    activeRaf = requestAnimationFrame(animate);
  };
  activeRaf = requestAnimationFrame(animate);
}

export function endCarrierFocus(): void {
  const state = poster004Store.getState();
  if (state.phase !== 'CARRIER_FOCUS') return;

  cancelActiveRaf();
  // If the user mouses off mid-animation, sector / pulse scales may
  // be left partway through a tween. Snap everything back to full
  // size so the FULL view is correct.
  for (const c of CARRIERS) {
    poster004Store.setCarrierPulseScale(c.id, 1);
    for (const s of c.sectors) {
      poster004Store.setSectorScale(s.id, 1);
    }
  }
  poster004Store.setActivePulses([]);
  poster004Store.setPhase('FULL');
  poster004Store.setHoveredCarrier(null);
  // The opacity fade-back is rendered by the Carriers/Sectors layers
  // observing `hoveredCarrier === null`. No store animation needed.
  poster004Store.notify();
}

// ─────────────────────────────────────────────────────────────────────
// Reset & static.
// ─────────────────────────────────────────────────────────────────────

export function reset(): void {
  cancelActiveRaf();
  poster004Store.resetAll();
}

export function goStatic(): void {
  cancelActiveRaf();
  // Snap to the post-cascade resting state: all carriers and sectors
  // at full size, no hover, no pulses. Phase = STATIC dismisses
  // hover affordances (Carriers / Hub stop responding to pointer
  // events).
  for (const c of CARRIERS) {
    poster004Store.setCarrierScale(c.id, 1);
    poster004Store.setCarrierPulseScale(c.id, 1);
    for (const s of c.sectors) {
      poster004Store.setSectorScale(s.id, 1);
    }
  }
  poster004Store.setHubPulseScale(1);
  poster004Store.setHoveredCarrier(null);
  poster004Store.setActivePulses([]);
  poster004Store.setPhase('STATIC');
  poster004Store.notify();
}
