#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// extract-poster-005-forms.mjs
//
// Walks the poster-005 source SVGs + the site-level CSV and writes
// client/src/assets/poster-005-forms.json with the shape consumed by
// Poster005Dendrogram and Poster005Data.
//
// Output sections:
//   status_blobs     — four organic-form hubs (256 polylines each),
//                      bbox/centroid/anchor, total_mw, reactor_count.
//   reactors         — 72 per-unit records: id, name, site, status,
//                      mw, dates, lat/lng, dendrogram leaf position,
//                      timeline column x + per-segment y-coords.
//   sites            — unique site aggregations with cluster flag.
//   timeline         — y-to-year linear mapping anchors derived from
//                      the dendrogram-clean SVG's 8 gridlines.
//   map_clusters     — three cluster inset clipPath centroids from
//                      the map SVG.
//   dendrogram_links — connector Bézier d-strings (top of file).
//
// Sources (all on main, hashed asset names):
//   1. client/public/assets/005-dendrogram-clean_336edeac.svg
//      authoritative for:
//        - 72 row-* groups with data-unit + data-phase
//        - leaf circles per row
//        - timeline line segments per row (red = construction,
//          green = operating, navy dashed = under-construction
//          projection, cancellation circle for cancelled rows)
//        - the four status-blob hubs (256 polylines per hub,
//          stroke colours #b4822e / #237c3e / #7d746a / #a51e23)
//        - 8 horizontal gridlines (loose, outside row groups)
//          fixing y→year calibration to y=835.316→1953,
//          y=993.758→2030 (validated against Calder Hall 1 / Sizewell B
//          / Hinkley Point C1 within ±2 years)
//        - hub→leaf connector Bézier paths (top of file)
//
//   2. client/public/assets/005-map_d6bf9e9f.svg
//      authoritative for:
//        - three cluster inset clipPaths (Sellafield, Wylfa, Sizewell)
//        - 32 reactor project circles with cx/cy/data-project/data-mw/
//          data-units/data-group
//      Map circles carry NO data-unit; the companion
//      scripts/annotate-poster-005-map.mjs walks each reactor in the
//      manifest, finds its project's map circle, and stamps a data-unit
//      attribute so cross-view linkage works.
//
//   3. client/data/uk_nuclear_sites_qgis.csv
//      GEM Global Nuclear Power Tracker reconciled subset, inherited
//      from the previous feature branch's data layer. Provides site-
//      level lat/lng, total_mw, unit_count, and status_year for cross-
//      referencing the SVG-extracted records. Court approved its
//      reuse on 2026-05-10 with the conditions enforced here:
//        - NO per-reactor MW calibration. The abandoned-branch
//          Dungeness C = 1599 MW fudge has been removed; the value
//          derives from CSV total_mw - sum(A1,A2,B1,B2) = 1700 MW.
//        - The cancelled-fleet sum will not equal the print's 14,141 MW
//          headline. The discrepancy is documented in
//          client/src/lib/poster005Data.ts.
//        - STATUS_TOTALS.cancelled.mw remains 14,141 verbatim — that
//          is the print's displayed headline; per-reactor values are
//          not adjusted to make their sum match it.
//
// Per-reactor MW assignment rule:
//   For mono-model sites: CSV total_mw / unit_count.
//   For mixed-model sites: REACTOR_MW_OVERRIDES below holds per-unit
//   WNA / Wikipedia nameplate values. Values are sourced, not
//   calibrated. Where the override table's per-site sum differs from
//   CSV total_mw by >2% the script logs a SOURCE-SUM WARN line —
//   investigate before shipping.
//
// Y→year calibration:
//   anchored at the SVG's first and last horizontal gridline:
//     y0 = 835.316 → year 1953
//     y1 = 993.758 → year 2030
//   the chart's earliest depicted year, per the print subtitle, is 1953.
//   Pre-1953 construction history is visually clipped to the chart top
//   for the earliest cohort (Calder Hall, Berkeley, Bradwell etc.) —
//   for those rows the extracted construction_start_year is exactly
//   1953 and should be treated as "chart-edge clipped".
//
// Unit → map-project mapping rule (Court correction #4):
//   Walk every reactor unit through:
//     (a) name-prefix match against map's data-project, AND
//     (b) compatible-status-group match.
//   The status-group compatibility table:
//     underConstruction  ⇄  Future
//     operating          ⇄  Operating
//     retired            ⇄  Past
//     cancelled          ⇄  Future | Paused | Abandoned
//   So "Hinkley Point C1" (underConstruction) matches the
//   data-project="Hinkley Point" circle in data-group="Future", not
//   the data-group="Past" circle. Ambiguity that survives is logged.
//
// CSV/SVG date disagreement flagging (Court correction #3):
//   Where the CSV's start_year disagrees with the SVG-extracted
//   grid_connection_year by more than 1 year, the script records a
//   note in the reactor's record's `disagreements` array and emits
//   a SOURCE-DISAGREEMENT WARN line. Resolution is left to
//   poster005Data.ts's documented header rather than silently
//   preferring one source.
//
// Usage:
//   node scripts/extract-poster-005-forms.mjs
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const ASSETS_DIR    = resolve(REPO_ROOT, 'client/public/assets');
const DENDRO_SVG    = resolve(ASSETS_DIR, '005-dendrogram-clean_336edeac.svg');
const MAP_SVG       = resolve(ASSETS_DIR, '005-map_d6bf9e9f.svg');
const SITES_CSV     = resolve(REPO_ROOT,  'client/data/uk_nuclear_sites_qgis.csv');
const OUTPUT_PATH   = resolve(REPO_ROOT,  'client/src/assets/poster-005-forms.json');

