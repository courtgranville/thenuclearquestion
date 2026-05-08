/**
 * Manual-verification asserts for poster003Data.
 *
 * Not run automatically. Documents the contract and lets a human
 * import the module in a REPL or one-off script to confirm shape.
 *
 * To verify:  npx tsx client/src/lib/poster003Data.test.ts
 */

import {
  SCENARIOS,
  SOURCE_IDS,
  DOT_ORDERING,
  MAX_DEATHS_FOR_SOURCE,
  ANCHOR_FRACTIONS,
  interpolate,
  snapFraction,
} from './poster003Data';

function assert(cond: unknown, msg: string): void {
  if (!cond) {
    throw new Error('assertion failed: ' + msg);
  }
  console.log('ok   ' + msg);
}

assert(SCENARIOS.length === 3, 'three scenarios');
assert(SCENARIOS[0].id === 's1', 's1 id');
assert(SCENARIOS[1].id === 's2', 's2 id');
assert(SCENARIOS[2].id === 's3', 's3 id');

assert(interpolate(0).anchorState.totalDeaths === 699, 's1 anchor totalDeaths');
assert(interpolate(0.5).anchorState.totalDeaths === 297, 's2 anchor totalDeaths');
assert(interpolate(1).anchorState.totalDeaths === 9, 's3 anchor totalDeaths');

assert(interpolate(0).nearestAnchor === 's1', 'nearest @0 is s1');
assert(interpolate(0.24).nearestAnchor === 's1', 'nearest @0.24 is s1');
assert(interpolate(0.25).nearestAnchor === 's2', 'nearest @0.25 is s2 (tie goes right)');
assert(interpolate(0.5).nearestAnchor === 's2', 'nearest @0.5 is s2');
assert(interpolate(0.74).nearestAnchor === 's2', 'nearest @0.74 is s2');
assert(interpolate(0.75).nearestAnchor === 's3', 'nearest @0.75 is s3 (tie goes right)');
assert(interpolate(1).nearestAnchor === 's3', 'nearest @1 is s3');

// Geometry interpolates linearly between anchors.
const mid = interpolate(0.25);
assert(
  Math.abs(mid.geometricTotalDeaths - (699 + 297) / 2) < 0.5,
  'geometric total midway between s1 and s2 ≈ 498',
);
const midNuclear = mid.geometricSources.nuclear.deaths;
assert(
  Math.abs(midNuclear - (1 + 3) / 2) < 0.01,
  'nuclear deaths midway between s1 and s2 = 2',
);

// snapFraction
assert(snapFraction(0) === 0, 'snap @0 → 0');
assert(snapFraction(0.4) === 0.5, 'snap @0.4 → 0.5');
assert(snapFraction(0.6) === 0.5, 'snap @0.6 → 0.5');
assert(snapFraction(0.8) === 1, 'snap @0.8 → 1');

// Dot ordering
assert(DOT_ORDERING.length === 699, 'dot ordering length 699');
assert(new Set(DOT_ORDERING).size === 699, 'dot ordering has 699 unique values');
assert(
  DOT_ORDERING.every((v) => v >= 0 && v < 699),
  'dot ordering values in range',
);

// MAX_DEATHS_FOR_SOURCE — nuclear maxes at S3 (6), gas maxes at S1/S2 (243).
assert(MAX_DEATHS_FOR_SOURCE.nuclear === 6, 'nuclear max deaths = 6');
assert(MAX_DEATHS_FOR_SOURCE.gas === 243, 'gas max deaths = 243');
assert(MAX_DEATHS_FOR_SOURCE.solar === 0.3, 'solar max deaths = 0.3');

// Anchor fractions
assert(ANCHOR_FRACTIONS.s1 === 0, 's1 anchor at 0');
assert(ANCHOR_FRACTIONS.s2 === 0.5, 's2 anchor at 0.5');
assert(ANCHOR_FRACTIONS.s3 === 1, 's3 anchor at 1');

// Source id list
assert(SOURCE_IDS.length === 8, '8 source ids');

console.log('\nall asserts passed');
