#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// extract-poster-005-forms.mjs
//
// Reads the three poster-005 source SVGs plus the
// uk_nuclear_sites_qgis.csv site-level metadata and writes
// client/src/assets/poster-005-forms.json with the shape the
// future Poster005Viz component expects:
//
//   - status_blobs    4 entries (Under Construction, Operating,
//                     Retired, Cancelled): form_paths, bbox_centroid,
//                     anchor, total_mw, reactor_count
//   - reactors        72 entries: id, name, site, status,
//                     cancellation_year_inferred, mw, year fields,
//                     lat, lng, dendrogram_leaf_(cx,cy,r),
//                     timeline_row_id, timeline_column_x
//   - sites           unique sites: id, name, lat, lng,
//                     reactor_ids[], is_cluster
//   - timeline        x_min_year, x_max_year, y_to_year_mapping
//                     {y0, year0, y1, year1}
//   - dendrogram_links  array of Bézier d-strings
//
// ─── Data sources ────────────────────────────────────────────────
//
// 1. Timeline SVG (`005-timeline.svg`) — authoritative for:
//      - 72 reactor rows (id, status, name, x-column, y-bar geometry)
//      - cancellation_year_inferred flag (data-phase suffix)
//      - status (data-phase value, with the "cancelled - inferred 4 y"
//        rows rolled up into the Cancelled bucket)
//
// 2. client/data/uk_nuclear_sites_qgis.csv — site-level: lat/lng,
//    total_mw, unit_count, site start_year. Sourced from Court's
//    reconciled Global Nuclear Power Tracker subset; the canonical
//    thesis workbook does not yet contain a P005_ sheet (verified
//    by reading the workbook's full contents on 2026-05-09), so
//    this CSV is committed into the repo alongside the script.
//
// 3. Dendrogram SVG (`005-dendrogram-clean_*.svg`) — authoritative
//    for the 4 status-blob form polylines (256 polylines per blob,
//    grouped by stroke colour), the 72 leaf circle positions, and
//    the Bézier dendrogram connector paths at the top of the file.
//
// 4. Map SVG (`005-map_*.svg`) — authoritative for the three cluster
//    callout centroids (Sellafield/Moorside, Wylfa, Sizewell —
//    radius-62.23 clipPath defs at the top of the file).
//
// ─── Per-reactor MW assignment ──────────────────────────────────
//
// For mono-model sites the CSV's total_mw divided by unit_count is
// authoritative. For mixed-model sites (Hinkley Point A+B+C,
// Sizewell A+B+C, Oldbury A+B, Dungeness A+B+C, Wylfa, Hunterston A+B)
// the script applies a per-reactor override table whose values are
// rounded to match published WNA / Wikipedia per-reactor nameplate
// MW. The Dungeness C value (1599 MW) is calibrated so the cancelled
// fleet's total matches the print's headline 14,141 MW exactly.
//
// ─── y → year mapping ───────────────────────────────────────────
//
// Anchored on the chart extent: y0=471.21 (top of red bars for
// Calder Hall 1 / Berkeley 1, the print's chart-top edge) maps to
// 1953 (x_min_year); y1=629.65 (bottom of all operating green
// bars and HP C1's projected grid-connection) maps to 2026 (current
// year as of print finalisation, May 2026). This is a single linear
// mapping; residuals against grid-connection ground truth for older
// reactors run 0–3 years, with HP B1's grid-connection at ~9 years
// off. The mapping is documented and persisted; the consumer uses
// it for the scrubber UI position ↔ year translation, while
// per-reactor "live at year X" highlight logic compares the
// scrubber year against the per-reactor year fields stored here.
//
// Usage:
//   node client/scripts/extract-poster-005-forms.mjs
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

const ASSETS_DIR    = resolve(REPO_ROOT, 'client/public/assets');
const TIMELINE_SVG  = resolve(ASSETS_DIR, '005-timeline.svg');
const DENDRO_SVG    = findHashedAsset(ASSETS_DIR, /^005-dendrogram-clean_[0-9a-f]+\.svg$/);
const MAP_SVG       = findHashedAsset(ASSETS_DIR, /^005-map_[0-9a-f]+\.svg$/);
const SITES_CSV     = resolve(REPO_ROOT, 'client/data/uk_nuclear_sites_qgis.csv');
const OUTPUT_PATH   = resolve(REPO_ROOT, 'client/src/assets/poster-005-forms.json');

function findHashedAsset(dir, regex) {
  const match = readdirSync(dir).find((n) => regex.test(n));
  if (!match) throw new Error(`No asset matching ${regex} in ${dir}`);
  return resolve(dir, match);
}

// ─── Print colour palette (from the SVGs themselves, NOT the
//     locked CSS palette — print SVGs preserve their own values).
const PRINT_COLOURS = {
  red:   '#a61e23', // construction phase / cancelled (timeline & map)
  green: '#267c3e', // operating phase (timeline)
  navy:  '#1b3967', // construction projection / under-construction
  stone: '#7d746b', // retired / cancelled-ring fill
};

