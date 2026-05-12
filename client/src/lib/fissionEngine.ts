// Framework-free particle physics engine for the Fission Room.
// Owns the canonical state arrays that the renderer reads each frame
// via BufferAttributes. Step semantics, force model, and cascade
// behaviour follow FISSION_BRIEF.md Phase 6. All dimensional values
// are in normalised world units where the form spans [-1, +1].

import { TUNING, BREATHING, type Quality } from './fissionTuning';

// State codes are floats so the WebGL shader can read them as a
// vertex attribute without integer-conversion overhead.
//   0 = bound       cream, resting
//   1 = excited     red flash, about to fission
//   2 = released    cool teal, drifting outward after fission
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
class SpatialGrid {
  private cells: Int32Array[];
  private readonly cellSize: number;
  private readonly gridW: number;
  private readonly gridH: number;
  private readonly originX: number;
  private readonly originY: number;

  constructor(rests: Float32Array, count: number, cellSize: number) {
    this.cellSize = cellSize;
    // World is roughly [-1, +1]; pad to [-1.2, +1.2] to absorb any
    // particles that sit slightly outside (they shouldn't, but the
    // pad costs nothing).
    this.originX = -1.2;
    this.originY = -1.2;
    this.gridW = Math.ceil(2.4 / cellSize);
    this.gridH = Math.ceil(2.4 / cellSize);
    const totalCells = this.gridW * this.gridH;

    // Two-pass build: first count occupants per cell, then allocate
    // exact-sized Int32Arrays. Avoids growing JS arrays.
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

  // Push every particle index whose cell overlaps the query radius
  // into `out`. Caller is responsible for filtering by precise
  // distance and resetting `out.length = 0` before calling.
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

  // Public counters - the page reads these to update UI overlays.
  energyMeV = 0;
  liveNeutrons = 0;
  liveExcited = 0;

  // Internal-only mutable state.
  private readonly velocities: Float32Array;
  private readonly forces: Float32Array;
  private readonly excitedSince: Float64Array;
  private readonly releasedSince: Float64Array;
  private readonly neutrons: Neutron[];
  private readonly grid: SpatialGrid;
  private readonly neighbourBuffer: number[] = [];

  private cursorX: number | null = null;
  private cursorY: number | null = null;
  private moderatorRatio = 0.5;
  private elapsedMs = 0;

  constructor(opts: EngineOpts) {
    this.count = opts.count;
    const n = opts.count;

    this.positions = new Float32Array(n * 3);
    this.rests = new Float32Array(n * 2);
    this.phases = new Float32Array(n);
    this.states = new Float32Array(n);
    this.velocities = new Float32Array(n * 2);
    this.forces = new Float32Array(n * 2);
    this.excitedSince = new Float64Array(n);
    this.releasedSince = new Float64Array(n);

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

    // Pre-allocate the neutron pool at the maximum capacity. We mark
    // dead neutrons rather than splicing the array - keeps the hot
    // loop allocation-free.
    this.neutrons = new Array(TUNING.MAX_LIVE_NEUTRONS);
    for (let i = 0; i < this.neutrons.length; i++) {
      this.neutrons[i] = { x: 0, y: 0, vx: 0, vy: 0, bornAt: 0, alive: false };
    }
  }

  // ─── Inputs ────────────────────────────────────────────────────

  injectNeutron(x: number, y: number, vx: number, vy: number): void {
    // Find a dead slot to recycle.
    for (let i = 0; i < this.neutrons.length; i++) {
      const n = this.neutrons[i];
      if (!n.alive) {
        n.x = x;
        n.y = y;
        n.vx = vx;
        n.vy = vy;
        n.bornAt = this.elapsedMs;
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

  // Phase 6 scaffolding. Picks the bound particle closest to (0, 0)
  // and lights it; the cascade propagates from there.
  triggerTestCascade(): void {
    let bestIdx = 0;
    let bestR2 = Infinity;
    for (let i = 0; i < this.count; i++) {
      const x = this.rests[i * 2];
      const y = this.rests[i * 2 + 1];
      const r2 = x * x + y * y;
      if (r2 < bestR2) {
        bestR2 = r2;
        bestIdx = i;
      }
    }
    if (this.states[bestIdx] === STATE_BOUND) {
      this.states[bestIdx] = STATE_EXCITED;
      this.excitedSince[bestIdx] = this.elapsedMs;
      this.liveExcited++;
    }
  }

  // ─── Tick ──────────────────────────────────────────────────────

  step(dtMs: number): void {
    // Clamp to defend against frame stutters (tab-foregrounding,
    // GC pauses). Larger frame intervals are integrated as MAX_DT_MS
    // so a 100ms hitch doesn't explode the simulation.
    const dt = Math.min(dtMs, TUNING.MAX_DT_MS) / 1000;
    this.elapsedMs += dtMs;

    this.updateNeutrons(dt);
    this.processCascade();
    this.applyForces();
    this.integrate(dt);
    this.processRecohere();
  }

  // ─── Step passes ───────────────────────────────────────────────

  private updateNeutrons(dt: number): void {
    const radius2 = TUNING.NEUTRON_HIT_RADIUS * TUNING.NEUTRON_HIT_RADIUS;
    for (let i = 0; i < this.neutrons.length; i++) {
      const n = this.neutrons[i];
      if (!n.alive) continue;

      n.x += n.vx * dt;
      n.y += n.vy * dt;

      // Lifetime / out-of-bounds cull.
      const aliveMs = this.elapsedMs - n.bornAt;
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

      // Brute-force collision against particles within hit radius.
      // At ~10 live neutrons and 42k particles that's 420k checks
      // per frame, well inside budget. The spatial grid is keyed on
      // rest positions, so it doesn't help for current-position
      // collision (a released particle isn't where its rest is).
      for (let p = 0; p < this.count; p++) {
        if (this.states[p] !== STATE_BOUND) continue;
        const dx = this.positions[p * 3] - n.x;
        const dy = this.positions[p * 3 + 1] - n.y;
        if (dx * dx + dy * dy < radius2) {
          n.alive = false;
          this.liveNeutrons--;
          this.states[p] = STATE_EXCITED;
          this.excitedSince[p] = this.elapsedMs;
          this.liveExcited++;
          break;
        }
      }
    }
  }

  private processCascade(): void {
    const cascadeP = TUNING.CASCADE_PROBABILITY_BASE * this.moderatorRatio;
    const cascadeR2 = TUNING.CASCADE_RADIUS * TUNING.CASCADE_RADIUS;

    for (let i = 0; i < this.count; i++) {
      if (this.states[i] !== STATE_EXCITED) continue;
      const elapsed = this.elapsedMs - this.excitedSince[i];
      if (elapsed < TUNING.REACTION_WINDOW_MS) continue;

      // Transition excited -> released.
      const rx = this.rests[i * 2];
      const ry = this.rests[i * 2 + 1];

      // 1) Direct cascade to neighbours within CASCADE_RADIUS.
      this.neighbourBuffer.length = 0;
      this.grid.queryRadius(rx, ry, TUNING.CASCADE_RADIUS, this.neighbourBuffer);
      for (let k = 0; k < this.neighbourBuffer.length; k++) {
        const j = this.neighbourBuffer[k];
        if (j === i) continue;
        if (this.states[j] !== STATE_BOUND) continue;
        const dx = this.rests[j * 2] - rx;
        const dy = this.rests[j * 2 + 1] - ry;
        if (dx * dx + dy * dy > cascadeR2) continue;
        if (Math.random() < cascadeP) {
          this.states[j] = STATE_EXCITED;
          this.excitedSince[j] = this.elapsedMs;
          this.liveExcited++;
        }
      }

      // 2) Spawn neutrons. Radial-ish outward directions with jitter.
      for (let k = 0; k < TUNING.NEUTRONS_PER_FISSION; k++) {
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * TUNING.NEUTRON_SPEED;
        const vy = Math.sin(angle) * TUNING.NEUTRON_SPEED;
        this.injectNeutron(rx, ry, vx, vy);
      }

      // 3) Energy ledger.
      this.energyMeV += TUNING.ENERGY_PER_FISSION_MEV;

      // 4) Outward kick at the moment of release. Angle is from the
      // form's centre (0, 0) toward this particle's rest, plus
      // jitter, so released particles disperse outward rather than
      // pile in one direction.
      const restAngle = Math.atan2(ry, rx);
      const kickAngle = restAngle + (Math.random() - 0.5) * 0.6;
      this.velocities[i * 2] = Math.cos(kickAngle) * TUNING.RELEASE_KICK_SPEED;
      this.velocities[i * 2 + 1] = Math.sin(kickAngle) * TUNING.RELEASE_KICK_SPEED;

      // 5) Transition.
      this.states[i] = STATE_RELEASED;
      this.releasedSince[i] = this.elapsedMs;
      this.liveExcited--;
    }
  }

  private applyForces(): void {
    const elapsed = this.elapsedMs;
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
      // as a force at full SPRING_K coefficient. For bound particles
      // (springScale 1.0), this effectively shifts the spring rest
      // target by (breathDx, breathDy). For released particles
      // (springScale 0.3) the breath still perturbs them even when
      // far from rest.
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
      // Symplectic Euler: update velocity from force, then update
      // position from new velocity.
      const fx = this.forces[i * 2];
      const fy = this.forces[i * 2 + 1];
      const vx = this.velocities[i * 2] + fx * dt;
      const vy = this.velocities[i * 2 + 1] + fy * dt;
      this.velocities[i * 2] = vx;
      this.velocities[i * 2 + 1] = vy;
      this.positions[i * 3] += vx * dt;
      this.positions[i * 3 + 1] += vy * dt;
      // z stays 0.
    }
  }

  private processRecohere(): void {
    const recohereBand = TUNING.RECOHERE_BAND;
    const recohereBand2 = recohereBand * recohereBand;
    const bandHalf2 = (recohereBand * 0.5) * (recohereBand * 0.5);

    for (let i = 0; i < this.count; i++) {
      const state = this.states[i];

      if (state === STATE_RELEASED) {
        if (this.elapsedMs - this.releasedSince[i] < TUNING.RECOHERE_DELAY_MS) continue;
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
          this.excitedSince[i] = 0;
          this.releasedSince[i] = 0;
        }
      }
    }
  }
}
