#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// extract-poster-004-forms.mjs
//
// Reads the poster 004 SVG, extracts:
//   - 7 form groups (1 hub/total + 6 carriers), each as an array of
//     path d-strings plus a BBox centroid
//   - the ~80 connector paths from <g id="links">, classified by
//     endpoint matching against carrier centroids and sector dots
//     into hub_to_carrier and carrier_to_sector lists
//   - the 69 sector circles, attributed to a carrier by fill colour
//     and merged with a vetted twh + label from the v2 data layer
//
// Writes client/src/assets/poster-004-forms.json with the shape the
// future Poster004CanvasViz component expects.
//
// SVG element IDs are mislabeled in the Illustrator export — the
// canonical mapping is by visual fill colour for circles and by a
// hardcoded form-id → carrier table (sourced from the v1 component's
// own canonical comment block) for the form groups.
//
// Sector twh + label values are pulled directly from the print PDF
// (004-version2_014ffb7f.pdf) which exports text as extractable
// text rather than outlined paths. All 69 entries verified:
//   - Per-carrier sums match the headline TWh within rounding
//   - Total sums to 1,542 TWh (= the body-prose total)
//   - Entry counts match SVG circle counts exactly per carrier
//
// PRINT_SECTORS supersedes the v2 PR's data (which had several
// wrong values and one spurious entry). The print PDF is now the
// authoritative source.
//
// Tie note: a few carriers have sector pairs/triples with identical
// TWh (Heat: Paper & printing 0.3 / Agriculture 0.3; Solid fuel:
// Misc 0.1 / Non-energy use 0.1 / Rail 0.1). The script's sort-by-
// magnitude-then-zip pairing assigns labels arbitrarily within
// each tie group, which means the label next to a given dot may
// not match the print's exact placement for those entries. Visual
// impact is negligible (the dots are identical-radius and clustered
// together); accepted as-is. A spatial-proximity tie-breaker pass
// can be added later if it visibly bothers anyone.
//
// Usage:
//   node client/scripts/extract-poster-004-forms.mjs
//   node client/scripts/extract-poster-004-forms.mjs --verify
//
// In --verify mode the script ALSO writes /tmp/p004-verify.svg —
// a small annotated SVG showing each form's BBox, BBox centroid,
// connector anchor, every sector circle, and every connector. The
// four unmatched circles (without v2 sector data) are drawn in a
// distinct stroke colour with numeric labels ?1–?4 so they're
// trivially spot-able against the print.
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const INPUT_PATH = resolve(
  REPO_ROOT,
  'client/public/assets/004-processed_a9547a07.svg',
);
const OUTPUT_PATH = resolve(
  REPO_ROOT,
  'client/src/assets/poster-004-forms.json',
);

// ─── Carrier table ───────────────────────────────────────────────
// formId is the Illustrator group id. carrierKey is the canonical
// id used in the JSON output and in the consumer component.
// fillColour is the value circles use in their `fill=` attribute
// for sectors of this carrier — note slight hex variation vs
// CLAUDE.md palette (the print export drifts by a digit or two).
const CARRIERS = [
  { formId: 'form-electricity',     carrierKey: 'total',       fillColour: null,       twh: 1542, paletteHex: '#0D1A1E' },
  { formId: 'form-petroleum',       carrierKey: 'petroleum',   fillColour: '#a61e23',  twh: 729,  paletteHex: '#a51e22' },
  { formId: 'form-heat',            carrierKey: 'naturalGas',  fillColour: '#1b3967',  twh: 432,  paletteHex: '#1c3867' },
  { formId: 'form-bioenergy',       carrierKey: 'electricity', fillColour: '#b4822e',  twh: 272,  paletteHex: '#b5822e' },
  { formId: 'form-electricity-2',   carrierKey: 'bioenergy',   fillColour: '#267c3e',  twh: 85,   paletteHex: '#217b3d' },
  { formId: 'form-natural-gas',     carrierKey: 'heat',        fillColour: '#4b6e70',  twh: 14,   paletteHex: '#4a6e70' },
  { formId: 'form-solid-fuel',      carrierKey: 'solidFuel',   fillColour: '#7d746b',  twh: 10,   paletteHex: '#7d736a' },
];

const FILL_TO_CARRIER = Object.fromEntries(
  CARRIERS.filter((c) => c.fillColour).map((c) => [
    c.fillColour.toLowerCase(),
    c.carrierKey,
  ]),
);

