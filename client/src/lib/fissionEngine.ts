// Framework-free particle physics engine for the Fission Room.
// Owns the canonical state arrays that the renderer reads each frame
// via BufferAttributes. Step semantics, force model, and cascade
// behaviour follow FISSION_BRIEF.md Phase 6, with Phase 6.1 layering
// in spent flags (for natural termination), a heat buffer (for the
// thermal palette), and auto-reset on idle.

import { TUNING, BREATHING, type Quality } from './fissionTuning';
import { spawnBurstRing } from '@/components/FissionBurstRings';

// State codes are floats so the WebGL shader can read them as a
// vertex attribute without integer-conversion overhead. Phase 6.1
// kept this shape for parity even though the renderer now reads
// `heat` instead of `states`.
//   0 = bound       resting
//   1 = excited     warming up, about to fission
//   2 = released    drifting outward after fission
//   3 = recohering  returning to bound, strongly spring-pulled
export type ParticleState = 0 | 1 | 2 | 3;

const STATE_BOUND = 0;
const STATE_EXCITED = 1;
const STATE_RELEASED = 2;
const STATE_RECOHERING = 3;

// Spring-force scale by state. Bound and recohering particles get the
// full spring; excited and released get progressively weaker, which
// is how the form 'opens' during cascade and re-cohers afterwards.
function springScaleFor(state: number): number {
  if (state === STATE_BOUND || state === STATE_RECOHERING) return 1.0;
  if (state === STATE_EXCITED) return 0.6;
  return 0.3; // released
}

// Decay window for the released-state heat curve. Independent of the
// recohere delay so the visual cools faster than the physical return.
const HEAT_RELEASE_DECAY_MS = 1500;

export type Neutron = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bornAt: number; // engine elapsedMs when spawned
  alive: boolean;
};

// Uniform grid over world space, keyed on rest position. Built once
// from rests at engine construction; never rebuilt. Cell size is
// CASCADE_RADIUS * 2 so any neighbour within radius lives in this
// cell or an adjacent one.
//
// NOTE: unused after Phase 6.2 - retained for Phase 9 multi-nucleus
// spatial queries (when neutrons need to find target nuclei). The
// constructor still allocates the grid; the per-frame cost is zero.
class SpatialGrid {
  private cells: Int32Array[];
  private readonly cellSize: number;
  private readonly gridW: number;
  private readonly gridH: number;
  private readonly originX: number;
  private readonly originY: number;

  constructor(rests: Float32Array, count: number, cellSize: number) {
    this.cellSize = cellSize;
    this.originX = -1.2;
    this.originY = -1.2;
    this.gridW = Math.ceil(2.4 / cellSize);
    this.gridH = Math.ceil(2.4 / cellSize);
    const totalCells = this.gridW * this.gridH;

    const counts = new Int32Array(totalCells);
    for (let i = 0; i < count; i++) {
      const cx = Math.floor((rests[i * 2] - this.originX) / cellSize);
      const cy = Math.floor((rests[i * 2 + 1] - this.originY) / cellSize);
      if (cx >= 0 && cx < this.gridW && cy >= 0 && cy < this.gridH) {
        counts[cy * this.gridW + cx]++;
      }
    }

    this.cells = new Array(totalCells);
    for (let c = 0; c < totalCells; c++) {
      this.cells[c] = new Int32Array(counts[c]);
    }

    const fill = new Int32Array(totalCells);
    for (let i = 0; i < count; i++) {
      const cx = Math.floor((rests[i * 2] - this.originX) / cellSize);
      const cy = Math.floor((rests[i * 2 + 1] - this.originY) / cellSize);
      if (cx >= 0 && cx < this.gridW && cy >= 0 && cy < this.gridH) {
        const cellIdx = cy * this.gridW + cx;
        this.cells[cellIdx][fill[cellIdx]++] = i;
      }
    }
  }