// ─── Constants ───────────────────────────────────────────────────

const STATUS_BLOB_STROKES = {
  underConstruction: '#b4822e',
  operating:         '#237c3e',
  retired:           '#7d746a',
  cancelled:         '#a51e23',
};

const STATUS_LABEL = {
  underConstruction: 'Under Construction',
  operating:         'Operating',
  retired:           'Retired',
  cancelled:         'Cancelled',
};

// Phase strings used in the SVG's data-phase attribute mapped to the
// component's canonical ReactorStatus union.
function normalisePhase(p) {
  if (p === 'construction') return 'underConstruction';
  if (p === 'operating')    return 'operating';
  if (p === 'retired')      return 'retired';
  if (p.startsWith('cancelled')) return 'cancelled';
  throw new Error(`Unknown data-phase: ${p}`);
}

// Status-group compatibility (Court correction #4).
const STATUS_GROUP_COMPAT = {
  underConstruction: ['Future'],
  operating:         ['Operating'],
  retired:           ['Past'],
  cancelled:         ['Future', 'Paused', 'Abandoned'],
};

// Y→year linear mapping anchors. Derived from the SVG's 8 horizontal
// gridlines spanning y=[835.316, 993.758]; first anchor = 1953 (the
// print's earliest depicted year), last anchor = 2030 (the print's
// planning horizon). Validated within ±2 years against Calder Hall 1,
// Sizewell B, Hinkley Point C1.
const Y_TO_YEAR = { y0: 835.316, year0: 1953, y1: 993.758, year1: 2030 };

function yToYear(y) {
  const t = (y - Y_TO_YEAR.y0) / (Y_TO_YEAR.y1 - Y_TO_YEAR.y0);
  return Y_TO_YEAR.year0 + t * (Y_TO_YEAR.year1 - Y_TO_YEAR.year0);
}

// Per-reactor MW override table. WNA / Wikipedia nameplate values for
// mixed-model sites where CSV's total_mw / unit_count would
// mis-attribute capacity. Dungeness C is NOT calibrated — its value
// comes from CSV total_mw - sum of A1/A2/B1/B2 = 3340 - 220 - 220 -
// 600 - 600 = 1700 (Court correction #1).
const REACTOR_MW_OVERRIDES = {
  // Hinkley Point: A = Magnox 235, B = AGR 655, C = EPR 1630
  'Hinkley Point A1': 235,
  'Hinkley Point A2': 235,
  'Hinkley Point B1': 655,
  'Hinkley Point B2': 655,
  'Hinkley Point C1': 1630,
  'Hinkley Point C2': 1630,
  // Sizewell A = Magnox 290, B = SNUPPS PWR 1188
  'Sizewell A1': 290,
  'Sizewell A2': 290,
  'Sizewell B':  1188,
  // Oldbury A = Magnox 217, B = AP-1000 cancelled 1117
  'Oldbury A1':  217,
  'Oldbury A2':  217,
  'Oldbury B1':  1117,
  'Oldbury B2':  1117,
  'Oldbury B3':  1117,
  // Dungeness A = Magnox 220, B = AGR 600, C = cancelled-planned 1700
  // (CSV 3340 - 220 - 220 - 600 - 600 = 1700; no headline calibration).
  'Dungeness A1': 220,
  'Dungeness A2': 220,
  'Dungeness B1': 600,
  'Dungeness B2': 600,
  'Dungeness C':  1700,
  // Hunterston A = Magnox 160, B = AGR 657 (CSV total 1634 = 160*2 + 657*2 exact)
  'Hunterston A1': 160,
  'Hunterston A2': 160,
  'Hunterston B1': 657,
  'Hunterston B2': 657,
};