// ─── Sector data — print-authoritative ──────────────────────────
// All 69 entries pulled from the print PDF
// (004-version2_014ffb7f.pdf), sorted by twh descending within
// each carrier. Verified per-carrier sums + total = 1,542 TWh.
const PRINT_SECTORS = {
  petroleum: [
    { label: 'Road transport',         twh: 411   },
    { label: 'Aviation',               twh: 153.9 },
    { label: 'Non-energy use',         twh: 52.7  },
    { label: 'Domestic',               twh: 27.2  },
    { label: 'Light industry',         twh: 20.5  },
    { label: 'Commercial',             twh: 19.9  },
    { label: 'Agriculture',            twh: 10.3  },
    { label: 'National navigation',    twh: 9.3   },
    { label: 'Public administration',  twh: 9.0   },
    { label: 'Rail',                   twh: 6.2   },
    { label: 'Miscellaneous',          twh: 5.0   },
    { label: 'Food & beverages',       twh: 1.6   },
    { label: 'Mineral products',       twh: 1.1   },
    { label: 'Chemicals',              twh: 0.9   },
    { label: 'Paper & printing',       twh: 0.3   },
    { label: 'Iron & steel',           twh: 0.2   },
  ],
  naturalGas: [
    { label: 'Domestic',               twh: 253   },
    { label: 'Commercial',             twh: 44.3  },
    { label: 'Public administration',  twh: 36.2  },
    { label: 'Light industry',         twh: 31.6  },
    { label: 'Food & beverages',       twh: 19.7  },
    { label: 'Mineral products',       twh: 12.9  },
    { label: 'Chemicals',              twh: 12.3  },
    { label: 'Miscellaneous',          twh: 10.7  },
    { label: 'Iron & steel',           twh: 5.5   },
    { label: 'Paper & printing',       twh: 3.1   },
    { label: 'Road transport',         twh: 1.8   },
    { label: 'Agriculture',            twh: 0.8   },
  ],
  electricity: [
    { label: 'Domestic',               twh: 94.4  },
    { label: 'Commercial',             twh: 62.4  },
    { label: 'Light industry',         twh: 40.7  },
    { label: 'Public administration',  twh: 15.5  },
    { label: 'Chemicals',              twh: 14.7  },
    { label: 'Food & beverages',       twh: 10.4  },
    { label: 'Paper & printing',       twh: 9.5   },
    { label: 'Road transport',         twh: 8.9   },
    { label: 'Mineral products',       twh: 5.1   },
    { label: 'Rail',                   twh: 5.0   },
    { label: 'Agriculture',            twh: 3.9   },
    { label: 'Iron & steel',           twh: 1.9   },
  ],
  bioenergy: [
    { label: 'Road transport',         twh: 28.7  },
    { label: 'Domestic',               twh: 15.7  },
    { label: 'Commercial',             twh: 14.9  },
    { label: 'Light industry',         twh: 9.8   },
    { label: 'Paper & printing',       twh: 4.5   },
    { label: 'Mineral products',       twh: 4.3   },
    { label: 'Aviation',               twh: 3.2   },
    { label: 'Agriculture',            twh: 1.6   },
    { label: 'Chemicals',              twh: 1.1   },
    { label: 'Food & beverages',       twh: 0.8   },
    { label: 'Public administration',  twh: 0.7   },
    { label: 'Miscellaneous',          twh: 0.1   },
  ],
  heat: [
    { label: 'Light industry',         twh: 4.9   },
    { label: 'Domestic',               twh: 3.2   },
    { label: 'Commercial',             twh: 2.6   },
    { label: 'Chemicals',              twh: 1.7   },
    { label: 'Public administration',  twh: 0.9   },
    { label: 'Agriculture',            twh: 0.3   },
    { label: 'Paper & printing',       twh: 0.3   },
    { label: 'Food & beverages',       twh: 0.2   },
  ],
  solidFuel: [
    { label: 'Mineral products',       twh: 3.0   },
    { label: 'Iron & steel',           twh: 2.3   },
    { label: 'Domestic',               twh: 2.0   },
    { label: 'Light industry',         twh: 1.5   },
    { label: 'Chemicals',              twh: 0.4   },
    { label: 'Food & beverages',       twh: 0.3   },
    { label: 'Miscellaneous',          twh: 0.1   },
    { label: 'Non-energy use',         twh: 0.1   },
    { label: 'Rail',                   twh: 0.1   },
  ],
};