  queryRadius(x: number, y: number, radius: number, out: number[]): void {
    const minCx = Math.max(
      0,
      Math.floor((x - radius - this.originX) / this.cellSize),
    );
    const maxCx = Math.min(
      this.gridW - 1,
      Math.floor((x + radius - this.originX) / this.cellSize),
    );
    const minCy = Math.max(
      0,
      Math.floor((y - radius - this.originY) / this.cellSize),
    );
    const maxCy = Math.min(
      this.gridH - 1,
      Math.floor((y + radius - this.originY) / this.cellSize),
    );

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const cell = this.cells[cy * this.gridW + cx];
        for (let i = 0; i < cell.length; i++) {
          out.push(cell[i]);
        }
      }
    }
  }
}

type EngineOpts = {
  points: Float32Array; // flat [x0,y0,x1,y1,...], length count*2
  count: number;
  quality: Quality;
};

export class FissionEngine {
  readonly count: number;

  // Canonical state - the renderer reads these arrays directly.
  readonly positions: Float32Array;
  readonly states: Float32Array;
  readonly rests: Float32Array;
  readonly phases: Float32Array;
  // Derived per-particle thermal energy in [0, 1], updated each frame
  // from state + elapsed. Renderer reads this for the thermal
  // gradient (cream → ochre → red); states stays as the state
  // machine's source of truth.
  readonly heat: Float32Array;

  // Public counters - the page reads these to update UI overlays.
  energyMeV = 0;
  liveNeutrons = 0;
  liveExcited = 0;

  // Neutron pool is exposed publicly (read-only by convention) so the
  // FissionNeutrons renderer can iterate and read positions/ages.
  readonly neutrons: Neutron[];

  // Internal-only mutable state.
  private readonly velocities: Float32Array;
  private readonly forces: Float32Array;
  private readonly excitedSince: Float64Array;
  private readonly releasedSince: Float64Array;
  // 1 = particle has already fissioned this cycle and cannot be
  // re-excited until resetSpent runs (either via the idle auto-reset
  // or an explicit engine.reset() call).
  private readonly spent: Uint8Array;
  private readonly grid: SpatialGrid;
  private readonly neighbourBuffer: number[] = [];

  private cursorX: number | null = null;
  private cursorY: number | null = null;
  private moderatorRatio = TUNING.MODERATOR_DEFAULT;
  private _elapsedMs = 0;
  private idleMs = 0;

  get elapsedMs(): number {
    return this._elapsedMs;
  }

  constructor(opts: EngineOpts) {
    this.count = opts.count;
    const n = opts.count;

    this.positions = new Float32Array(n * 3);
    this.rests = new Float32Array(n * 2);
    this.phases = new Float32Array(n);
    this.states = new Float32Array(n);
    this.heat = new Float32Array(n);
    this.velocities = new Float32Array(n * 2);
    this.forces = new Float32Array(n * 2);
    this.excitedSince = new Float64Array(n);
    this.releasedSince = new Float64Array(n);
    this.spent = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
      const x = opts.points[i * 2];
      const y = opts.points[i * 2 + 1];
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = 0;
      this.rests[i * 2] = x;
      this.rests[i * 2 + 1] = y;
      this.phases[i] = Math.random() * Math.PI * 2;
      this.states[i] = STATE_BOUND;
    }

    this.grid = new SpatialGrid(this.rests, n, TUNING.CASCADE_RADIUS * 2);