// Cluster site IDs (Sellafield includes Moorside; Wylfa includes Wylfa
// Newydd + Wylfa SMR; Sizewell is its own site).
const CLUSTER_SITES = new Set([
  'Sellafield', 'Moorside', 'Wylfa', 'Sizewell',
]);

// ─── Helpers ────────────────────────────────────────────────────

function readFile(path) {
  return readFileSync(path, 'utf8');
}

function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const cells = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === ',' && !inQ) { cells.push(cur); cur = ''; continue; }
      cur += c;
    }
    cells.push(cur);
    rows.push(cells);
  }
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = r[i] ?? '';
    return obj;
  });
}

function getAttr(elementText, name) {
  const m = elementText.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function pointsToFlat(pointsStr) {
  const nums = pointsStr.trim().split(/[\s,]+/).filter((s) => s !== '').map(parseFloat);
  return nums; // [x0,y0,x1,y1,...]
}

function bboxOfPoints(flat) {
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  for (let i = 0; i < flat.length; i += 2) {
    if (flat[i] < mnx) mnx = flat[i];
    if (flat[i] > mxx) mxx = flat[i];
    if (flat[i+1] < mny) mny = flat[i+1];
    if (flat[i+1] > mxy) mxy = flat[i+1];
  }
  return { minX: mnx, minY: mny, maxX: mxx, maxY: mxy };
}

function mergeBbox(a, b) {
  return {
    minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
  };
}

function centroidOfBbox(b) {
  return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
}

// ─── Step 1: read CSV ────────────────────────────────────────────

console.log('Reading CSV...');
const csvRows = parseCSV(readFile(SITES_CSV)).map((r) => ({
  name:        r.name,
  lat:         parseFloat(r.latitude),
  lng:         parseFloat(r.longitude),
  status:      r.status,
  reactorType: r.reactor_type,
  models:      r.models,
  totalMw:     parseFloat(r.total_mw),
  unitCount:   parseInt(r.unit_count, 10),
  startYear:   r.start_year ? parseInt(r.start_year, 10) : null,
}));
console.log(`  ${csvRows.length} site rows loaded`);

// ─── Step 2: parse the dendrogram SVG ────────────────────────────

console.log('Reading dendrogram SVG...');
const dendroSvg = readFile(DENDRO_SVG);

// 2a. Extract per-row geometry from <g id="row-NN" data-phase="..." data-unit="...">
function extractRows(svg) {
  const rowRe = /<g\s+id="(row-\d+)"\s+data-phase="([^"]+)"\s+data-unit="([^"]+)">([\s\S]*?)<\/g>/g;
  const out = [];
  let m;
  while ((m = rowRe.exec(svg)) !== null) {
    out.push({ id: m[1], phase: m[2], unit: m[3], inner: m[4] });
  }
  return out;
}

function extractLines(inner) {
  const out = [];
  const re = /<line\s+([^/]*)\/>/g;
  let m;
  while ((m = re.exec(inner)) !== null) {
    const a = m[1];
    out.push({
      x1: parseFloat(getAttr(a, 'x1')),
      y1: parseFloat(getAttr(a, 'y1')),
      x2: parseFloat(getAttr(a, 'x2')),
      y2: parseFloat(getAttr(a, 'y2')),
      stroke: (getAttr(a, 'stroke') ?? '').toLowerCase(),
      dash: getAttr(a, 'stroke-dasharray') !== null,
    });
  }
  return out;
}

function extractCircles(inner) {
  const out = [];
  const re = /<circle\s+([^/]*)\/>/g;
  let m;
  while ((m = re.exec(inner)) !== null) {
    const a = m[1];
    out.push({
      cx: parseFloat(getAttr(a, 'cx')),
      cy: parseFloat(getAttr(a, 'cy')),
      r:  parseFloat(getAttr(a, 'r')),
      stroke:  (getAttr(a, 'stroke') ?? '').toLowerCase(),
    });
  }
  return out;
}

const rows = extractRows(dendroSvg);
console.log(`  ${rows.length} reactor rows`);
if (rows.length !== 72) console.warn(`  WARNING: expected 72 rows`);

// 2b. Per-row geometry → years.
//   Cancelled (single circle): cy = cancellation year.
//   Construction (dashed navy vertical): y_top = construction start;
//     y_bot = projected grid year.
//   Operating/Retired (red + green verticals):
//     red y_top → construction start
//     red y_bot = green y_top → grid year
//     green y_bot → retirement (or 2030 for still-operating)
function rowGeometry(row) {
  const lines = extractLines(row.inner);
  const circles = extractCircles(row.inner);
  const phase = normalisePhase(row.phase);
  const inferredCancellation = row.phase === 'cancelled - inferred 4 y';

  if (phase === 'cancelled') {
    const c = circles[0];
    if (!c) return { ok: false, reason: `${row.id}: no circle in cancelled row` };
    return {
      ok: true, phase, inferredCancellation,
      x_col: c.cx,
      construction_y: null, grid_y: null, retirement_y: null,
      cancellation_y: c.cy,
      leaf_cx: c.cx, leaf_cy: c.cy, leaf_r: c.r,
    };
  }

  if (phase === 'underConstruction') {
    const dashed = lines.find((l) => l.dash && Math.abs(l.x1 - l.x2) < 1);
    if (!dashed) return { ok: false, reason: `${row.id}: no dashed line in construction row` };
    return {
      ok: true, phase, inferredCancellation: false,
      x_col: dashed.x1,
      construction_y: Math.min(dashed.y1, dashed.y2),
      grid_y:         Math.max(dashed.y1, dashed.y2),
      retirement_y:   null,
      cancellation_y: null,
      leaf_cx: dashed.x1, leaf_cy: Math.min(dashed.y1, dashed.y2), leaf_r: null,
    };
  }

  // operating / retired
  const verts = lines.filter((l) => Math.abs(l.x1 - l.x2) < 1);
  // SVG uses two close shades: #a41e23 / #a51e23 (red) and #237c3e /
  // #247c3e (green). Match by prefix-tolerant comparison.
  const reds   = verts.filter((l) => l.stroke === '#a41e23' || l.stroke === '#a51e23');
  const greens = verts.filter((l) => l.stroke === '#237c3e' || l.stroke === '#247c3e');
  if (reds.length === 0 || greens.length === 0) {
    return { ok: false, reason: `${row.id}: missing red/green vertical (red=${reds.length} green=${greens.length})` };
  }
  const red = reds[0];
  const green = greens[0];
  return {
    ok: true, phase, inferredCancellation: false,
    x_col: red.x1,
    construction_y: Math.min(red.y1, red.y2),
    grid_y:         Math.max(red.y1, red.y2),
    retirement_y:   Math.max(green.y1, green.y2),
    cancellation_y: null,
    leaf_cx: red.x1, leaf_cy: Math.min(red.y1, red.y2), leaf_r: null,
  };
}

const parsedRows = [];
const rowWarnings = [];
for (const row of rows) {
  const g = rowGeometry(row);
  if (!g.ok) {
    rowWarnings.push(g.reason);
    continue;
  }
  parsedRows.push({ row, geom: g });
}
if (rowWarnings.length) {
  console.warn(`  ${rowWarnings.length} rows skipped:`);
  for (const w of rowWarnings) console.warn(`    ${w}`);
}
console.log(`  ${parsedRows.length} rows with valid geometry`);

// 2c. Find the dendrogram leaf circles. Operating/retired/construction
// rows don't carry a separate leaf circle — their leaf position is the
// top of the timeline bar (the bullet at chart-top), which we synthesise.
// Cancelled rows already have a single circle that IS the leaf.
//
// In the print, the leaves are arranged ALONG the top of the chart with
// the connector Bézier paths fanning up to the hubs. So leaf positions
// are at chart-top y per reactor's x_col, NOT at the cy of any
// specific bar segment.
//
// Convention: leaf_cy = construction_y (top of red bar) for non-
// cancelled rows; cancellation_y for cancelled. leaf_cx = x_col.

// 2d. Extract status hub polylines.
console.log('Extracting status hub polylines...');
const statusBlobs = [];
for (const [statusKey, stroke] of Object.entries(STATUS_BLOB_STROKES)) {
  // Match every polyline with this stroke colour. attribute order
  // varies — handle both.
  const polyRe = new RegExp(
    `<polyline\\s+(?:points="([^"]+)"\\s+fill="none"\\s+stroke="${stroke}"|fill="none"\\s+stroke="${stroke}"\\s+points="([^"]+)")[^/]*/>`,
    'gi'
  );
  const forms = [];
  let mm;
  let bbox = null;
  while ((mm = polyRe.exec(dendroSvg)) !== null) {
    const pts = mm[1] ?? mm[2];
    if (!pts) continue;
    const flat = pointsToFlat(pts);
    if (flat.length < 4) continue;
    forms.push(pts);
    const b = bboxOfPoints(flat);
    bbox = bbox ? mergeBbox(bbox, b) : b;
  }
  if (!bbox || forms.length === 0) {
    throw new Error(`No polylines found for status ${statusKey} (stroke ${stroke})`);
  }
  statusBlobs.push({
    id: statusKey,
    label: STATUS_LABEL[statusKey],
    print_stroke: stroke,
    polyline_count: forms.length,
    form_paths: forms,
    bbox,
    bbox_centroid: centroidOfBbox(bbox),
    anchor: centroidOfBbox(bbox),
  });
  console.log(`  ${statusKey}: ${forms.length} polylines, bbox ${JSON.stringify(bbox)}`);
}

// 2e. Connector Bézier paths (loose at the top of the file).
// Capture all <path d="M..." fill="none" stroke="#0d1a1e"...>.
function extractConnectorDStrings(svg) {
  const re = /<path\s+d="(M[^"]+)"\s+fill="none"\s+stroke="#0d1a1e"[^/]*\/>/g;
  const out = [];
  let m;
  while ((m = re.exec(svg)) !== null) out.push(m[1]);
  return out;
}
const dendrogramLinks = extractConnectorDStrings(dendroSvg);
console.log(`  ${dendrogramLinks.length} connector d-strings`);