// Endpoint-matching tolerance (SVG units). The print's coordinates
// are quantised to ~0.01; 2 px is generous and absorbs any
// rounding drift from the parseD flattener.
const ENDPOINT_EPSILON = 2.0;

// Sector-label matching: for each label, take its CLOSEST glyph
// anchor (the M coordinate of any of its character paths) and the
// distance from that point to the SECTOR DOT'S EDGE. Match if
// edge-distance < SECTOR_LABEL_EDGE_MAX. Bipartite assignment via
// greedy descent — closest-distance label/dot pairs claim first.
// Carrier-name labels and the hub label are NOT in the SVG (the
// 69 top-level isolate groups are all 69 sector labels); the
// component renders carrier and hub text directly.
const SECTOR_LABEL_EDGE_MAX = 60;

// ─── parseD — same flattener as client/src/lib/parseSvg.ts ───────
// Inline copy to avoid pulling tsx into the script. Keep in sync
// with parseSvg.ts if its flattening behaviour ever changes.

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
    const b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
    out.push(
      b0 * x0 + b1 * x1 + b2 * x2 + b3 * x3,
      b0 * y0 + b1 * y1 + b2 * y2 + b3 * y3,
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
      const cc1x = cx + (2 / 3) * (c1x - cx);
      const cc1y = cy + (2 / 3) * (c1y - cy);
      const cc2x = x + (2 / 3) * (c1x - x);
      const cc2y = y + (2 / 3) * (c1y - y);
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
    } else {
      i++;
    }
  }
  return pts;
}

// ─── Geometry helpers ────────────────────────────────────────────

function bboxOfFlatPoints(allFlat) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
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

function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

function within(eps, ax, ay, bx, by) {
  return dist2(ax, ay, bx, by) <= eps * eps;
}

// ─── SVG group + element extractors ──────────────────────────────

function extractGroup(svgText, groupId) {
  // Match <g id="groupId" ...>...</g>. The SVG has at most one group
  // per id; non-greedy capture between matching tags is fragile if
  // groups nest, so we lean on the fact that form-* and #links are
  // top-level groups whose closing </g> is on a line by itself.
  const re = new RegExp(
    `<g\\s+id="${groupId}"[^>]*>([\\s\\S]*?)\\n  </g>`,
    'm',
  );
  const match = re.exec(svgText);
  if (!match) return null;
  return match[1];
}

function extractPathDs(inner) {
  const pathRe = /<path[^>]*\sd="([^"]+)"[^>]*\/?>/g;
  const ds = [];
  let pm;
  while ((pm = pathRe.exec(inner)) !== null) {
    ds.push(pm[1]);
  }
  return ds;
}

// ─── Label group extractor ───────────────────────────────────────
// Labels are top-level <g isolation="isolate"> blocks (depth 2 when
// counting from <svg> at depth 1). Each contains one outlined word
// or value as many glyph <path> children, possibly nested in a
// further inner <g isolation="isolate"> wrapper. We match the OUTER
// group only and pull every <path d="..."> beneath it regardless
// of nesting depth.

function findTopLevelIsolateGroups(svgText) {
  // Scan once, tracking nesting depth via <g.../> openings and
  // </g> closings (also handle self-closing <g.../>). Capture
  // [openTagEnd, closeTagStart] for every top-level
  // <g ... isolation="isolate" ...> at depth 2.
  const tokenRe = /<svg[^>]*>|<g(?:\s[^>]*)?\s*\/?>|<\/g>/g;
  const out = [];
  let depth = 0;
  let pending = null;
  let m;
  while ((m = tokenRe.exec(svgText)) !== null) {
    const tag = m[0];
    if (tag.startsWith('<svg')) {
      depth = 1;
      continue;
    }
    if (tag === '</g>') {
      depth--;
      if (pending && depth === 1) {
        pending.innerEnd = m.index;
        out.push(pending);
        pending = null;
      }
      continue;
    }
    // <g...> opener (could be self-closing).
    const selfClosing = tag.endsWith('/>');
    if (!selfClosing) {
      depth++;
      if (
        depth === 2 &&
        !pending &&
        tag.includes('isolation="isolate"')
      ) {
        pending = {
          openTag: tag,
          innerStart: m.index + tag.length,
        };
      }
    }
    // self-closing — depth unchanged
  }
  return out;
}