    this.neutrons = new Array(TUNING.MAX_LIVE_NEUTRONS);
    for (let i = 0; i < this.neutrons.length; i++) {
      this.neutrons[i] = { x: 0, y: 0, vx: 0, vy: 0, bornAt: 0, alive: false };
    }
  }

  // ─── Inputs ────────────────────────────────────────────────────

  injectNeutron(x: number, y: number, vx: number, vy: number): void {
    for (let i = 0; i < this.neutrons.length; i++) {
      const n = this.neutrons[i];
      if (!n.alive) {
        n.x = x;
        n.y = y;
        n.vx = vx;
        n.vy = vy;
        n.bornAt = this._elapsedMs;
        n.alive = true;
        this.liveNeutrons++;
        return;
      }
    }
    // Pool exhausted; drop silently per brief.
  }

  setCursor(x: number | null, y: number | null): void {
    this.cursorX = x;
    this.cursorY = y;
  }

  setModeratorRatio(r: number): void {
    this.moderatorRatio = Math.max(0, Math.min(1, r));
  }

  // Directly excite a bound, non-spent particle. Backs the click
  // handler when the click lands close enough to the cloud that
  // launching a neutron would skip past its target in the first
  // frame; this guarantees a reaction on every click landing on the
  // cloud, no matter how dense the local region is.
  exciteDirect(idx: number): void {
    if (idx < 0 || idx >= this.count) return;
    if (this.states[idx] !== STATE_BOUND) return;
    if (this.spent[idx] === 1) return;
    this.states[idx] = STATE_EXCITED;
    this.excitedSince[idx] = this._elapsedMs;
    this.liveExcited++;
  }

  // Returns the index of the closest bound, non-spent particle to the
  // given world coordinate, using *current* positions (not rests) -
  // because the user is clicking on what they see, and a recohered
  // particle that drifted slightly should still register at its
  // visible location. Returns null if no eligible particle exists.
  findNearestBound(x: number, y: number): number | null {
    let bestIdx = -1;
    let bestD2 = Infinity;
    for (let i = 0; i < this.count; i++) {
      if (this.states[i] !== STATE_BOUND) continue;
      if (this.spent[i] === 1) continue;
      const dx = this.positions[i * 3] - x;
      const dy = this.positions[i * 3 + 1] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestIdx = i;
      }
    }
    return bestIdx === -1 ? null : bestIdx;
  }

  // Phase 6 scaffolding. Picks the bound, non-spent particle closest
  // to (0, 0) and lights it; cascade propagates from there.
  triggerTestCascade(): void {
    let bestIdx = -1;
    let bestR2 = Infinity;
    for (let i = 0; i < this.count; i++) {
      if (this.states[i] !== STATE_BOUND) continue;
      if (this.spent[i] === 1) continue;
      const x = this.rests[i * 2];
      const y = this.rests[i * 2 + 1];
      const r2 = x * x + y * y;
      if (r2 < bestR2) {
        bestR2 = r2;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      this.states[bestIdx] = STATE_EXCITED;
      this.excitedSince[bestIdx] = this._elapsedMs;
      this.liveExcited++;
    }
  }

  // Clears all spent flags so the form is ready to fission again.
  // Called automatically when the room has been idle, or manually via
  // reset() for a hard restart.
  private resetSpent(): void {
    this.spent.fill(0);
  }

  // Public hard reset: forget everything that happened. The state
  // machine itself is unaffected (it's already at STATE_BOUND when
  // idle), so this is effectively "clear the energy counter and let
  // every particle fire again." Not wired to any UI in Phase 6.1.
  reset(): void {
    this.resetSpent();
    this.energyMeV = 0;
    this.idleMs = 0;
  }

  // ─── Tick ──────────────────────────────────────────────────────

  step(dtMs: number): void {
    // Clamp to defend against frame stutters.
    const dt = Math.min(dtMs, TUNING.MAX_DT_MS) / 1000;
    this._elapsedMs += dtMs;

    this.updateNeutrons(dt);
    this.processCascade();
    this.applyForces();
    this.integrate(dt);
    this.processRecohere();
    this.updateHeat();

    // Auto-reset: when the room has been quiet for AUTO_RESET_IDLE_MS,
    // wipe the spent flags so a new cascade can start fresh. Silent
    // to the user - just gives the room a natural rhythm between
    // clicks.
    const isIdle = this.liveExcited === 0 && this.liveNeutrons === 0;
    if (isIdle) {
      this.idleMs += dtMs;
      if (this.idleMs > TUNING.AUTO_RESET_IDLE_MS) {
        this.resetSpent();
        this.idleMs = 0;
      }
    } else {
      this.idleMs = 0;
    }
  }

  // ─── Step passes ───────────────────────────────────────────────

  private updateNeutrons(dt: number): void {
    const radius2 = TUNING.NEUTRON_HIT_RADIUS * TUNING.NEUTRON_HIT_RADIUS;
    for (let i = 0; i < this.neutrons.length; i++) {
      const n = this.neutrons[i];
      if (!n.alive) continue;

      n.x += n.vx * dt;
      n.y += n.vy * dt;

      const aliveMs = this._elapsedMs - n.bornAt;
      if (
        aliveMs > TUNING.NEUTRON_LIFE_MS ||
        n.x < -1.5 ||
        n.x > 1.5 ||
        n.y < -1.5 ||
        n.y > 1.5
      ) {
        n.alive = false;
        this.liveNeutrons--;
        continue;
      }

      for (let p = 0; p < this.count; p++) {
        if (this.states[p] !== STATE_BOUND) continue;
        if (this.spent[p] === 1) continue;
        const dx = this.positions[p * 3] - n.x;
        const dy = this.positions[p * 3 + 1] - n.y;
        if (dx * dx + dy * dy < radius2) {
          n.alive = false;
          this.liveNeutrons--;
          this.states[p] = STATE_EXCITED;
          this.excitedSince[p] = this._elapsedMs;
          this.liveExcited++;
          break;
        }
      }
    }
  }

  private processCascade(): void {
    for (let i = 0; i < this.count; i++) {
      if (this.states[i] !== STATE_EXCITED) continue;
      const elapsed = this._elapsedMs - this.excitedSince[i];
      if (elapsed < TUNING.REACTION_WINDOW_MS) continue;

      const rx = this.rests[i * 2];
      const ry = this.rests[i * 2 + 1];

      // 1) Spawn neutrons, count scaled by moderator. At moderator 0
      // we emit 1 neutron; at moderator 0.5, ~1-2; at moderator 1, ~2-3.
      // This is the *only* propagation mechanism in Phase 6.2 - the
      // invisible direct-cascade fallback was removed so every chain
      // step has a visible cause.
      const neutronCount = Math.max(
        1,
        Math.round(TUNING.NEUTRONS_BASE * (0.5 + this.moderatorRatio * 1.5)),
      );
      for (let k = 0; k < neutronCount; k++) {
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * TUNING.NEUTRON_SPEED;
        const vy = Math.sin(angle) * TUNING.NEUTRON_SPEED;
        this.injectNeutron(rx, ry, vx, vy);
      }

      // 2) Energy ledger.
      this.energyMeV += TUNING.ENERGY_PER_FISSION_MEV;

      // 3) Outward kick at the moment of release.
      const restAngle = Math.atan2(ry, rx);
      const kickAngle = restAngle + (Math.random() - 0.5) * 0.6;
      this.velocities[i * 2] = Math.cos(kickAngle) * TUNING.RELEASE_KICK_SPEED;
      this.velocities[i * 2 + 1] = Math.sin(kickAngle) * TUNING.RELEASE_KICK_SPEED;

      // 4) Visible punctuation - an expanding cream ring at the
      // fission site, drained by FissionBurstRings.
      spawnBurstRing(rx, ry);

      // 5) Transition excited → released.
      this.states[i] = STATE_RELEASED;
      this.releasedSince[i] = this._elapsedMs;
      this.liveExcited--;
    }
  }

  private applyForces(): void {
    const elapsed = this._elapsedMs;
    const cursorActive = this.cursorX !== null && this.cursorY !== null;
    const cx = this.cursorX ?? 0;
    const cy = this.cursorY ?? 0;
    const cursorR2 = TUNING.CURSOR_RADIUS * TUNING.CURSOR_RADIUS;

    for (let i = 0; i < this.count; i++) {
      const state = this.states[i];
      const springScale = springScaleFor(state);

      const px = this.positions[i * 3];
      const py = this.positions[i * 3 + 1];
      const rx = this.rests[i * 2];
      const ry = this.rests[i * 2 + 1];
      const vx = this.velocities[i * 2];
      const vy = this.velocities[i * 2 + 1];
      const phase = this.phases[i];

      // Spring toward rest.
      let fx = TUNING.SPRING_K * springScale * (rx - px);
      let fy = TUNING.SPRING_K * springScale * (ry - py);

      // Damping, linear in velocity.
      fx -= TUNING.DAMPING * vx;
      fy -= TUNING.DAMPING * vy;

      // Cursor magnetism - particles pushed AWAY from cursor, force
      // quadratic falloff to zero at CURSOR_RADIUS.
      if (cursorActive) {
        const dx = px - cx;
        const dy = py - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < cursorR2) {
          const d = Math.sqrt(d2) || 0.0001;
          const falloff = 1.0 - d / TUNING.CURSOR_RADIUS;
          const strength = TUNING.CURSOR_FORCE * falloff * falloff;
          fx += (dx / d) * strength;
          fy += (dy / d) * strength;
        }
      }

      // Brownian breath - same two-octave noise as Phase 3, applied
      // as a force at full SPRING_K coefficient.
      const breathDx =
        Math.sin(elapsed * 0.001 * BREATHING.FREQ_PRIMARY + phase) *
          BREATHING.AMP_PRIMARY +
        Math.sin(elapsed * 0.001 * BREATHING.FREQ_SECONDARY + phase * 2.1) *
          BREATHING.AMP_SECONDARY;
      const breathDy =
        Math.cos(elapsed * 0.001 * (BREATHING.FREQ_PRIMARY - 0.1) + phase * 1.3) *
          BREATHING.AMP_PRIMARY +
        Math.cos(elapsed * 0.001 * (BREATHING.FREQ_SECONDARY - 0.1) + phase * 0.7) *
          BREATHING.AMP_SECONDARY;
      fx += TUNING.SPRING_K * breathDx;
      fy += TUNING.SPRING_K * breathDy;

      this.forces[i * 2] = fx;
      this.forces[i * 2 + 1] = fy;
    }
  }

  private integrate(dt: number): void {
    for (let i = 0; i < this.count; i++) {
      const fx = this.forces[i * 2];
      const fy = this.forces[i * 2 + 1];
      const vx = this.velocities[i * 2] + fx * dt;
      const vy = this.velocities[i * 2 + 1] + fy * dt;
      this.velocities[i * 2] = vx;
      this.velocities[i * 2 + 1] = vy;
      this.positions[i * 3] += vx * dt;
      this.positions[i * 3 + 1] += vy * dt;
    }
  }

  private processRecohere(): void {
    const recohereBand = TUNING.RECOHERE_BAND;
    const recohereBand2 = recohereBand * recohereBand;
    const bandHalf2 = (recohereBand * 0.5) * (recohereBand * 0.5);

    for (let i = 0; i < this.count; i++) {
      const state = this.states[i];

      if (state === STATE_RELEASED) {
        if (this._elapsedMs - this.releasedSince[i] < TUNING.RECOHERE_DELAY_MS) continue;
        const dx = this.positions[i * 3] - this.rests[i * 2];
        const dy = this.positions[i * 3 + 1] - this.rests[i * 2 + 1];
        if (dx * dx + dy * dy < recohereBand2) {
          this.states[i] = STATE_RECOHERING;
        }
      } else if (state === STATE_RECOHERING) {
        const dx = this.positions[i * 3] - this.rests[i * 2];
        const dy = this.positions[i * 3 + 1] - this.rests[i * 2 + 1];
        if (dx * dx + dy * dy < bandHalf2) {
          this.states[i] = STATE_BOUND;
          this.spent[i] = 1; // mark as having fissioned this cycle
          this.excitedSince[i] = 0;
          this.releasedSince[i] = 0;
        }
      }
    }
  }

  // Per-particle thermal energy in [0, 1]. Computed from state +
  // elapsed time. Drives the cream → ochre → red gradient + size bump
  // in the fragment shader.
  private updateHeat(): void {
    for (let i = 0; i < this.count; i++) {
      const state = this.states[i];
      if (state === STATE_BOUND) {
        this.heat[i] = 0;
      } else if (state === STATE_EXCITED) {
        // Ramp 0.5 → 1.0 over the reaction window: particle visibly
        // "warms up" before it fissions.
        const elapsed = this._elapsedMs - this.excitedSince[i];
        const t = Math.min(1, elapsed / TUNING.REACTION_WINDOW_MS);
        this.heat[i] = 0.5 + t * 0.5;
      } else if (state === STATE_RELEASED) {
        // Decay 1.0 → 0 over HEAT_RELEASE_DECAY_MS while the particle
        // drifts outward.
        const elapsed = this._elapsedMs - this.releasedSince[i];
        this.heat[i] = Math.max(0, 1.0 - elapsed / HEAT_RELEASE_DECAY_MS);
      } else {
        // STATE_RECOHERING: heat already decayed to ~0 by this point;
        // hold there.
        this.heat[i] = 0;
      }
    }
  }
}