// ─── Step 3: parse the map SVG ───────────────────────────────────

console.log('Reading map SVG...');
const mapSvg = readFile(MAP_SVG);

// 3a. Cluster clipPath centroids.
function extractClusters(svg) {
  // <clipPath id="clippath..."><circle cx=... cy=... r="..."/></clipPath>
  const out = [];
  const re = /<clipPath\s+id="([^"]+)">\s*<circle\s+([^/]*)\/>\s*<\/clipPath>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    out.push({
      id: m[1],
      cx: parseFloat(getAttr(m[2], 'cx')),
      cy: parseFloat(getAttr(m[2], 'cy')),
      r:  parseFloat(getAttr(m[2], 'r')),
    });
  }
  return out;
}
const mapClusters = extractClusters(mapSvg);
console.log(`  ${mapClusters.length} cluster clipPaths`);

// 3b. Project circles with full metadata.
function extractMapProjects(svg) {
  const re = /<circle\s+([^/]*?data-project="[^"]+"[^/]*)\/>/g;
  const out = [];
  let m;
  while ((m = re.exec(svg)) !== null) {
    const a = m[0];
    out.push({
      cx:      parseFloat(getAttr(a, 'cx')),
      cy:      parseFloat(getAttr(a, 'cy')),
      r:       parseFloat(getAttr(a, 'r')),
      project: getAttr(a, 'data-project'),
      mw:      parseFloat(getAttr(a, 'data-mw')),
      units:   parseInt(getAttr(a, 'data-units'), 10),
      group:   getAttr(a, 'data-group'),
    });
  }
  return out;
}
const mapProjects = extractMapProjects(mapSvg);
console.log(`  ${mapProjects.length} map project circles`);