function extractLabels(svgText) {
  const groups = findTopLevelIsolateGroups(svgText);
  const pathDRe = /<path[^>]*\sd="([^"]+)"[^>]*\/?>/g;
  const labels = [];

  for (const g of groups) {
    const inner = svgText.slice(g.innerStart, g.innerEnd);
    const ds = [];
    let pm;
    while ((pm = pathDRe.exec(inner)) !== null) ds.push(pm[1]);
    if (ds.length === 0) continue;

    const flats = ds.map(parseD);
    const bbox = bboxOfFlatPoints(flats);
    const centroid = centroidOfBbox(bbox);

    // Each path's M-start gives its glyph position. Persist (d, x, y)
    // per glyph for the JSON.
    const glyphs = ds.map((d) => {
      const flat = parseD(d);
      return {
        d,
        x: flat[0] ?? 0,
        y: flat[1] ?? 0,
      };
    });

    // class attribute (if any)
    const classMatch = g.openTag.match(/\sclass="([^"]+)"/);
    const cls = classMatch ? classMatch[1] : null;

    // Anchor for proximity matching: the first glyph's M start.
    // This is where the label's first character begins, which the
    // print designer placed adjacent to the label's target.
    const anchor = glyphs.length > 0
      ? [glyphs[0].x, glyphs[0].y]
      : centroid;

    labels.push({
      glyphs,
      bbox,
      centroid,
      anchor,
      class: cls,
      openTag: g.openTag,
    });
  }

  return labels;
}

function extractCircles(svgText) {
  // Root-level <circle .../>. Captures id, cx, cy, r, fill.
  // Using (?:^|\s) before each attr so the FIRST attribute (which
  // sits flush against the consumed <circle\s+ prefix) still matches.
  const re = /<circle\s+([^/]*)\/>/g;
  const grab = (attrs, name) =>
    (attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]+)"`)) || [])[1];
  const out = [];
  let m;
  while ((m = re.exec(svgText)) !== null) {
    const attrs = m[1];
    const id   = grab(attrs, 'id') ?? null;
    const cx   = parseFloat(grab(attrs, 'cx'));
    const cy   = parseFloat(grab(attrs, 'cy'));
    const r    = parseFloat(grab(attrs, 'r'));
    const fill = (grab(attrs, 'fill') ?? '').toLowerCase();
    if (Number.isNaN(cx) || Number.isNaN(cy) || Number.isNaN(r)) continue;
    out.push({ id, cx, cy, r, fill });
  }
  return out;
}

// ─── Main extraction ─────────────────────────────────────────────

const svgText = readFileSync(INPUT_PATH, 'utf8');

// 1. Forms — paths and BBox centroid per carrier (and the hub).
const forms = {};
for (const c of CARRIERS) {
  const inner = extractGroup(svgText, c.formId);
  if (!inner) {
    console.warn(`Form group "${c.formId}" not found — skipping ${c.carrierKey}`);
    continue;
  }
  const ds = extractPathDs(inner);
  if (ds.length === 0) {
    console.warn(`Form group "${c.formId}" had no <path> elements`);
    continue;
  }
  const flats = ds.map(parseD);
  const bbox = bboxOfFlatPoints(flats);
  const centroid = centroidOfBbox(bbox);
  forms[c.carrierKey] = {
    form_paths: ds,
    centroid,
    ...(c.carrierKey === 'total'
      ? { twh: c.twh }
      : { twh: c.twh, colour: c.paletteHex }),
  };
  console.log(
    `${c.carrierKey.padEnd(11)} ${ds.length} paths, ` +
    `bbox ${Math.round(bbox.maxX - bbox.minX)}×${Math.round(bbox.maxY - bbox.minY)}, ` +
    `centroid (${centroid[0].toFixed(2)}, ${centroid[1].toFixed(2)})`,
  );
}

// 2. Sector circles, attributed by fill colour.
const allCircles = extractCircles(svgText);
console.log(`\n${allCircles.length} sector circles found`);

const circlesByCarrier = {};
for (const carrier of Object.keys(PRINT_SECTORS)) circlesByCarrier[carrier] = [];

