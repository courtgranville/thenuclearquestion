// ─────────────────────────────────────────────────────────────────
// poster005Connectors.ts - pre-baked hub→leaf trajectories.
//
// The dendrogram SVG holds 98 connector path d-strings (in
// poster-005-forms.json under dendrogram_links). They form a
// two-level dendrogram:
//
//   4 hubs at y=422.366
//     │
//     │  level-1 connectors (cubic Béziers, 26 sub-hubs land here)
//     ▼
//   26 sub-hubs at y=594.329
//     │
//     │  level-2 connectors (cubic Béziers, end at the leaf y=800.993)
//     ▼
//   72 leaves at y=800.993
//
// Court asked the pulses to travel along the actual line geometry.
// For each leaf, we find the level-2 path ending at the leaf, then
// the level-1 path ending at THAT path's start (the sub-hub), and
// concatenate the two flattened polylines into a single trajectory.
//
// Each trajectory carries cumulative-length data so the pulse RAF
// loop can sample (x, y) and tangent at any u ∈ [0, 1] in O(log n).
//
// Multiple leaves under the same sub-hub share the same level-1
// segment - when the pulses overlap on that segment they read as
// a single trail that splits at the sub-hub. That's exactly the
// visual choreography of poster 004's hub→carrier→sector cascade.
// ─────────────────────────────────────────────────────────────────

import { parseD } from '@/lib/parseSvg';
import { LEAVES_BY_STATUS, HUB_BY_STATUS, type Poster005FormsData } from '@/lib/poster005Hubs';
import { type ReactorStatus } from '@/lib/poster005Data';

interface RawPath {
  d: string;
  startX: number; startY: number;
  endX: number; endY: number;
  pts: number[];       // flattened polyline [x0,y0,x1,y1,...]
  n: number;
}

function rawPath(d: string): RawPath {
  const pts = parseD(d);
  const n = pts.length / 2;
  return {
    d,
    startX: pts[0],
    startY: pts[1],
    endX: pts[(n - 1) * 2],
    endY: pts[(n - 1) * 2 + 1],
    pts,
    n,
  };
}

// Mutable bindings populated by initPoster005Connectors. Empty until the
// init function runs.
let ALL_PATHS: RawPath[] = [];

// O(n) endpoint lookup with float tolerance.
function findPathEndingAt(x: number, y: number, tol = 0.5): RawPath | null {
  for (const p of ALL_PATHS) {
    if (Math.abs(p.endX - x) <= tol && Math.abs(p.endY - y) <= tol) return p;
  }
  return null;
}

export interface Trajectory {
  reactorId: string;
  status: ReactorStatus;
  // Concatenated flattened polyline: hub anchor → sub-hub → leaf.
  pts: Float32Array;
  n: number;
  // Cumulative arc length at each vertex (lens[0] = 0, lens[n-1] = totalLen).
  lens: Float32Array;
  totalLen: number;
}

function buildTrajectoryForLeaf(
  leafX: number,
  leafY: number,
  reactorId: string,
  status: ReactorStatus,
  hubAnchor: [number, number],
): Trajectory | null {
  const level2 = findPathEndingAt(leafX, leafY);
  if (!level2) return null;
  const level1 = findPathEndingAt(level2.startX, level2.startY);

  // Concatenate level1 + level2 points. Skip the duplicated vertex
  // where level1 ends and level2 begins.
  const ptsArr: number[] = [];
  if (level1) {
    for (let i = 0; i < level1.n; i++) {
      ptsArr.push(level1.pts[i * 2], level1.pts[i * 2 + 1]);
    }
    // level2's first vertex equals level1's last vertex (sub-hub).
    for (let i = 1; i < level2.n; i++) {
      ptsArr.push(level2.pts[i * 2], level2.pts[i * 2 + 1]);
    }
  } else {
    // No level-1 path found - fall back to just the level-2 trajectory.
    for (let i = 0; i < level2.n; i++) {
      ptsArr.push(level2.pts[i * 2], level2.pts[i * 2 + 1]);
    }
  }

  // If the trajectory doesn't start at the hub anchor, prepend it
  // so the pulse visibly emerges from the hub. (level1 paths start
  // at the hub anchor, so this is usually a no-op.)
  const [hubX, hubY] = hubAnchor;
  if (Math.abs(ptsArr[0] - hubX) > 1 || Math.abs(ptsArr[1] - hubY) > 1) {
    ptsArr.unshift(hubX, hubY);
  }

  const pts = new Float32Array(ptsArr);
  const n = ptsArr.length / 2;
  const lens = new Float32Array(n);
  let total = 0;
  lens[0] = 0;
  for (let i = 1; i < n; i++) {
    const dx = pts[i * 2] - pts[(i - 1) * 2];
    const dy = pts[i * 2 + 1] - pts[(i - 1) * 2 + 1];
    total += Math.hypot(dx, dy);
    lens[i] = total;
  }

  return { reactorId, status, pts, n, lens, totalLen: total };
}

export let TRAJECTORY_BY_REACTOR: Map<string, Trajectory> = new Map();

// Must be called AFTER initPoster005Hubs - this reads from the now-populated
// LEAVES_BY_STATUS and HUB_BY_STATUS bindings to compute trajectories. The
// guard below converts the silent-bad-output failure mode (empty trajectory
// map, dendrogram renders without connector animations) into a loud crash
// so any future change to the init sequence fails immediately rather than
// shipping a broken viz.
export function initPoster005Connectors(formsData: Poster005FormsData): void {
  if (Object.keys(HUB_BY_STATUS).length === 0) {
    throw new Error(
      'initPoster005Connectors called before initPoster005Hubs. ' +
      'Hubs must be initialised first because Connectors reads from ' +
      'HUB_BY_STATUS and LEAVES_BY_STATUS to compute trajectories.',
    );
  }
  ALL_PATHS = formsData.dendrogram_links.map(rawPath);
  TRAJECTORY_BY_REACTOR = new Map();
  for (const status of ['underConstruction', 'operating', 'retired', 'cancelled'] as ReactorStatus[]) {
    const hub = HUB_BY_STATUS[status];
    if (!hub) continue;
    for (const leaf of LEAVES_BY_STATUS[status]) {
      const t = buildTrajectoryForLeaf(leaf.x, leaf.y, leaf.reactorId, status, hub.anchor);
      if (t) TRAJECTORY_BY_REACTOR.set(leaf.reactorId, t);
    }
  }
}

/** Sample (x, y, tangent) at parameter u ∈ [0, 1] along the trajectory. */
export function trajectoryPoint(
  traj: Trajectory,
  u: number,
): { x: number; y: number; tx: number; ty: number } {
  const target = u * traj.totalLen;
  // Binary search the cumulative-length array for the segment.
  let lo = 1;
  let hi = traj.n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (traj.lens[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const segIdx = lo;
  const segStart = traj.lens[segIdx - 1];
  const segEnd = traj.lens[segIdx];
  const segLen = segEnd - segStart;
  const t = segLen > 0 ? (target - segStart) / segLen : 0;
  const x0 = traj.pts[(segIdx - 1) * 2];
  const y0 = traj.pts[(segIdx - 1) * 2 + 1];
  const x1 = traj.pts[segIdx * 2];
  const y1 = traj.pts[segIdx * 2 + 1];
  const x = x0 + t * (x1 - x0);
  const y = y0 + t * (y1 - y0);
  // Tangent direction (unnormalised) for orienting the pulse bulge.
  return { x, y, tx: x1 - x0, ty: y1 - y0 };
}