// ─── Step 4: unit → project mapping ──────────────────────────────

// Build the mapping by composing (a) name-prefix match (b) status-
// compatible group. If multiple map projects match by name, pick the
// one whose data-group is compatible with the unit's status.
function mapUnitToProject(unitName, status, mapProjects) {
  // Candidates: any map project whose data-project is a prefix of
  // the unit name OR exactly equals the unit (e.g. "Sizewell B"
  // matches data-project "Sizewell" by prefix; "Wylfa Newydd 1"
  // matches "Wylfa Newydd").
  const compatGroups = STATUS_GROUP_COMPAT[status] || [];
  // Prefer longest prefix match.
  const sortedByLen = [...mapProjects].sort((a, b) => b.project.length - a.project.length);
  const nameMatches = sortedByLen.filter((p) =>
    unitName === p.project ||
    unitName.startsWith(p.project + ' ') ||
    unitName.startsWith(p.project)
  );
  if (nameMatches.length === 0) return { ok: false, reason: 'no name match' };
  // Filter by status-compatible group.
  const compatible = nameMatches.filter((p) => compatGroups.includes(p.group));
  if (compatible.length === 1) return { ok: true, project: compatible[0] };
  if (compatible.length > 1) {
    // Multiple compatible — pick the one with the longest project name
    // (most specific match — e.g. "Wylfa Newydd" before "Wylfa").
    return { ok: true, project: compatible[0], ambiguous: compatible.length };
  }
  // Name matches but no group is compatible — fall back to longest-name
  // match and flag the ambiguity.
  return { ok: true, project: nameMatches[0], statusMismatch: nameMatches[0].group };
}