for (const circle of allCircles) {
  const carrier = FILL_TO_CARRIER[circle.fill];
  if (!carrier) {
    console.warn(`Circle ${circle.id} has unmapped fill ${circle.fill} — skipping`);
    continue;
  }
  circlesByCarrier[carrier].push(circle);
}

// Sort each carrier's circles by r descending so we can zip with
// PRINT_SECTORS (already sorted by twh descending above).
for (const carrier of Object.keys(circlesByCarrier)) {
  circlesByCarrier[carrier].sort((a, b) => b.r - a.r);
}

// 3. Pair sectors. Warn on count mismatch; synthesise a placeholder
//    label for any unmatched circle so the JSON is complete.
const sectors = [];
const unmatchedCircles = []; // tracked for the --verify overlay
let unmatchedCounter = 0;
for (const [carrier, secList] of Object.entries(PRINT_SECTORS)) {
  const circles = circlesByCarrier[carrier];
  if (!circles) {
    console.warn(`Carrier "${carrier}" has no circles in the SVG`);
    continue;
  }
  const n = Math.max(circles.length, secList.length);
  if (circles.length !== secList.length) {
    console.warn(
      `Carrier "${carrier}": ${circles.length} circles in SVG, ` +
      `${secList.length} sectors in v2 data — mismatch ${circles.length - secList.length}`,
    );
  }
  for (let i = 0; i < n; i++) {
    const circle = circles[i];
    const sec    = secList[i];
    if (!circle) {
      console.warn(`  print sector "${carrier} / ${sec.label}" has no matching circle`);
      continue;
    }
    if (!sec) {
      unmatchedCounter++;
      const verifyId = `?${unmatchedCounter}`;
      unmatchedCircles.push({ ...circle, carrier, verifyId });
      sectors.push({
        id:        circle.id ?? `${carrier}-unmatched-${i}`,
        carrier,
        cx:        circle.cx,
        cy:        circle.cy,
        r:         circle.r,
        twh:       null,
        label:     `Unmatched (${carrier} #${i})`,
        verifyId,
      });
      continue;
    }
    sectors.push({
      id:    circle.id ?? `${carrier}-${i}`,
      carrier,
      cx:    circle.cx,
      cy:    circle.cy,
      r:     circle.r,
      twh:   sec.twh,
      label: sec.label,
    });
  }
}

// 4. Connector links. Classified by END matching, not START matching:
//    - If a connector's end matches a sector circle, it's a
//      carrier→sector for that sector's carrier. The connector's
//      start gives us the carrier's anchor coordinate (which is
//      not necessarily the form's BBox centroid — the print places
//      the connector anchor inside the blob but offset from the
//      geometric centre for at least one carrier).
//    - Once each carrier's anchor is known, hub→carrier connectors
//      are those starting at the hub centroid and ending at one of
//      those anchors.
const linksInner = extractGroup(svgText, 'links');
if (!linksInner) {
  console.error('FATAL: <g id="links"> not found in SVG');
  process.exit(1);
}
const linkDs = extractPathDs(linksInner);
console.log(`\n${linkDs.length} connector paths in <g id="links">`);

const hubCentroid = forms.total?.centroid;
if (!hubCentroid) {
  console.error('FATAL: hub centroid not available; cannot classify links');
  process.exit(1);
}

// Pass 1: classify carrier→sector by end-matching to sector circles.
// Record the start coords as anchor candidates per carrier.
const carrier_to_sector = [];
const anchorCandidates = {};
const remaining = [];

for (const d of linkDs) {
  const flat = parseD(d);
  if (flat.length < 4) {
    remaining.push({ d, flat });
    continue;
  }
  const sx = flat[0], sy = flat[1];
  const ex = flat[flat.length - 2], ey = flat[flat.length - 1];

  const sector = sectors.find((s) => within(ENDPOINT_EPSILON, ex, ey, s.cx, s.cy));
  if (sector) {
    carrier_to_sector.push({ carrier: sector.carrier, sectorId: sector.id, d });
    (anchorCandidates[sector.carrier] ??= []).push([sx, sy]);
  } else {
    remaining.push({ d, flat, sx, sy, ex, ey });
  }
}

