#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// extract-poster-003-forms.mjs
//
// Walks the S1 deaths SVG (003-S1-deaths_*.svg) and the S3 deaths
// SVG, extracts the per-source form groups (paths + polylines), and
// writes client/src/assets/poster-003-forms.json with one entry per
// SourceId.
//
// Per-source extraction rule:
//   gas, oil, bioenergy, coal, hydro, wind, solar ← S1 (their max)
//   nuclear                                       ← S3 (its max)
//
// This matches the canvas-blob layer's currentScale formula
// `currentDeaths / MAX_DEATHS_FOR_SOURCE`, so the extracted form is
// drawn at scale=1 when the source is at its scenario maximum.
//
// Source-to-form mapping:
//   The SVG groups have no machine-readable labels (text labels are
//   rendered as paths). We map by ranking form-groups by bbox area
//   descending and pairing with sources ranked by deaths descending.
//   The script prints each (rank, area, bbox, sourceId) line so a
//   human can spot-check the result.
//
// Usage:
//   node scripts/extract-poster-003-forms.mjs
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot  = resolve(__dirname, '..');

const S1_PATH = resolve(repoRoot, 'client/public/assets/003-S1-deaths_7acb96e4.svg');
const S3_PATH = resolve(repoRoot, 'client/public/assets/003-S3-deaths_e4d7bcd5.svg');
const OUT     = resolve(repoRoot, 'client/src/assets/poster-003-forms.json');

// Sources in declaration order (matches SourceId in poster003Data.ts).
const SOURCE_IDS = ['gas', 'oil', 'bioenergy', 'coal', 'hydro', 'wind', 'nuclear', 'solar'];

// Per-source max-deaths value, copied verbatim from poster003Data.ts
// SCENARIOS. Used to seal `deaths` into each form entry.
const MAX_DEATHS = {
  gas:       243,
  oil:       211,
  bioenergy: 186,
  coal:       47,
  hydro:       8,
  wind:        3,
  nuclear:     6,
  solar:     0.3,
};

// ─── Inline parseD (kept in sync with client/src/lib/parseSvg.ts) ──

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

// ─── Group walker ────────────────────────────────────────────────

function walkGroups(svg) {
  const tokens = [];
  const re = /<g[^>]*>|<\/g>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    tokens.push({ kind: m[0].startsWith('</g') ? 'close' : 'open', pos: m.index, len: m[0].length });
  }
  const stack = [];
  const groups = [];
  for (const tk of tokens) {
    if (tk.kind === 'open') {
      stack.push({ start: tk.pos + tk.len, depth: stack.length });
    } else {
      const top = stack.pop();
      groups.push({ depth: top.depth, start: top.start, end: tk.pos, text: svg.slice(top.start, tk.pos) });
    }
  }
  return groups;
}

// Extract every `<path d="...">` and `<polyline points="...">` from
// a group's inner text. Polylines are converted to a d-string of
// MoveTo + LineTo so the consumer can use buildPolylines() unchanged.
function extractDStrings(text) {
  const out = [];
  const pathRe = /<path[^>]*\sd="([^"]+)"/g;
  let m;
  while ((m = pathRe.exec(text)) !== null) {
    out.push(m[1]);
  }
  const polyRe = /<polyline[^>]*\spoints="([^"]+)"/g;
  while ((m = polyRe.exec(text)) !== null) {
    const pts = m[1].trim().split(/\s+/);
    if (pts.length < 4) continue;
    let d = `M ${pts[0]} ${pts[1]}`;
    for (let i = 2; i < pts.length; i += 2) {
      d += ` L ${pts[i]} ${pts[i + 1]}`;
    }
    out.push(d);
  }
  return out;
}