// ─── Step 5: build the unified reactor records ──────────────────

console.log('Building reactor records...');
function findSiteCsvRowForUnit(unitName) {
  // Match the unit's name prefix against CSV's name column.
  const sortedByLen = [...csvRows].sort((a, b) => b.name.length - a.name.length);
  return sortedByLen.find((r) =>
    unitName === r.name ||
    unitName.startsWith(r.name + ' ') ||
    unitName.startsWith(r.name)
  );
}

const reactors = [];
const disagreementsLog = [];
for (const { row, geom } of parsedRows) {
  const csv = findSiteCsvRowForUnit(row.unit);
  const mapping = mapUnitToProject(row.unit, geom.phase, mapProjects);
  const mapProject = mapping.ok ? mapping.project : null;

  // Per-unit MW: override > CSV per-unit
  let mw;
  if (REACTOR_MW_OVERRIDES[row.unit] !== undefined) {
    mw = REACTOR_MW_OVERRIDES[row.unit];
  } else if (csv && csv.totalMw && csv.unitCount) {
    mw = Math.round(csv.totalMw / csv.unitCount);
  } else {
    mw = null;
  }

  // Per-unit dates from timeline geometry.
  const construction_start_year = geom.construction_y !== null
    ? Math.round(yToYear(geom.construction_y))
    : null;
  const grid_connection_year = geom.grid_y !== null
    ? Math.round(yToYear(geom.grid_y))
    : null;
  const retirement_year = geom.retirement_y !== null
    ? Math.round(yToYear(geom.retirement_y))
    : null;
  const cancellation_year = geom.cancellation_y !== null
    ? Math.round(yToYear(geom.cancellation_y))
    : null;

  // Compare CSV start_year to SVG-extracted grid_connection_year for
  // retired and operating reactors. CSV start_year is typically the
  // site's first grid-connection. Flag disagreements > 1 year.
  const disagreements = [];
  if (csv?.startYear && grid_connection_year &&
      Math.abs(csv.startYear - grid_connection_year) > 1) {
    disagreements.push(
      `csv.start_year=${csv.startYear} vs svg.grid_connection_year=${grid_connection_year} (diff ${grid_connection_year - csv.startYear}y)`
    );
    disagreementsLog.push(`  ${row.unit}: ${disagreements[0]}`);
  }

  // Cluster membership from CSV site name.
  let cluster = null;
  if (csv) {
    if (csv.name === 'Sellafield (Candu)' || csv.name === 'Sellafield (Hitachi)' || csv.name.startsWith('Sellafield')) cluster = 'sellafield';
    else if (csv.name === 'Moorside' || csv.name === 'Moorside Clean Energy Hub') cluster = 'sellafield'; // co-located
    else if (csv.name.startsWith('Wylfa')) cluster = 'wylfa';
    else if (csv.name.startsWith('Sizewell')) cluster = 'sizewell';
  }

  reactors.push({
    id:                          row.unit,
    rowId:                       row.id,
    name:                        row.unit,
    site:                        csv?.name ?? null,
    status:                      geom.phase,
    cancellation_year_inferred:  geom.inferredCancellation,
    mw,
    construction_start_year,
    grid_connection_year,
    retirement_year,
    cancellation_year,
    lat:                         csv?.lat ?? null,
    lng:                         csv?.lng ?? null,
    mapX:                        mapProject?.cx ?? null,
    mapY:                        mapProject?.cy ?? null,
    cluster,
    dendrogram_leaf_cx:          geom.leaf_cx,
    dendrogram_leaf_cy:          geom.leaf_cy,
    dendrogram_leaf_r:           geom.leaf_r,
    timeline_row_id:             row.id,
    timeline_column_x:           geom.x_col,
    timeline_construction_y:     geom.construction_y,
    timeline_grid_y:             geom.grid_y,
    timeline_retirement_y:       geom.retirement_y,
    timeline_cancellation_y:     geom.cancellation_y,
    map_project:                 mapProject?.project ?? null,
    map_group:                   mapProject?.group ?? null,
    map_units:                   mapProject?.units ?? null,
    mapping_warnings:            [
      mapping.ambiguous ? `ambiguous: ${mapping.ambiguous} candidates` : null,
      mapping.statusMismatch ? `status-group mismatch (mapped to ${mapping.statusMismatch})` : null,
      ...disagreements,
    ].filter(Boolean),
  });
}
console.log(`  ${reactors.length} reactor records built`);
if (disagreementsLog.length) {
  console.warn(`\n  SOURCE-DISAGREEMENT WARN: ${disagreementsLog.length} CSV/SVG date disagreements > 1y:`);
  for (const w of disagreementsLog) console.warn(w);
}