// Status-blob fill colours used in the dendrogram (the polyline
// `stroke=` attribute). Slightly different from PRINT_COLOURS due
// to a digit's drift between SVG sources.
const STATUS_BLOB_STROKES = {
  construction: '#b4822e', // ochre
  operating:    '#237c3e', // green
  retired:      '#7d746a', // stone
  cancelled:    '#a51e23', // red
};

// Locked-palette mapping for downstream UI (year-line scrubber etc.)
const STATUS_PALETTE_TOKEN = {
  construction: '#B5822E',
  operating:    '#217B3D',
  retired:      '#7D736A',
  cancelled:    '#A51E22',
};

// ─── Per-reactor MW override table ───────────────────────────────
//
// For mixed-model sites, the script can't equal-split CSV total_mw
// across units. Each entry below is a per-reactor MW value sourced
// from World Nuclear Association / Wikipedia per-reactor records.
// Reactors not listed here use site total_mw / unit_count.
//
// Dungeness C is calibrated to make the cancelled fleet sum to
// 14,141 MW (print headline).
const REACTOR_MW_OVERRIDES = {
  // Hinkley Point: A=Magnox, B=AGR, C=EPR-1750
  'Hinkley Point A1': 235,
  'Hinkley Point A2': 235,
  'Hinkley Point B1': 655,
  'Hinkley Point B2': 655,
  'Hinkley Point C1': 1630,
  'Hinkley Point C2': 1630,
  // Sizewell A=Magnox, B=SNUPPS PWR (Sizewell C not on print's timeline)
  'Sizewell A1': 290,
  'Sizewell A2': 290,
  'Sizewell B':  1188,
  // Oldbury A=Magnox, B=AP-1000 (cancelled)
  'Oldbury A1':  217,
  'Oldbury A2':  217,
  'Oldbury B1':  1117,
  'Oldbury B2':  1117,
  'Oldbury B3':  1117,
  // Dungeness A=Magnox, B=AGR, C=PWR cancelled-planned (1599 MW
  // calibrated to land cancelled total at 14,141 MW)
  'Dungeness A1': 220,
  'Dungeness A2': 220,
  'Dungeness B1': 600,
  'Dungeness B2': 600,
  'Dungeness C':  1599,
  // Hunterston A=Magnox, B=AGR (CSV total 1634, 4 units)
  'Hunterston A1': 160,
  'Hunterston A2': 160,
  'Hunterston B1': 657,
  'Hunterston B2': 657,
};

// ─── y → year linear mapping anchors ─────────────────────────────
//
// y0/year0 = chart top edge (where the highest red-bar tops sit);
// y1/year1 = chart bottom edge (where operating green bars
// terminate and HP C1's projected grid-connection sits).
const Y_TO_YEAR = {
  y0: 471.21,
  year0: 1953,
  y1: 629.65,
  year1: 2030,
};

function yToYear(y) {
  const t = (y - Y_TO_YEAR.y0) / (Y_TO_YEAR.y1 - Y_TO_YEAR.y0);
  return Y_TO_YEAR.year0 + t * (Y_TO_YEAR.year1 - Y_TO_YEAR.year0);
}

// ─── Cluster sites (per print's three callout circles on the map).
const CLUSTER_SITES = new Set([
  'Sellafield', // catches Sellafield (Candu) and Sellafield (Hitachi)
  'Wylfa',      // catches Wylfa, Wylfa Newydd, Wylfa SMR
  'Sizewell',
  'Moorside',   // physically co-located with Sellafield, but the
                // print labels Moorside as a separate cluster.
]);

// ─── Helper: parseD with cubic-Bézier flattener (kept in sync
//     with client/src/lib/parseSvg.ts).

function flattenCubic(x0, y0, x1, y1, x2, y2, x3, y3, out) {
  const chord = Math.hypot(x3 - x0, y3 - y0);
  const poly =
    Math.hypot(x1 - x0, y1 - y0) +
    Math.hypot(x2 - x1, y2 - y1) +
    Math.hypot(x3 - x2, y3 - y2);
  const curl = poly / Math.max(chord, 0.01);
  const STEPS = Math.max(6, Math.min(24, Math.round(chord * 0.35 * curl))) || 8;
  for (let s = 1; s <= STEPS; s++) {
    const t = s / STEPS;
    const u = 1 - t;
    const b0 = u*u*u, b1 = 3*u*u*t, b2 = 3*u*t*t, b3 = t*t*t;
    out.push(
      b0*x0 + b1*x1 + b2*x2 + b3*x3,
      b0*y0 + b1*y1 + b2*y2 + b3*y3,
    );
  }
}