// Pass 2: for each carrier with anchor candidates, take their mean
// (they should all be identical to within float precision; mean
// is just defensive).
const anchorByCarrier = {};
for (const [carrier, list] of Object.entries(anchorCandidates)) {
  let mx = 0, my = 0;
  for (const [x, y] of list) { mx += x; my += y; }
  anchorByCarrier[carrier] = [mx / list.length, my / list.length];
}
console.log('\nAnchors per carrier:');
for (const [c, a] of Object.entries(anchorByCarrier)) {
  const formC = forms[c]?.centroid;
  const offset = formC
    ? `, BBox-offset (${(a[0] - formC[0]).toFixed(2)}, ${(a[1] - formC[1]).toFixed(2)})`
    : '';
  console.log(`  ${c.padEnd(11)} (${a[0].toFixed(2)}, ${a[1].toFixed(2)})${offset}`);
}

// Pass 3: classify remaining connectors as hub→carrier by start at
// hub centroid and end at one of the carrier anchors.
const hub_to_carrier = [];
const unclassifiedLinks = [];

for (const r of remaining) {
  const { d, sx, sy, ex, ey } = r;
  if (sx === undefined) {
    unclassifiedLinks.push(r);
    continue;
  }
  if (within(ENDPOINT_EPSILON, sx, sy, hubCentroid[0], hubCentroid[1])) {
    const matched = Object.entries(anchorByCarrier).find(([, a]) =>
      within(ENDPOINT_EPSILON, ex, ey, a[0], a[1]),
    );
    if (matched) {
      hub_to_carrier.push({ carrier: matched[0], d });
      continue;
    }
  }
  unclassifiedLinks.push({ d, sx, sy, ex, ey });
}

if (unclassifiedLinks.length > 0) {
  console.warn(`\n${unclassifiedLinks.length} connector(s) failed classification:`);
  for (const u of unclassifiedLinks.slice(0, 5)) {
    console.warn(
      `  start=(${u.sx?.toFixed(1)}, ${u.sy?.toFixed(1)}) ` +
      `end=(${u.ex?.toFixed(1)}, ${u.ey?.toFixed(1)})`,
    );
  }
  if (unclassifiedLinks.length > 5) {
    console.warn(`  ... and ${unclassifiedLinks.length - 5} more`);
  }
  console.warn('Inspect manually — likely a centroid / anchor mismatch.');
}

console.log(
  `\nClassified: ${hub_to_carrier.length} hub→carrier, ` +
  `${carrier_to_sector.length} carrier→sector, ` +
  `${unclassifiedLinks.length} unclassified`,
);

// Persist anchors on the carrier records — the canvas component
// needs them as the pulse origin / dim-mask anchor (NOT the BBox
// centroid, which differs).
for (const [carrier, anchor] of Object.entries(anchorByCarrier)) {
  if (forms[carrier]) forms[carrier].anchor = anchor;
}

// 5. Labels — pulled from root-level <g isolation="isolate"> blocks
//    and matched to sector dots by greedy bipartite assignment over
//    label-glyph-to-dot-edge distance.
const allLabels = extractLabels(svgText);
console.log(`\n${allLabels.length} top-level label groups found`);

// Drop annotation-class labels (the methodology callouts).
const diagramLabels = allLabels.filter((l) => l.class !== 'annotation');
console.log(`  ${allLabels.length - diagramLabels.length} dropped (annotation class)`);

// Compute min-glyph-to-dot-edge distance for every (label, dot) pair.
// Build a list of candidate pairs sorted by distance ascending, then
// greedy-assign — closest pairs win first.
const candidates = [];
for (let li = 0; li < diagramLabels.length; li++) {
  const label = diagramLabels[li];
  for (let si = 0; si < sectors.length; si++) {
    const dot = sectors[si];
    let minEdgeDist = Infinity;
    for (const g of label.glyphs) {
      const d = Math.hypot(g.x - dot.cx, g.y - dot.cy) - dot.r;
      if (d < minEdgeDist) minEdgeDist = d;
    }
    if (minEdgeDist <= SECTOR_LABEL_EDGE_MAX) {
      candidates.push({ li, si, dist: minEdgeDist });
    }
  }
}
candidates.sort((a, b) => a.dist - b.dist);

const labelsByRegion = {
  hub: [],     // populated by the React component, not the SVG extractor
  carriers: { petroleum: [], naturalGas: [], electricity: [], bioenergy: [], heat: [], solidFuel: [] },
  sectors: {},
};
const labelClaimed = new Array(diagramLabels.length).fill(false);
const sectorClaimed = new Array(sectors.length).fill(false);
let assigned = 0;