function bboxOfDStrings(ds) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const d of ds) {
    const flat = parseD(d);
    for (let k = 0; k < flat.length; k += 2) {
      const x = flat[k], y = flat[k + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return isFinite(minX)
    ? { minX, minY, maxX, maxY }
    : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
}

// ─── Form-group selection ────────────────────────────────────────
//
// A "form group" is a <g> whose text contains many <path>/<polyline>
// elements with `fill="none"` (organic blobs). Text-label groups
// have <path> elements with a coloured fill. We use a count
// threshold to discriminate.

const FORM_ELEMENT_THRESHOLD = 40;

function findFormGroups(groups) {
  return groups.filter((g) => {
    const fillNone = (g.text.match(/fill="none"/g) || []).length;
    return fillNone >= FORM_ELEMENT_THRESHOLD;
  });
}

// Of the form-group results, the smallest non-overlapping set we
// want is: the leaf groups (no form sub-groups inside them). The
// wrapper group at the top of S1's tree contains 7 leaf form-groups
// — keep only the leaves.
function leafFormGroups(formGroups) {
  return formGroups.filter((g) => {
    const hasSubg = formGroups.some(
      (other) => other !== g && other.start > g.start && other.end < g.end,
    );
    return !hasSubg;
  });
}

// ─── Main ────────────────────────────────────────────────────────

const s1 = readFileSync(S1_PATH, 'utf8');
const s3 = readFileSync(S3_PATH, 'utf8');

const s1Forms = leafFormGroups(findFormGroups(walkGroups(s1)));
const s3Forms = leafFormGroups(findFormGroups(walkGroups(s3)));

console.log(`S1 leaf form-groups: ${s1Forms.length} (expected 8: 7 non-nuclear + nuclear)`);
console.log(`S3 leaf form-groups: ${s3Forms.length} (expected 3: nuclear + wind + solar)`);

// In S1, the nuclear form is the one whose paths include a yellow
// stroke (`#b4822e`). Pull it aside; the remaining 7 are mapped to
// non-nuclear sources by bbox-area rank.
function isNuclearGroup(g) {
  return /stroke="#b4822e"/i.test(g.text);
}

const s1Nuclear = s1Forms.find(isNuclearGroup);
const s1NonNuclear = s1Forms.filter((g) => !isNuclearGroup(g));

if (!s1Nuclear) {
  console.warn('Warning: no nuclear group found in S1 (this is OK — we use S3 for nuclear).');
}
if (s1NonNuclear.length !== 7) {
  console.error(`Error: expected 7 non-nuclear S1 form-groups, found ${s1NonNuclear.length}.`);
  console.error('Listing all S1 form-groups for manual inspection:');
  s1Forms.forEach((g, i) => {
    const ds = extractDStrings(g.text);
    const bb = bboxOfDStrings(ds);
    console.error(`  #${i + 1} elements=${ds.length} bbox=[${bb.minX.toFixed(1)},${bb.minY.toFixed(1)},${bb.maxX.toFixed(1)},${bb.maxY.toFixed(1)}] yellow=${isNuclearGroup(g) ? 'YES' : 'no'}`);
  });
  process.exit(1);
}

const s3NuclearCandidates = s3Forms.filter(isNuclearGroup);
if (s3NuclearCandidates.length !== 1) {
  console.error(`Error: expected exactly 1 nuclear group in S3, found ${s3NuclearCandidates.length}`);
  process.exit(1);
}
const s3Nuclear = s3NuclearCandidates[0];

// Compute bbox + ds for each non-nuclear S1 group.
const s1Entries = s1NonNuclear.map((g) => {
  const paths = extractDStrings(g.text);
  const bbox = bboxOfDStrings(paths);
  const area = (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY);
  return { g, paths, bbox, area };
});

// Rank by bbox area descending.
s1Entries.sort((a, b) => b.area - a.area);

// Sources ranked by deaths descending, excluding nuclear.
const NON_NUCLEAR_BY_DEATHS = ['gas', 'oil', 'bioenergy', 'coal', 'hydro', 'wind', 'solar'];

console.log('\nS1 non-nuclear form-groups, ranked by bbox area:');
const result = {};
for (let i = 0; i < s1Entries.length; i++) {
  const e = s1Entries[i];
  const sourceId = NON_NUCLEAR_BY_DEATHS[i];
  const cx = (e.bbox.minX + e.bbox.maxX) / 2;
  const cy = (e.bbox.minY + e.bbox.maxY) / 2;
  console.log(
    `  #${i + 1}  ${sourceId.padEnd(10)} area=${Math.round(e.area).toString().padStart(7)} ` +
    `bbox=[${e.bbox.minX.toFixed(1)}, ${e.bbox.minY.toFixed(1)}, ${e.bbox.maxX.toFixed(1)}, ${e.bbox.maxY.toFixed(1)}] ` +
    `centroid=[${cx.toFixed(1)}, ${cy.toFixed(1)}]  paths=${e.paths.length}`,
  );
  result[sourceId] = {
    paths: e.paths,
    bbox: e.bbox,
    centroid: [cx, cy],
    deaths: MAX_DEATHS[sourceId],
  };
}

// Nuclear: from S3.
{
  const paths = extractDStrings(s3Nuclear.text);
  const bbox = bboxOfDStrings(paths);
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  console.log(
    `\nNuclear (from S3): ` +
    `bbox=[${bbox.minX.toFixed(1)}, ${bbox.minY.toFixed(1)}, ${bbox.maxX.toFixed(1)}, ${bbox.maxY.toFixed(1)}] ` +
    `centroid=[${cx.toFixed(1)}, ${cy.toFixed(1)}]  paths=${paths.length}`,
  );
  result.nuclear = {
    paths,
    bbox,
    centroid: [cx, cy],
    deaths: MAX_DEATHS.nuclear,
  };
}

// Reorder result keys to match SOURCE_IDS declaration order.
const ordered = {};
for (const id of SOURCE_IDS) {
  if (id in result) ordered[id] = result[id];
  else console.warn(`Warning: missing ${id}`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(ordered, null, 2));
console.log(`\nWrote ${OUT} with ${Object.keys(ordered).length} sources.`);