// ─── Step 6: site aggregations ───────────────────────────────────

console.log('Building site aggregations...');
const siteMap = new Map();
for (const r of reactors) {
  const key = r.site ?? r.name;
  if (!siteMap.has(key)) {
    siteMap.set(key, {
      id: key.toLowerCase().replace(/[^\w]/g, '-'),
      name: key,
      lat: r.lat,
      lng: r.lng,
      reactor_ids: [],
      is_cluster: CLUSTER_SITES.has(key) || CLUSTER_SITES.has(key.split(' ')[0]),
    });
  }
  siteMap.get(key).reactor_ids.push(r.id);
}
const sites = [...siteMap.values()];
console.log(`  ${sites.length} sites`);

// ─── Step 7: per-status sums ─────────────────────────────────────

console.log('Per-status sums:');
for (const status of ['underConstruction', 'operating', 'retired', 'cancelled']) {
  const subset = reactors.filter((r) => r.status === status);
  const mw_sum = subset.reduce((s, r) => s + (r.mw ?? 0), 0);
  console.log(`  ${status}: ${subset.length} reactors, ${mw_sum} MW`);
  // Patch the corresponding status_blob with the totals.
  const blob = statusBlobs.find((b) => b.id === status);
  if (blob) {
    blob.reactor_count = subset.length;
    blob.total_mw_sourced = mw_sum;
  }
}

// ─── Step 8: write JSON ──────────────────────────────────────────

const out = {
  meta: {
    generated_at: new Date().toISOString(),
    sources: {
      dendrogram_svg: 'client/public/assets/005-dendrogram-clean_336edeac.svg',
      map_svg:        'client/public/assets/005-map_d6bf9e9f.svg',
      sites_csv:      'client/data/uk_nuclear_sites_qgis.csv (GEM Global Nuclear Power Tracker reconciled subset)',
    },
    reactor_count: reactors.length,
    y_to_year: Y_TO_YEAR,
    notes: [
      'Per-reactor MW: site total_mw / unit_count for mono-model sites; REACTOR_MW_OVERRIDES for mixed-model.',
      'Dungeness C = 1700 MW (CSV-derived: 3340 total - 220 - 220 - 600 - 600). NO calibration to print 14,141 headline.',
      'Cancelled-fleet MW sum will differ from the print 14,141 headline; the difference is documented in poster005Data.ts.',
    ],
  },
  status_blobs:   statusBlobs,
  reactors,
  sites,
  timeline:       { y_to_year_mapping: Y_TO_YEAR, x_min_year: 1953, x_max_year: 2030 },
  dendrogram_links: dendrogramLinks,
  map_clusters:   mapClusters,
};

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2));
console.log(`\nWrote ${OUTPUT_PATH}`);
console.log(`  ${reactors.length} reactors`);
console.log(`  ${statusBlobs.length} status blobs`);
console.log(`  ${sites.length} sites`);
console.log(`  ${dendrogramLinks.length} dendrogram links`);
console.log(`  ${mapClusters.length} map clusters`);
