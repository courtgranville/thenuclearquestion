// Framework-free particle physics engine for the Fission Room.
// Owns the canonical state arrays that the renderer reads each frame
// via BufferAttributes. Step semantics, force model, and cascade
// behaviour follow FISSION_BRIEF.md Phase 6, with Phase 6.1 layering
// in spent flags (for natural termination), a heat buffer (for the
// thermal palette), and auto-reset on idle.

import { TUNING, BREATHING, type Quality } from './fissionTuning';
import { spawnFissionSparks } from '@/components/FissionSparks';

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
// Phase 7: extended 1500 → 3000 so thermal aftermath of a fission
// stays visible while the cascade is still unfolding.
const HEAT_RELEASE_DECAY_MS = 3000;

export type Neutron = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bornAt: number; // engine elapsedMs when spawned
  alive: boolean;
};

// Spatial hash over current particle positions. Rebuilt every frame
// inside updateNeutrons so neutron-particle collision queries are
// O(local candidates) instead of O(all particles). Cell size matches
// NEUTRON_NEAR_MISS_RADIUS so any particle within the wider of the
// two collision radii is in the neutron's cell or an immediate
// neighbour - one 3×3 cell sweep covers the whole query.
class SpatialGrid {
  private cells: Map<number, number[]> = new Map();

  constructor(private cellSize: number) {}

  // Pack 2D cell coords into a single integer. Range assumption:
  // |cx|, |cy| < 1000 cells (form spans ~30 cells at our scale).
  private hash(cx: number, cy: number): number {
    return (cx + 1000) * 10000 + (cy + 1000);
  }

  clear(): void {
    this.cells.clear();
  }

  insert(p: number, x: number, y: number): void {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const key = this.hash(cx, cy);
    let bucket = this.cells.get(key);
    if (!bucket) {
      bucket = [];
      this.cells.set(key, bucket);
    }
    bucket.push(p);
  }