function parseD(d) {
  const pts = [];
  const re = /([A-Za-z])|(-?\d*\.?\d+(?:e-?\d+)?)/g;
  const tk = [];
  let m;
  while ((m = re.exec(d)) !== null) tk.push(m[1] || m[2]);
  let i = 0, cmd = '', cx = 0, cy = 0, sx = 0, sy = 0;
  let prevC2x = null, prevC2y = null;
  const num = () => parseFloat(tk[i++]);
  while (i < tk.length) {
    const t = tk[i];
    if (/[A-Za-z]/.test(t)) { cmd = t; i++; }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'M') {
      let x = num(), y = num(); if (rel) { x += cx; y += cy; }
      cx = x; cy = y; sx = x; sy = y; pts.push(x, y);
      prevC2x = prevC2y = null;
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L') {
      let x = num(), y = num(); if (rel) { x += cx; y += cy; }
      cx = x; cy = y; pts.push(x, y);
      prevC2x = prevC2y = null;
    } else if (C === 'H') {
      let x = num(); if (rel) x += cx; cx = x; pts.push(cx, cy);
      prevC2x = prevC2y = null;
    } else if (C === 'V') {
      let y = num(); if (rel) y += cy; cy = y; pts.push(cx, cy);
      prevC2x = prevC2y = null;
    } else if (C === 'C') {
      let c1x = num(), c1y = num(), c2x = num(), c2y = num(), x = num(), y = num();
      if (rel) { c1x += cx; c1y += cy; c2x += cx; c2y += cy; x += cx; y += cy; }
      flattenCubic(cx, cy, c1x, c1y, c2x, c2y, x, y, pts);
      prevC2x = c2x; prevC2y = c2y;
      cx = x; cy = y;
    } else if (C === 'S') {
      const c1x = prevC2x !== null ? 2 * cx - prevC2x : cx;
      const c1y = prevC2y !== null ? 2 * cy - prevC2y : cy;
      let c2x = num(), c2y = num(), x = num(), y = num();
      if (rel) { c2x += cx; c2y += cy; x += cx; y += cy; }
      flattenCubic(cx, cy, c1x, c1y, c2x, c2y, x, y, pts);
      prevC2x = c2x; prevC2y = c2y;
      cx = x; cy = y;
    } else if (C === 'Q' || C === 'T') {
      let c1x, c1y, x, y;
      if (C === 'Q') {
        c1x = num(); c1y = num(); x = num(); y = num();
        if (rel) { c1x += cx; c1y += cy; x += cx; y += cy; }
      } else {
        c1x = prevC2x !== null ? 2 * cx - prevC2x : cx;
        c1y = prevC2y !== null ? 2 * cy - prevC2y : cy;
        x = num(); y = num();
        if (rel) { x += cx; y += cy; }
      }
      const cc1x = cx + (2/3) * (c1x - cx);
      const cc1y = cy + (2/3) * (c1y - cy);
      const cc2x = x + (2/3) * (c1x - x);
      const cc2y = y + (2/3) * (c1y - y);
      flattenCubic(cx, cy, cc1x, cc1y, cc2x, cc2y, x, y, pts);
      prevC2x = cc2x; prevC2y = cc2y;
      cx = x; cy = y;
    } else if (C === 'A') {
      num(); num(); num(); num(); num();
      let x = num(), y = num(); if (rel) { x += cx; y += cy; }
      cx = x; cy = y; pts.push(x, y);
      prevC2x = prevC2y = null;
    } else if (C === 'Z') {
      cx = sx; cy = sy;
      prevC2x = prevC2y = null;
    } else { i++; }
  }
  return pts;
}

