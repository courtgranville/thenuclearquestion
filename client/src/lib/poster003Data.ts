/**
 * Poster 003 — scenario data + slider interpolation contract.
 *
 * Three discrete scenarios (S1/S2/S3) describe UK electricity-mix
 * deaths and lives-saved at 14% / 30% / 70% nuclear share.
 *
 * The slider exposes a continuous fraction 0–1 across the track:
 *   S1 anchor = 0.0
 *   S2 anchor = 0.5
 *   S3 anchor = 1.0
 *
 * Geometry interpolates linearly between adjacent anchors so blob
 * sizes, dot counts, and node radii morph during drag. Numerical
 * readouts ("X deaths/year", "Y lives saved") MUST be read from
 * `anchorState` (the nearest snap), never from the geometric fields.
 * This is a thesis-level editorial constraint: interpolated death
 * counts are not meaningful and must not be displayed.
 */

export type SourceId =
  | 'gas'
  | 'oil'
  | 'bioenergy'
  | 'coal'
  | 'hydro'
  | 'wind'
  | 'nuclear'
  | 'solar';

export const SOURCE_IDS: readonly SourceId[] = [
  'gas',
  'oil',
  'bioenergy',
  'coal',
  'hydro',
  'wind',
  'nuclear',
  'solar',
] as const;

export interface SourceState {
  twh: number;
  deaths: number;
}

export interface ScenarioData {
  id: 's1' | 's2' | 's3';
  label: string;
  nuclearSharePct: number;
  totalTwh: number;
  totalDeaths: number;
  livesSaved: number;
  sources: Record<SourceId, SourceState>;
}

export const SCENARIOS: readonly [ScenarioData, ScenarioData, ScenarioData] = [
  {
    id: 's1',
    label: "Today's mix",
    nuclearSharePct: 14,
    totalTwh: 284,
    totalDeaths: 699,
    livesSaved: 0,
    sources: {
      gas:       { twh: 86.3, deaths: 243 },
      oil:       { twh: 11.4, deaths: 211 },
      bioenergy: { twh: 40.1, deaths: 186 },
      coal:      { twh:  1.9, deaths:  47 },
      hydro:     { twh:  5.8, deaths:   8 },
      wind:      { twh: 83.3, deaths:   3 },
      nuclear:   { twh: 40.6, deaths:   1 },
      solar:     { twh: 14.8, deaths: 0.3 },
    },
  },
  {
    id: 's2',
    label: '30% nuclear',
    nuclearSharePct: 30,
    totalTwh: 284,
    totalDeaths: 297,
    livesSaved: 401,
    sources: {
      gas:       { twh: 86.3, deaths: 243 },
      oil:       { twh:    0, deaths:   0 },
      bioenergy: { twh:  8.8, deaths:  41 },
      coal:      { twh:    0, deaths:   0 },
      hydro:     { twh:  5.8, deaths:   8 },
      wind:      { twh: 83.3, deaths:   3 },
      nuclear:   { twh: 85.2, deaths:   3 },
      solar:     { twh: 14.8, deaths: 0.3 },
    },
  },
  {
    id: 's3',
    label: '70% nuclear',
    nuclearSharePct: 70,
    totalTwh: 284,
    totalDeaths: 9,
    livesSaved: 690,
    sources: {
      gas:       { twh:     0, deaths:   0 },
      oil:       { twh:     0, deaths:   0 },
      bioenergy: { twh:     0, deaths:   0 },
      coal:      { twh:     0, deaths:   0 },
      hydro:     { twh:     0, deaths:   0 },
      wind:      { twh:  70.5, deaths:   3 },
      nuclear:   { twh: 198.9, deaths:   6 },
      solar:     { twh:  14.8, deaths: 0.3 },
    },
  },
] as const;