  // Returns particle indices in cells overlapping the query disc.
  // Caller filters by exact distance.
  query(x: number, y: number, radius: number, out: number[]): void {
    out.length = 0;
    const cellsRadius = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    for (let dx = -cellsRadius; dx <= cellsRadius; dx++) {
      for (let dy = -cellsRadius; dy <= cellsRadius; dy++) {
        const bucket = this.cells.get(this.hash(cx + dx, cy + dy));
        if (bucket) {
          for (let i = 0; i < bucket.length; i++) out.push(bucket[i]);
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
  // 1 = this particle's nucleus is fissile (rolled on enrichment
  // change). Non-fissile particles get pushed by neutron collisions
  // but don't fission. Re-rolled by setEnrichmentLevel(); about
  // `enrichmentLevel` fraction of the cloud is fissile at any time.
  private readonly fissile: Uint8Array;
  // Spatial hash over current particle positions. Rebuilt per frame
  // for neutron-particle collision queries.
  private readonly grid: SpatialGrid;
  // Scratch buffer for grid query results; reused each call.
  private readonly candidates: number[] = [];

  // Tracked for "downstream listener" use; the engine no longer
  // reads cursor in its force loop (cursor magnetism removed in 6.3).
  private cursorX: number | null = null;
  private cursorY: number | null = null;
  // 0 = fast neutrons (low fission prob), 1 = slow neutrons (high
  // fission prob). The actual speed + probability are derived via
  // the currentNeutronSpeed / currentFissionProbability getters.
  private _neutronSpeedRatio = 0.5;
  private enrichmentLevel = 0.05;
  private _elapsedMs = 0;
  private idleMs = 0;

  // Dev-only cascade statistics. Persist across the idle auto-reset
  // so the user can read the result of a cascade after it ends.
  // Cleared only when a NEW cascade is started (next click after the
  // engine has gone idle since the previous cascade).
  private statsTotalFissions = 0;
  private statsTotalNeutronsFired = 0;
  private statsTotalHits = 0;
  private statsCascadeStartMs = 0;
  // Becomes true when the engine has been idle since the most recent
  // injectNeutron. The next injectNeutron sees this and zeroes the
  // stats counters before incrementing.
  private wasIdleSinceLastInject = true;

  get elapsedMs(): number {
    return this._elapsedMs;
  }

  // Exposed publicly so the neutron renderer can colour-tint each
  // neutron by speed (whiter at fast, warmer at slow).
  get neutronSpeedRatio(): number {
    return this._neutronSpeedRatio;
  }

  // Derived from the neutron-speed slider position. Fast neutrons
  // (ratio 0) travel quickly and almost never fission on impact;
  // slow neutrons (ratio 1) drift and fission reliably. This is the
  // physics that distinguishes a moderated reactor from a fast-
  // neutron bomb.
  get currentNeutronSpeed(): number {
    return (
      TUNING.NEUTRON_SPEED_FAST +
      (TUNING.NEUTRON_SPEED_SLOW - TUNING.NEUTRON_SPEED_FAST) * this._neutronSpeedRatio
    );
  }
  get currentFissionProbability(): number {
    return (
      TUNING.FISSION_PROB_FAST +
      (TUNING.FISSION_PROB_SLOW - TUNING.FISSION_PROB_FAST) * this._neutronSpeedRatio
    );
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
    this.fissile = new Uint8Array(n);

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

    this.applyEnrichment();

    this.grid = new SpatialGrid(TUNING.NEUTRON_NEAR_MISS_RADIUS);

    this.neutrons = new Array(TUNING.MAX_LIVE_NEUTRONS);
    for (let i = 0; i < this.neutrons.length; i++) {
      this.neutrons[i] = { x: 0, y: 0, vx: 0, vy: 0, bornAt: 0, alive: false };
    }
  }

  // Re-roll the fissile flags across the cloud. About `enrichmentLevel`
  // fraction of particles will be fissile after the call. Called from
  // the constructor and whenever the enrichment slider changes.
  private applyEnrichment(): void {
    for (let i = 0; i < this.count; i++) {
      this.fissile[i] = Math.random() < this.enrichmentLevel ? 1 : 0;
    }
  }

  // ─── Inputs ────────────────────────────────────────────────────

  injectNeutron(x: number, y: number, vx: number, vy: number): void {
    // If the engine was idle since the last neutron, treat this as
    // the first neutron of a new cascade: zero the visible stats so
    // the overlay shows just THIS cascade's counts.
    if (this.wasIdleSinceLastInject) {
      this.statsTotalFissions = 0;
      this.statsTotalNeutronsFired = 0;
      this.statsTotalHits = 0;
      this.statsCascadeStartMs = this._elapsedMs;
      this.wasIdleSinceLastInject = false;
    }
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
        this.statsTotalNeutronsFired++;
        return;
      }
    }
    // Pool exhausted; drop silently per brief.
  }

  setCursor(x: number | null, y: number | null): void {
    this.cursorX = x;
    this.cursorY = y;
  }

  setNeutronSpeedRatio(r: number): void {
    this._neutronSpeedRatio = Math.max(0, Math.min(1, r));
  }

  // Re-roll fissile flags at the new enrichment level. Different
  // slider position, different sample - so clicking after moving the
  // slider produces a different cloud, not the same one.
  setEnrichmentLevel(level: number): void {
    this.enrichmentLevel = Math.max(0, Math.min(1, level));
    this.applyEnrichment();
  }

  // Unused after Phase 6.3 - click handler now fires neutron
  // projectiles from the screen edge rather than directly exciting
  // particles near the click. Kept for potential future use.
  exciteDirect(idx: number): void {
    if (idx < 0 || idx >= this.count) return;
    if (this.states[idx] !== STATE_BOUND) return;
    if (this.spent[idx] === 1) return;
    this.states[idx] = STATE_EXCITED;
    this.excitedSince[idx] = this._elapsedMs;
    this.liveExcited++;
  }

  // Unused after Phase 6.3 - same reason as exciteDirect. Kept for
  // potential future use.
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
  // Called automatically when the room has been idle, or manually
  // via reset() for a hard restart. Phase 7.2: stats are NOT cleared
  // here - they persist until the next click so the user can read
  // the result of a cascade after it ends.
  private resetSpent(): void {
    this.spent.fill(0);
  }

  // Read-only snapshot of cascade statistics for the ?stats=1
  // dev overlay. All counters reset on the next idle auto-reset.
  getCascadeStats(): {
    totalFissions: number;
    totalNeutronsFired: number;
    totalHits: number;
    hitRate: number;
    liveExcited: number;
    liveNeutrons: number;
    durationMs: number;
  } {
    return {
      totalFissions: this.statsTotalFissions,
      totalNeutronsFired: this.statsTotalNeutronsFired,
      totalHits: this.statsTotalHits,
      hitRate:
        this.statsTotalNeutronsFired > 0
          ? this.statsTotalHits / this.statsTotalNeutronsFired
          : 0,
      liveExcited: this.liveExcited,
      liveNeutrons: this.liveNeutrons,
      durationMs:
        this.statsCascadeStartMs > 0
          ? this._elapsedMs - this.statsCascadeStartMs
          : 0,
    };
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
    // clicks. Stats are NOT reset here in Phase 7.2 - they persist
    // until the next click so the user can read the result of a
    // cascade after it ends.
    const isIdle = this.liveExcited === 0 && this.liveNeutrons === 0;
    if (isIdle) {
      this.idleMs += dtMs;
      this.wasIdleSinceLastInject = true;
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
    // Rebuild the spatial grid each frame over current bound, non-spent
    // particle positions. With ~46k particles this is ~46k inserts -
    // fast, and saves us from doing 46k distance checks per neutron.
    this.grid.clear();
    for (let p = 0; p < this.count; p++) {
      if (this.states[p] !== STATE_BOUND) continue;
      if (this.spent[p] === 1) continue;
      this.grid.insert(p, this.positions[p * 3], this.positions[p * 3 + 1]);
    }

    const radius2 = TUNING.NEUTRON_HIT_RADIUS * TUNING.NEUTRON_HIT_RADIUS;
    const nearMissRadius2 =
      TUNING.NEUTRON_NEAR_MISS_RADIUS * TUNING.NEUTRON_NEAR_MISS_RADIUS;
    const fissionP = this.currentFissionProbability;

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

      // Two-tier neutron-particle interaction. The grid hands us
      // local candidates within near-miss radius; we filter by exact
      // distance into direct-hit vs near-miss branches.
      const speedMag = Math.hypot(n.vx, n.vy);
      const speedFactor = speedMag / TUNING.NEUTRON_SPEED_FAST;
      let neutronConsumed = false;
      this.grid.query(n.x, n.y, TUNING.NEUTRON_NEAR_MISS_RADIUS, this.candidates);
      for (let c = 0; c < this.candidates.length; c++) {
        const p = this.candidates[c];
        // Grid was built from bound non-spent particles, but states
        // can change within the same frame from other neutrons'
        // collisions; re-check.
        if (this.states[p] !== STATE_BOUND) continue;
        if (this.spent[p] === 1) continue;
        const dx = this.positions[p * 3] - n.x;
        const dy = this.positions[p * 3 + 1] - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius2) {
          const isFissile = this.fissile[p] === 1;
          if (isFissile && Math.random() < fissionP) {
            n.alive = false;
            this.liveNeutrons--;
            this.statsTotalHits++;
            this.states[p] = STATE_EXCITED;
            this.excitedSince[p] = this._elapsedMs;
            this.liveExcited++;
            neutronConsumed = true;
            break;
          } else {
            // No fission - push the particle along the neutron's
            // velocity. Neutron continues through. Phase 7 raised
            // coefficient 0.4 → 1.0 so the wake is visibly stronger.
            const kick = 1.0 * speedFactor;
            this.velocities[p * 2] += n.vx * kick;
            this.velocities[p * 2 + 1] += n.vy * kick;
          }
        } else if (d2 < nearMissRadius2) {
          const d = Math.sqrt(d2);
          const closeness = 1 - d / TUNING.NEUTRON_NEAR_MISS_RADIUS;
          // Phase 7 raised coefficient 0.15 → 0.4. Combined with the
          // wider NEAR_MISS_RADIUS, particles part visibly as the
          // neutron passes.
          const kick = 0.4 * closeness * closeness * speedFactor;
          const norm = d || 0.0001;
          this.velocities[p * 2] += (dx / norm) * kick;
          this.velocities[p * 2 + 1] += (dy / norm) * kick;
        }
      }
      if (neutronConsumed) continue;
    }
  }

  private processCascade(): void {
    for (let i = 0; i < this.count; i++) {
      if (this.states[i] !== STATE_EXCITED) continue;
      const elapsed = this._elapsedMs - this.excitedSince[i];
      if (elapsed < TUNING.REACTION_WINDOW_MS) continue;

      const rx = this.rests[i * 2];
      const ry = this.rests[i * 2 + 1];

      // 1) Spawn NEUTRONS_BASE neutrons at the engine's current
      // neutron speed (driven by the slider). At default 1 per
      // fission; with FISSION_PROB now driving criticality, count
      // stays constant rather than scaling with the slider.
      const speed = this.currentNeutronSpeed;
      for (let k = 0; k < TUNING.NEUTRONS_BASE; k++) {
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        this.injectNeutron(rx, ry, vx, vy);
      }

      // 2) Energy ledger.
      this.energyMeV += TUNING.ENERGY_PER_FISSION_MEV;

      // 3) Outward kick at the moment of release.
      const restAngle = Math.atan2(ry, rx);
      const kickAngle = restAngle + (Math.random() - 0.5) * 0.6;
      this.velocities[i * 2] = Math.cos(kickAngle) * TUNING.RELEASE_KICK_SPEED;
      this.velocities[i * 2 + 1] = Math.sin(kickAngle) * TUNING.RELEASE_KICK_SPEED;

      // 4) Visible punctuation - a burst of warm-coloured sparks at
      // the fission site (drained by FissionSparks) plus a kinetic
      // punch on every nearby bound particle so the neighbourhood
      // visibly recoils.
      spawnFissionSparks(rx, ry);
      const punchR = TUNING.FISSION_PUNCH_RADIUS;
      const punchR2 = punchR * punchR;
      for (let q = 0; q < this.count; q++) {
        if (q === i) continue;
        if (this.states[q] !== STATE_BOUND) continue;
        const qdx = this.positions[q * 3] - rx;
        const qdy = this.positions[q * 3 + 1] - ry;
        const qd2 = qdx * qdx + qdy * qdy;
        if (qd2 >= punchR2) continue;
        const qd = Math.sqrt(qd2) || 0.0001;
        const punch = TUNING.FISSION_PUNCH_STRENGTH * (1 - qd / punchR);
        this.velocities[q * 2] += (qdx / qd) * punch;
        this.velocities[q * 2 + 1] += (qdy / qd) * punch;
      }

      // 5) Transition excited → released.
      this.states[i] = STATE_RELEASED;
      this.releasedSince[i] = this._elapsedMs;
      this.liveExcited--;
      this.statsTotalFissions++;
    }
  }

  private applyForces(): void {
    const elapsed = this._elapsedMs;
    const cursorActive = this.cursorX !== null && this.cursorY !== null;
    const ccx = this.cursorX ?? 0;
    const ccy = this.cursorY ?? 0;
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

      // Cursor magnetism - gentle outward push on hover. Restored
      // in Phase 7.2 with weaker force + wider reach (was Phase 6's
      // 0.18 / 1.5; now 0.22 / 0.6). Hovering visibly perturbs
      // particles without violent disruption. Does NOT trigger
      // fission - only clicks fire neutrons.
      if (cursorActive) {
        const cdx = px - ccx;
        const cdy = py - ccy;
        const cd2 = cdx * cdx + cdy * cdy;
        if (cd2 < cursorR2) {
          const cd = Math.sqrt(cd2) || 0.0001;
          const falloff = 1.0 - cd / TUNING.CURSOR_RADIUS;
          const strength = TUNING.CURSOR_FORCE * falloff * falloff;
          fx += (cdx / cd) * strength;
          fy += (cdy / cd) * strength;
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