for (const c of candidates) {
  if (labelClaimed[c.li] || sectorClaimed[c.si]) continue;
  labelClaimed[c.li] = true;
  sectorClaimed[c.si] = true;
  const label = diagramLabels[c.li];
  const dot = sectors[c.si];
  labelsByRegion.sectors[dot.id] = label.glyphs;
  assigned++;
}

console.log(
  `  matched ${assigned} of ${diagramLabels.length} labels to ${sectors.length} sectors ` +
  `(threshold ${SECTOR_LABEL_EDGE_MAX} px from dot edge)`,
);
if (assigned < sectors.length) {
  const missing = sectors.filter((_, i) => !sectorClaimed[i]);
  console.warn(
    `  ${missing.length} sector(s) have no matched label:`,
    missing.slice(0, 6).map((s) => `${s.carrier}/${s.label}`).join(', '),
    missing.length > 6 ? `... and ${missing.length - 6} more` : '',
  );
}
const unclaimedLabels = labelClaimed.filter((c) => !c).length;
if (unclaimedLabels > 0) {
  console.warn(`  ${unclaimedLabels} label(s) didn't match any sector — likely chrome / page text`);
}

// 6. Assemble + write.
const result = {
  ...forms,
  links: { hub_to_carrier, carrier_to_sector },
  sectors,
  labels: labelsByRegion,
};

function kebabCase(camel) {
  return camel.replace(/([A-Z])/g, '-$1').toLowerCase();
}

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
console.log(
  `\nWrote ${OUTPUT_PATH}\n` +
  `  ${Object.keys(forms).length} forms, ` +
  `${sectors.length} sectors, ` +
  `${hub_to_carrier.length + carrier_to_sector.length} links`,
);

// ─────────────────────────────────────────────────────────────────
// --verify mode
// ─────────────────────────────────────────────────────────────────