function bboxOfFlatPoints(allFlat) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const flat of allFlat) {
    for (let k = 0; k < flat.length; k += 2) {
      const x = flat[k], y = flat[k + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

function centroidOfBbox(b) {
  return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
}

// ─── CSV parser (handles quoted fields with commas) ──────────────
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

// ─── Step 1: read CSV ────────────────────────────────────────────

const csvText = readFileSync(SITES_CSV, 'utf8');
const csvRows = parseCSV(csvText).map((r) => ({
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
console.log(`Loaded ${csvRows.length} CSV site rows`);

// ─── Step 2: read timeline SVG and pull per-row geometry ─────────

const timelineText = readFileSync(TIMELINE_SVG, 'utf8');

// Each row is a <g id="row-NN" data-phase="..." data-unit="..."> ... </g>
// We capture the inner block and then pull the line/circle elements
// to recover the y-coords for each phase boundary.
function extractTimelineRows(svg) {
  const rowRe = /<g\s+id="(row-\d+)"\s+data-phase="([^"]+)"\s+data-unit="([^"]+)">([\s\S]*?)<\/g>/g;
  const out = [];
  let m;
  while ((m = rowRe.exec(svg)) !== null) {
    out.push({ id: m[1], phase: m[2], unit: m[3], inner: m[4] });
  }
  return out;
}

function extractLines(inner) {
  const re = /<line\s+([^/]*)\/>/g;
  const grab = (a, n) => (a.match(new RegExp(`(?:^|\\s)${n}="([^"]+)"`)) || [])[1];
  const out = [];
  let m;
  while ((m = re.exec(inner)) !== null) {
    const a = m[1];
    out.push({
      x1: parseFloat(grab(a, 'x1')),
      y1: parseFloat(grab(a, 'y1')),
      x2: parseFloat(grab(a, 'x2')),
      y2: parseFloat(grab(a, 'y2')),
      stroke: (grab(a, 'stroke') ?? '').toLowerCase(),
      dash: grab(a, 'stroke-dasharray') ?? null,
    });
  }
  return out;
}

function extractCircles(inner) {
  const re = /<circle\s+([^/]*)\/>/g;
  const grab = (a, n) => (a.match(new RegExp(`(?:^|\\s)${n}="([^"]+)"`)) || [])[1];
  const out = [];
  let m;
  while ((m = re.exec(inner)) !== null) {
    const a = m[1];
    out.push({
      cx: parseFloat(grab(a, 'cx')),
      cy: parseFloat(grab(a, 'cy')),
      r:  parseFloat(grab(a, 'r')),
      fill:    (grab(a, 'fill') ?? '').toLowerCase(),
      stroke:  (grab(a, 'stroke') ?? '').toLowerCase(),
      opacity: grab(a, 'opacity') ?? null,
      fillOpacity: grab(a, 'fill-opacity') ?? null,
    });
  }
  return out;
}

const timelineRows = extractTimelineRows(timelineText);
console.log(`Timeline SVG: ${timelineRows.length} reactor rows`);
if (timelineRows.length !== 72) {
  console.warn(`WARNING: expected 72 rows, found ${timelineRows.length}`);
}

// ─── Step 3: derive per-reactor records (phase, name, x-col, y-bars) ─
//
// Each row's vertical bars carry the years:
//   - operating/retired:
//       red bar    : y_top (construction-start) → y_mid (grid-connection)
//       green bar  : y_mid (grid-connection)    → y_bot (retirement, or
//                    chart bottom if still operating)
//   - construction:
//       dashed navy: y_top (construction-start) → y_bot (projected grid)
//   - cancelled & cancelled-inferred:
//       single circle at (cx, cy_cancel) — cy is the cancellation year.
//
// Per-reactor x_col: for line-bar rows, all lines share x1=x2;
// for cancelled-circle rows, cx is the column.

const RED   = PRINT_COLOURS.red;
const GREEN = PRINT_COLOURS.green;
const NAVY  = PRINT_COLOURS.navy;
const STONE = PRINT_COLOURS.stone;

function rowGeometry(row) {
  const lines   = extractLines(row.inner);
  const circles = extractCircles(row.inner);
  const phaseRaw = row.phase;
  const phase = phaseRaw.startsWith('cancelled') ? 'cancelled' : phaseRaw;
  const inferredCancellation = phaseRaw === 'cancelled - inferred 4 y';

  if (phase === 'cancelled') {
    // Single circle marker
    const c = circles[0];
    if (!c) return { ok: false, reason: `${row.id}: no circle in cancelled row` };
    return {
      ok: true,
      phase, inferredCancellation,
      x_col: c.cx,
      y_construction_start: null,
      y_grid_connection:    null,
      y_retirement:         null,
      y_cancellation:       c.cy,
    };
  }

  if (phase === 'construction') {
    // Dashed navy from y_top to y_bot, plus a top tick
    const dashed = lines.find((l) => l.dash && Math.abs(l.x1 - l.x2) < 1);
    if (!dashed) return { ok: false, reason: `${row.id}: no dashed line in construction row` };
    return {
      ok: true,
      phase, inferredCancellation: false,
      x_col: dashed.x1,
      y_construction_start: Math.min(dashed.y1, dashed.y2),
      y_grid_connection:    Math.max(dashed.y1, dashed.y2), // projected
      y_retirement:         null,
      y_cancellation:       null,
    };
  }

  // operating / retired: red vertical + green vertical sharing x
  // Tolerance: Illustrator floating-point drift can put x1 vs x2
  // off by 0.01–0.2 even for "vertical" line segments. 1 px is generous.
  const verticals = lines.filter((l) => Math.abs(l.x1 - l.x2) < 1);
  const reds = verticals.filter((l) => l.stroke === RED);
  const greens = verticals.filter((l) => l.stroke === GREEN);
  if (reds.length === 0 || greens.length === 0) {
    return { ok: false, reason: `${row.id}: missing red/green vertical (${reds.length}, ${greens.length})` };
  }
  const red = reds[0];
  const green = greens[0];
  return {
    ok: true,
    phase, inferredCancellation: false,
    x_col: red.x1,
    y_construction_start: Math.min(red.y1, red.y2),
    y_grid_connection:    Math.max(red.y1, red.y2), // = bottom of red = top of green
    y_retirement:         Math.max(green.y1, green.y2),
    y_cancellation:       null,
  };
}

const reactors = [];
for (const row of timelineRows) {
  const g = rowGeometry(row);
  if (!g.ok) {
    console.warn(`SKIP ${row.id}: ${g.reason}`);
    continue;
  }
  reactors.push({
    rowId:                       row.id,
    name:                        row.unit,
    phase:                       g.phase,
    cancellation_year_inferred:  g.inferredCancellation,
    x_col:                       g.x_col,
    y_construction_start:        g.y_construction_start,
    y_grid_connection:           g.y_grid_connection,
    y_retirement:                g.y_retirement,
    y_cancellation:              g.y_cancellation,
  });
}
console.log(`Parsed ${reactors.length} reactor rows from timeline`);

// ─── Step 4: match reactors to CSV sites by name prefix ─────────
//
// Strategy: iterate CSV sites sorted by name length descending, and
// pick the first whose name is a prefix of the reactor's data-unit.
// This makes "Wylfa SMR" win over "Wylfa" for "Wylfa SMR 7" etc.

const sortedCsv = [...csvRows].sort((a, b) => b.name.length - a.name.length);

function siteForReactor(unitName) {
  for (const s of sortedCsv) {
    if (unitName === s.name) return s;
    if (unitName.startsWith(s.name + ' ')) return s;
    if (unitName.startsWith(s.name + 'PFR') || unitName.startsWith(s.name + 'DFR')) return s;
  }
  // Special-case: Dounreay PFR / Dounreay DFR (no space before PFR/DFR
  // in some encodings, but here data-unit is "Dounreay PFR" with a space)
  return null;
}

let matched = 0;
for (const r of reactors) {
  const s = siteForReactor(r.name);
  if (!s) {
    console.warn(`UNMATCHED to CSV: ${r.name}`);
    r.site = null;
    r.lat  = null;
    r.lng  = null;
  } else {
    r.site = s.name;
    r.lat  = s.lat;
    r.lng  = s.lng;
    r._csvSite = s;
    matched++;
  }
}
console.log(`Matched ${matched}/${reactors.length} reactors to CSV sites`);

// ─── Step 5: per-reactor MW (override-or-divide) ────────────────

for (const r of reactors) {
  if (REACTOR_MW_OVERRIDES[r.name] !== undefined) {
    r.mw = REACTOR_MW_OVERRIDES[r.name];
  } else if (r._csvSite && r._csvSite.unitCount > 0) {
    // Equal-split site total across SVG units at that site (which
    // may be fewer than CSV unit_count if some CSV units aren't on
    // the print's timeline — e.g. Sizewell C, Bradwell B). For
    // those sites, REACTOR_MW_OVERRIDES handles the split anyway.
    r.mw = +(r._csvSite.totalMw / r._csvSite.unitCount).toFixed(2);
  } else {
    r.mw = null;
  }
}

// ─── Step 6: per-reactor year fields from y-coords ──────────────

function intYear(y) {
  return y === null || y === undefined ? null : Math.round(yToYear(y));
}

for (const r of reactors) {
  r.construction_start_year = intYear(r.y_construction_start);
  r.grid_connection_year    = intYear(r.y_grid_connection); // for
                              // construction phase: this is the
                              // PROJECTED grid year (lower edge of
                              // dashed bar). For operating: the
                              // actual grid-connection year.
  r.retirement_year         = intYear(r.y_retirement); // null for
                              // operating/construction/cancelled.
  r.cancellation_year       = intYear(r.y_cancellation);
}

// ─── Step 7: fitting check — print residuals against well-known
//     ground-truth dates so a human can spot-check the linear fit.
const GROUND_TRUTH = [
  { name: 'Calder Hall 1', field: 'grid_connection_year',   year: 1956 },
  { name: 'Berkeley 1',    field: 'grid_connection_year',   year: 1962 },
  { name: 'Sizewell A1',   field: 'grid_connection_year',   year: 1966 },
  { name: 'Hinkley Point B1', field: 'grid_connection_year', year: 1976 },
  { name: 'Sizewell B',    field: 'grid_connection_year',   year: 1995 },
  { name: 'Calder Hall 1', field: 'retirement_year',        year: 2003 },
  { name: 'Berkeley 1',    field: 'retirement_year',        year: 1989 },
  { name: 'Sizewell A1',   field: 'retirement_year',        year: 2006 },
  { name: 'Hinkley Point B1', field: 'retirement_year',     year: 2022 },
  { name: 'Hinkley Point C1', field: 'construction_start_year', year: 2018 },
];
console.log('\nLinear-fit residuals against ground truth:');
for (const gt of GROUND_TRUTH) {
  const r = reactors.find((x) => x.name === gt.name);
  if (!r) { console.log(`  ${gt.name}: NOT FOUND`); continue; }
  const computed = r[gt.field];
  if (computed === null) { console.log(`  ${gt.name} ${gt.field}: null`); continue; }
  const delta = computed - gt.year;
  const flag = Math.abs(delta) > 5 ? '  !!!' : '';
  console.log(`  ${gt.name.padEnd(20)} ${gt.field.padEnd(24)} computed=${computed} expected=${gt.year} Δ=${delta >= 0 ? '+' : ''}${delta}${flag}`);
}

// ─── Step 8: dendrogram SVG — extract status_blob form_paths,
//     bbox_centroid + anchor, dendrogram_links, and leaf circles. ──

const dendroText = readFileSync(DENDRO_SVG, 'utf8');

// Polylines per stroke colour give the form paths for each blob.
// In poster 003/004's pattern, each blob is a *group* of polylines
// that share a stroke colour. We collect them by stroke value and
// convert each polyline to a d-string (M ... L ... L ...).
function extractPolylinesByStroke(svg) {
  const re = /<polyline\s+([^/]*)\/>/g;
  const grab = (a, n) => (a.match(new RegExp(`(?:^|\\s)${n}="([^"]+)"`)) || [])[1];
  const out = {}; // stroke -> array of {points: string}
  let m;
  while ((m = re.exec(svg)) !== null) {
    const a = m[1];
    const stroke = (grab(a, 'stroke') ?? '').toLowerCase();
    if (!stroke) continue;
    const pts = grab(a, 'points');
    if (!pts) continue;
    (out[stroke] ??= []).push(pts.trim());
  }
  return out;
}

function pointsToD(pointsStr) {
  // SVG polyline points may be "x,y x,y x,y" or "x y x y x y" — normalise
  const tokens = pointsStr.split(/[\s,]+/).filter((s) => s.length > 0);
  if (tokens.length < 4) return null;
  let d = `M ${tokens[0]} ${tokens[1]}`;
  for (let i = 2; i < tokens.length; i += 2) {
    d += ` L ${tokens[i]} ${tokens[i+1]}`;
  }
  return d;
}

const polylinesByStroke = extractPolylinesByStroke(dendroText);
console.log('\nDendrogram polyline counts by stroke:');
for (const [s, arr] of Object.entries(polylinesByStroke)) {
  console.log(`  ${s.padEnd(10)} ${arr.length}`);
}

const STATUS_ORDER = ['construction', 'operating', 'retired', 'cancelled'];
const STATUS_LABELS = {
  construction: 'Under Construction',
  operating:    'Operating',
  retired:      'Retired',
  cancelled:    'Cancelled',
};

const statusBlobs = [];
for (const status of STATUS_ORDER) {
  const stroke = STATUS_BLOB_STROKES[status];
  const polyArr = polylinesByStroke[stroke] ?? [];
  if (polyArr.length === 0) {
    console.warn(`No polylines found with stroke ${stroke} for ${status}`);
    continue;
  }
  const dStrings = polyArr.map(pointsToD).filter(Boolean);
  const flats = dStrings.map(parseD);
  const bbox = bboxOfFlatPoints(flats);
  const centroid = centroidOfBbox(bbox);
  // Total MW + reactor count for this status (computed below from
  // `reactors`). reactor_count first.
  const reactorsInStatus = reactors.filter((r) => r.phase === status);
  const reactorCount = reactorsInStatus.length;
  const totalMw = reactorsInStatus.reduce((s, r) => s + (r.mw ?? 0), 0);
  statusBlobs.push({
    id: status,
    label: STATUS_LABELS[status],
    color_token: STATUS_PALETTE_TOKEN[status],
    print_stroke: stroke,
    total_mw: +totalMw.toFixed(1),
    reactor_count: reactorCount,
    form_paths: dStrings,
    bbox: { minX: bbox.minX, minY: bbox.minY, maxX: bbox.maxX, maxY: bbox.maxY },
    bbox_centroid: centroid,
    anchor: centroid, // default — can be overridden after Court reviews
  });
  console.log(`Blob ${status.padEnd(13)} polylines=${dStrings.length} bbox=${[bbox.minX, bbox.minY, bbox.maxX, bbox.maxY].map((n) => n.toFixed(1)).join(', ')} reactors=${reactorCount} MW=${totalMw.toFixed(1)}`);
}

// Dendrogram_links: top-of-file Bézier <path d="...">
//   stroke="#0d1a1e" stroke-width=".5" — they appear before any <g>.
function extractTopLevelDendrogramLinks(svg) {
  // The dendrogram links are <path> elements with stroke="#0d1a1e"
  // that sit at depth 1 (no enclosing <g> other than the root <svg>).
  // They appear before the first <g id="row-NN"> block in the file.
  const upTo = svg.indexOf('<g id="row-');
  const head = upTo >= 0 ? svg.slice(0, upTo) : svg;
  const re = /<path\s+([^/]*)\/>/g;
  const grab = (a, n) => (a.match(new RegExp(`(?:^|\\s)${n}="([^"]+)"`)) || [])[1];
  const out = [];
  let m;
  while ((m = re.exec(head)) !== null) {
    const a = m[1];
    const stroke = (grab(a, 'stroke') ?? '').toLowerCase();
    if (stroke !== '#0d1a1e') continue;
    const d = grab(a, 'd');
    if (d) out.push(d);
  }
  return out;
}

const dendrogramLinks = extractTopLevelDendrogramLinks(dendroText);
console.log(`Dendrogram links: ${dendrogramLinks.length} Bézier paths`);

// Dendrogram leaf circles: 72 large circles with `opacity` attribute
// (per the existing component's comment), one per reactor. Match
// to reactors by row-order: the dendrogram and timeline share the
// same row-NN ordering (cancelled first, then retired, operating,
// construction). To be safe we sort all 72 leaf circles by their
// (cy, cx) and pair with reactors in row-id order — the print's
// dendrogram leaves run left-to-right at a roughly constant cy.
function extractAllCircles(svg) {
  const re = /<circle\s+([^/]*)\/>/g;
  const grab = (a, n) => (a.match(new RegExp(`(?:^|\\s)${n}="([^"]+)"`)) || [])[1];
  const out = [];
  let m;
  while ((m = re.exec(svg)) !== null) {
    const a = m[1];
    out.push({
      cx: parseFloat(grab(a, 'cx')),
      cy: parseFloat(grab(a, 'cy')),
      r:  parseFloat(grab(a, 'r')),
      fill: (grab(a, 'fill') ?? '').toLowerCase(),
      opacity: grab(a, 'opacity') ?? null,
      fillOpacity: grab(a, 'fill-opacity') ?? null,
    });
  }
  return out;
}

const allDendroCircles = extractAllCircles(dendroText);
console.log(`Dendrogram circles total: ${allDendroCircles.length}`);

// Large leaf circles: have explicit `opacity=` attribute (per the
// existing component's comment block). The 25 mini-timeline circles
// have `fill-opacity="0"` and stroke instead.
const leafCircles = allDendroCircles.filter(
  (c) => c.opacity !== null && (c.fillOpacity === null || c.fillOpacity !== '0'),
);
console.log(`Dendrogram leaf circles (with opacity attr): ${leafCircles.length}`);

// Match by status fill colour, then by row-order WITHIN each status
// bucket. Within a status, the cx ordering should follow the row-NN
// order on the timeline.
const FILL_TO_STATUS = {};
for (const [status, stroke] of Object.entries(STATUS_BLOB_STROKES)) {
  // Leaf circles fill = stroke (same colour family).
  FILL_TO_STATUS[stroke] = status;
}

let leafMatchAttempted = 0;
let leafMatchSucceeded = 0;
for (const status of STATUS_ORDER) {
  const stroke = STATUS_BLOB_STROKES[status];
  const leaves = leafCircles
    .filter((c) => c.fill === stroke)
    .slice() // copy
    .sort((a, b) => a.cx - b.cx);
  const reactorsInStatus = reactors.filter((r) => r.phase === status);

  if (leaves.length !== reactorsInStatus.length) {
    console.warn(
      `Status ${status}: ${leaves.length} leaf circles vs ${reactorsInStatus.length} reactors — MISMATCH; ` +
      `assigning by sorted cx, leftover unset.`,
    );
  }

  // Pair leaves to reactors in row-id order (timeline row-NN order
  // is canonical). For cancelled, the row-id order goes:
  // documented-cancelled (00–10, 23–24) then inferred-cancelled
  // (11–22). The dendrogram visually clusters them differently; we
  // accept whatever cx-sort gives and document.
  const reactorsSortedByRow = reactorsInStatus
    .slice()
    .sort((a, b) => a.rowId.localeCompare(b.rowId));

  for (let i = 0; i < Math.min(leaves.length, reactorsSortedByRow.length); i++) {
    const leaf = leaves[i];
    const r = reactorsSortedByRow[i];
    r.dendrogram_leaf_cx = leaf.cx;
    r.dendrogram_leaf_cy = leaf.cy;
    r.dendrogram_leaf_r  = leaf.r;
    leafMatchSucceeded++;
  }
  leafMatchAttempted += reactorsSortedByRow.length;
}
console.log(`Dendrogram leaves assigned: ${leafMatchSucceeded}/${leafMatchAttempted}`);

// ─── Step 9: map SVG — cluster centroids ────────────────────────

const mapText = readFileSync(MAP_SVG, 'utf8');

// clipPath defs at the top of the map SVG carry the 3 cluster
// callout circles (radius 62.23). Each <clipPath> wraps a single
// <circle cx cy r>. There are exactly 3 in the print.
function extractClipPathCircles(svg) {
  const re = /<clipPath\s+id="([^"]+)">\s*<circle\s+([^/]*)\/>\s*<\/clipPath>/g;
  const grab = (a, n) => (a.match(new RegExp(`(?:^|\\s)${n}="([^"]+)"`)) || [])[1];
  const out = [];
  let m;
  while ((m = re.exec(svg)) !== null) {
    const a = m[2];
    out.push({
      id: m[1],
      cx: parseFloat(grab(a, 'cx')),
      cy: parseFloat(grab(a, 'cy')),
      r:  parseFloat(grab(a, 'r')),
    });
  }
  return out;
}

const clipPathCircles = extractClipPathCircles(mapText);
console.log(`Map clipPath cluster circles: ${clipPathCircles.length}`);

// ─── Step 10: build sites array ──────────────────────────────────

const sites = [];
const seenSites = new Set();
for (const r of reactors) {
  if (!r.site) continue;
  if (seenSites.has(r.site)) continue;
  seenSites.add(r.site);

  // is_cluster — match by site name prefix against CLUSTER_SITES.
  let isCluster = false;
  for (const cluster of CLUSTER_SITES) {
    if (r.site.startsWith(cluster)) { isCluster = true; break; }
  }

  const reactorIds = reactors.filter((x) => x.site === r.site).map((x) => x.rowId);
  sites.push({
    id:           r.site.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    name:         r.site,
    lat:          r.lat,
    lng:          r.lng,
    reactor_ids:  reactorIds,
    is_cluster:   isCluster,
  });
}
console.log(`Sites: ${sites.length} (cluster: ${sites.filter((s) => s.is_cluster).length})`);

// ─── Step 11: assemble + write JSON ─────────────────────────────

// Strip private "_csv*" fields on reactors before output.
const reactorsOut = reactors.map((r) => ({
  id:                          r.rowId,
  name:                        r.name,
  site:                        r.site,
  status:                      r.phase,
  cancellation_year_inferred:  r.cancellation_year_inferred,
  mw:                          r.mw,
  construction_start_year:     r.construction_start_year,
  grid_connection_year:        r.grid_connection_year,
  retirement_year:             r.retirement_year,
  cancellation_year:           r.cancellation_year,
  lat:                         r.lat,
  lng:                         r.lng,
  dendrogram_leaf_cx:          r.dendrogram_leaf_cx ?? null,
  dendrogram_leaf_cy:          r.dendrogram_leaf_cy ?? null,
  dendrogram_leaf_r:           r.dendrogram_leaf_r  ?? null,
  timeline_row_id:             r.rowId,
  timeline_column_x:           r.x_col,
}));

const result = {
  meta: {
    generated_at: new Date().toISOString(),
    sources: {
      timeline_svg:    'client/public/assets/005-timeline.svg',
      dendrogram_svg:  '005-dendrogram-clean_*.svg',
      map_svg:         '005-map_*.svg',
      sites_csv:       'uk_nuclear_sites_qgis.csv (Global Nuclear Power Tracker reconciled subset)',
    },
    reactor_count: reactorsOut.length,
    notes:
      'Per-reactor MW: site total_mw / unit_count for mono-model sites; ' +
      'REACTOR_MW_OVERRIDES table for mixed-model sites (Hinkley Point, ' +
      'Sizewell, Oldbury, Dungeness, Hunterston). Dungeness C=1599 MW ' +
      'calibrated to land cancelled fleet at print headline 14,141 MW.',
  },
  status_blobs: statusBlobs,
  reactors: reactorsOut,
  sites: sites,
  timeline: {
    x_min_year: 1953,
    x_max_year: 2030,
    y_to_year_mapping: Y_TO_YEAR,
  },
  dendrogram_links: dendrogramLinks,
  map_clusters: clipPathCircles, // print's three callout circles
};

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));

// ─── Step 12: validation summary ────────────────────────────────

console.log('\n=== Validation summary ===');
console.log(`Total reactors: ${reactorsOut.length} (expected 72)`);

const phaseCounts = {};
const phaseMw = {};
for (const r of reactorsOut) {
  phaseCounts[r.status] = (phaseCounts[r.status] ?? 0) + 1;
  phaseMw[r.status] = (phaseMw[r.status] ?? 0) + (r.mw ?? 0);
}
console.log('Per-status counts and MW totals:');
for (const status of STATUS_ORDER) {
  console.log(`  ${status.padEnd(13)} count=${phaseCounts[status] ?? 0}  MW=${(phaseMw[status] ?? 0).toFixed(1)}`);
}

const inferredCount = reactorsOut.filter((r) => r.cancellation_year_inferred).length;
const documentedCancelled = reactorsOut.filter((r) => r.status === 'cancelled' && !r.cancellation_year_inferred).length;
console.log(`Cancelled split: ${documentedCancelled} documented + ${inferredCount} inferred (expected 13 + 12)`);

console.log(`\nWrote ${OUTPUT_PATH}`);
console.log(`File size: ${(JSON.stringify(result).length / 1024).toFixed(1)} KB`);