// Maximum value seen across all three scenarios. Used by the canvas
// blobs layer to compute currentScale = currentDeaths / max — so a
// form drawn at the scenario where it is largest renders at scale=1.
export const MAX_DEATHS_FOR_SOURCE: Readonly<Record<SourceId, number>> =
  SOURCE_IDS.reduce(
    (acc, id) => {
      acc[id] = Math.max(...SCENARIOS.map((s) => s.sources[id].deaths));
      return acc;
    },
    {} as Record<SourceId, number>,
  );

export const MAX_TWH_FOR_SOURCE: Readonly<Record<SourceId, number>> =
  SOURCE_IDS.reduce(
    (acc, id) => {
      acc[id] = Math.max(...SCENARIOS.map((s) => s.sources[id].twh));
      return acc;
    },
    {} as Record<SourceId, number>,
  );

export interface VizState {
  sliderFraction: number;
  nearestAnchor: 's1' | 's2' | 's3';
  anchorState: ScenarioData;
  geometricSources: Record<SourceId, SourceState>;
  geometricTotalDeaths: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate the slider state at a given fraction (0–1).
 *
 * Geometry fields (geometricSources, geometricTotalDeaths) interpolate
 * linearly between adjacent anchors. They drive blob sizes, dot
 * counts, and node radii — they are NOT for numerical display.
 *
 * The displayed numbers come from anchorState, the nearest snap.
 */
export function interpolate(sliderFraction: number): VizState {
  const f = Math.max(0, Math.min(1, sliderFraction));

  // Pick the two adjacent anchors and the local fraction between them.
  let leftIdx: 0 | 1;
  let local: number;
  if (f <= 0.5) {
    leftIdx = 0;
    local = f / 0.5;
  } else {
    leftIdx = 1;
    local = (f - 0.5) / 0.5;
  }
  const left = SCENARIOS[leftIdx];
  const right = SCENARIOS[leftIdx + 1];

  const geometricSources = SOURCE_IDS.reduce(
    (acc, id) => {
      acc[id] = {
        twh:    lerp(left.sources[id].twh,    right.sources[id].twh,    local),
        deaths: lerp(left.sources[id].deaths, right.sources[id].deaths, local),
      };
      return acc;
    },
    {} as Record<SourceId, SourceState>,
  );

  const geometricTotalDeaths = lerp(
    left.totalDeaths,
    right.totalDeaths,
    local,
  );

  // Nearest anchor — ties go right.
  let nearestAnchor: 's1' | 's2' | 's3';
  if (f < 0.25) nearestAnchor = 's1';
  else if (f < 0.75) nearestAnchor = 's2';
  else nearestAnchor = 's3';

  const anchorState =
    nearestAnchor === 's1' ? SCENARIOS[0] :
    nearestAnchor === 's2' ? SCENARIOS[1] :
    SCENARIOS[2];

  return {
    sliderFraction: f,
    nearestAnchor,
    anchorState,
    geometricSources,
    geometricTotalDeaths,
  };
}

/**
 * Map a slider fraction to its corresponding snap fraction.
 * Used by the slider on release.
 */
export function snapFraction(sliderFraction: number): number {
  if (sliderFraction < 0.25) return 0;
  if (sliderFraction < 0.75) return 0.5;
  return 1;
}

export const ANCHOR_FRACTIONS: Readonly<Record<'s1' | 's2' | 's3', number>> = {
  s1: 0,
  s2: 0.5,
  s3: 1,
};

// ─────────────────────────────────────────────────────────────────────
// DOT_ORDERING — a deterministic seeded shuffle of [0..698].
//
// Drives the red→green flip sequence in the dots layer. Every page
// load produces the same ordering so the visual sequence is stable
// across sessions. The ordering has NO source attribution: it is a
// pseudo-random permutation, and individual dots cannot be associated
// with individual sources. This is a thesis-level editorial
// constraint — death-by-source is shown by the deaths-blobs layer,
// never by the dots layer.
// ─────────────────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDotOrdering(seed: number, n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  const rand = mulberry32(seed);
  // Fisher–Yates.
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export const DOT_ORDERING: readonly number[] = buildDotOrdering(0x4e515131, 699);