if (process.argv.includes('--verify')) {
  const VERIFY_PATH = '/tmp/p004-verify.svg';
  const VIEWBOX = '0 0 1967.58 1674.75';

  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" ` +
    `style="background:#ece7df;font-family:Georgia,serif">`,
  );

  // Title strip top-left.
  lines.push(
    `<text x="20" y="36" font-size="22" fill="#0d1a1e">` +
    `poster 004 extract — verify (` +
    `forms ${Object.keys(forms).length}, ` +
    `sectors ${sectors.length}, ` +
    `unmatched ${unmatchedCircles.length}, ` +
    `links ${hub_to_carrier.length + carrier_to_sector.length}` +
    `)</text>`,
  );

  // Connectors — faint grey, low stroke width. Both kinds together.
  lines.push(`<g id="links" stroke="#0d1a1e" stroke-opacity="0.18" stroke-width="0.4" fill="none">`);
  for (const l of hub_to_carrier) lines.push(`  <path d="${l.d}" />`);
  for (const l of carrier_to_sector) lines.push(`  <path d="${l.d}" />`);
  lines.push(`</g>`);

  // All sector circles in their carrier colour at low opacity for context.
  lines.push(`<g id="sectors-context">`);
  for (const s of sectors) {
    const carrier = CARRIERS.find((c) => c.carrierKey === s.carrier);
    const fill = carrier?.fillColour ?? '#888';
    lines.push(
      `  <circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ` +
      `fill="${fill}" fill-opacity="0.45" stroke="#0d1a1e" stroke-width="0.25" />`,
    );
  }
  lines.push(`</g>`);

  // Form BBoxes — thin red rectangles.
  lines.push(`<g id="form-bboxes" fill="none" stroke="#a51e22" stroke-width="0.8">`);
  for (const c of CARRIERS) {
    const f = forms[c.carrierKey];
    if (!f) continue;
    // Recompute bbox so we can draw it (we didn't persist it on the form).
    const flats = f.form_paths.map(parseD);
    const b = bboxOfFlatPoints(flats);
    lines.push(
      `  <rect x="${b.minX}" y="${b.minY}" ` +
      `width="${b.maxX - b.minX}" height="${b.maxY - b.minY}" />`,
    );
    lines.push(
      `  <text x="${b.minX}" y="${b.minY - 4}" font-size="11" fill="#a51e22" stroke="none">${c.carrierKey}</text>`,
    );
  }
  lines.push(`</g>`);

  // BBox centroids — green dots.
  lines.push(`<g id="bbox-centroids">`);
  for (const c of CARRIERS) {
    const f = forms[c.carrierKey];
    if (!f) continue;
    lines.push(
      `  <circle cx="${f.centroid[0]}" cy="${f.centroid[1]}" r="3.5" ` +
      `fill="#217b3d" stroke="#0d1a1e" stroke-width="0.25" />`,
    );
  }
  lines.push(`</g>`);

  // Connector anchors — blue dots. Only the six carriers; the hub
  // anchor and centroid coincide.
  lines.push(`<g id="anchors">`);
  for (const c of CARRIERS) {
    const f = forms[c.carrierKey];
    if (!f?.anchor) continue;
    lines.push(
      `  <circle cx="${f.anchor[0]}" cy="${f.anchor[1]}" r="3.5" ` +
      `fill="#1c3867" stroke="#0d1a1e" stroke-width="0.25" />`,
    );
  }
  lines.push(`</g>`);

  // Labels — render as faint filled paths so we can see where each
  // matched label landed. Hub labels in green, carrier labels in
  // blue, sector labels in their carrier colour.
  lines.push(`<g id="labels-rendered" pointer-events="none" fill-opacity="0.6">`);
  for (const g of labelsByRegion.hub) {
    lines.push(`  <path d="${g.d}" fill="#217b3d" />`);
  }
  for (const [carrierKey, glyphs] of Object.entries(labelsByRegion.carriers)) {
    for (const g of glyphs) {
      lines.push(`  <path d="${g.d}" fill="#1c3867" />`);
    }
  }
  for (const [sectorId, glyphs] of Object.entries(labelsByRegion.sectors)) {
    const sec = sectors.find((s) => s.id === sectorId);
    const carrier = sec?.carrier ?? 'petroleum';
    const fill = CARRIERS.find((c) => c.carrierKey === carrier)?.fillColour ?? '#0d1a1e';
    for (const g of glyphs) {
      lines.push(`  <path d="${g.d}" fill="${fill}" />`);
    }
  }
  lines.push(`</g>`);

  // Unmatched circles — distinct orange stroke at 3× width plus
  // numeric label ?1..?N. THIS is the focus of the spot-check.
  lines.push(`<g id="unmatched">`);
  for (const u of unmatchedCircles) {
    lines.push(
      `  <circle cx="${u.cx}" cy="${u.cy}" r="${u.r * 1.4 + 4}" ` +
      `fill="none" stroke="#ef6b1a" stroke-width="2.2" />`,
    );
    lines.push(
      `  <text x="${u.cx + u.r + 8}" y="${u.cy + 5}" ` +
      `font-size="18" font-weight="700" fill="#ef6b1a" stroke="#ece7df" stroke-width="3" paint-order="stroke">` +
      `${u.verifyId} ${u.carrier}</text>`,
    );
  }
  lines.push(`</g>`);

  // Legend bottom-left.
  lines.push(
    `<g id="legend" font-size="13" fill="#0d1a1e">` +
    `<text x="20" y="1620">` +
    `<tspan fill="#a51e22">▭ form bbox</tspan>  ` +
    `<tspan fill="#217b3d">●  bbox centroid</tspan>  ` +
    `<tspan fill="#1c3867">●  connector anchor</tspan>  ` +
    `<tspan fill="#ef6b1a">○ unmatched circle (?N)</tspan>` +
    `</text>` +
    `<text x="20" y="1644" font-size="11" fill="#0d1a1e" opacity="0.7">` +
    `Sector circles drawn in carrier colour at 45% opacity for spatial context.` +
    `</text>` +
    `</g>`,
  );

  lines.push(`</svg>`);
  writeFileSync(VERIFY_PATH, lines.join('\n'));
  console.log(`\nVerify SVG → ${VERIFY_PATH}`);
  console.log(`  ${unmatchedCircles.length} unmatched circle(s) highlighted in orange:`);
  for (const u of unmatchedCircles) {
    console.log(
      `    ${u.verifyId.padEnd(3)} ${u.carrier.padEnd(11)} ` +
      `cx=${u.cx.toFixed(1)} cy=${u.cy.toFixed(1)} r=${u.r.toFixed(2)} ` +
      `id=${u.id}`,
    );
  }
}
