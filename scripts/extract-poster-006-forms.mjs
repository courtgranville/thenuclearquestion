#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// extract-poster-006-forms.mjs
//
// Walks the four poster-006 SVGs and writes
// client/src/assets/poster-006-forms.json with one entry per
// section. Group selection is by ID (the SVGs are already
// processed with semantic IDs that match vizConfigs.ts).
//
// Output sections:
//   wasteCategories — vllw, llw, ilw, hlw  (organic blob forms)
//   producers       — total, sellafield, magnox, others, agr,
//                     dounreay, defence, hinkley  (one circle each)
//   doses           — reactor, dental, chest, llw_drum, flight,
//                     ilw, hlw, background, ct  (centre dot + lines)
//   storage         — landfill, vaults, treatment, gdf  (icon paths)
//
// Usage:
//   node scripts/extract-poster-006-forms.mjs
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot  = resolve(__dirname, '..');

const QUANTITIES = resolve(repoRoot, 'client/public/assets/006-waste-quantities-v4_5eb3cae5.svg');
const LOCATIONS  = resolve(repoRoot, 'client/public/assets/006-waste-locations-processed_6ed9ecfd.svg');
const DOSES      = resolve(repoRoot, 'client/public/assets/006-radiation-doses-processed_372c6bea.svg');
const STORAGE    = resolve(repoRoot, 'client/public/assets/006-waste-storage-processed_b5825c08.svg');
const OUT        = resolve(repoRoot, 'client/src/assets/poster-006-forms.json');

// ─── Volume / radioactivity figures, matched to vizConfigs.ts ────

const WASTE_VALUES = {
  vllw: { volume: 2610000, volumePct: 58.6,  radioactivityPct: 0.0005 },
  llw:  { volume: 1340000, volumePct: 30.2,  radioactivityPct: 0.0005 },
  ilw:  { volume:  496000, volumePct: 11.1,  radioactivityPct: 4.4    },
  hlw:  { volume:    1470, volumePct:  0.033, radioactivityPct: 95.6  },
};

const PRODUCER_VALUES = {
  total:      { volume: 4580000, sharePct: 100   },
  sellafield: { volume: 3320000, sharePct: 72.4  },
  magnox:     { volume:  563000, sharePct: 12.3  },
  others:     { volume:  370000, sharePct:  8.1  },
  agr:        { volume:  156000, sharePct:  3.4  },
  dounreay:   { volume:  114000, sharePct:  2.5  },
  defence:    { volume:   51900, sharePct:  1.1  },
  hinkley:    { volume:    9970, sharePct:  0.2  },
};

const DOSE_VALUES = {
  reactor:    0.003,
  dental:     0.005,
  chest:      0.02,
  llw_drum:   0.05,
  flight:     0.08,
  ilw:        2,
  hlw:        2,
  background: 2.7,
  ct:         10,
};

// ─── Group walker ────────────────────────────────────────────────

function walkGroups(svg) {
  const tokens = [];
  const re = /<g\b[^>]*\bid="([^"]+)"[^>]*>|<g\b(?![^>]*\bid=)[^>]*>|<\/g>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    if (m[0].startsWith('</g')) {
      tokens.push({ kind: 'close', pos: m.index, len: m[0].length });
    } else {
      tokens.push({ kind: 'open', id: m[1] || null, pos: m.index, len: m[0].length });
    }
  }
  const stack = [];
  const groups = [];
  for (const tk of tokens) {
    if (tk.kind === 'open') {
      stack.push({ id: tk.id, start: tk.pos + tk.len, depth: stack.length });
    } else {
      const top = stack.pop();
      if (top) groups.push({ id: top.id, depth: top.depth, start: top.start, end: tk.pos, text: svg.slice(top.start, tk.pos) });
    }
  }
  return groups;
}

function findGroupById(svg, id) {
  const all = walkGroups(svg).filter((g) => g.id === id);
  if (all.length === 0) return null;
  // Outermost (longest span) wins — protects against nested duplicate ids.
  all.sort((a, b) => (b.end - b.start) - (a.end - a.start));
  return all[0];
}

// ─── Element extractors ──────────────────────────────────────────

function extractDStrings(text) {
  const out = [];
  const pathRe = /<path[^>]*\sd="([^"]+)"/g;
  let m;
  while ((m = pathRe.exec(text)) !== null) out.push(m[1]);
  const polyRe = /<polyline[^>]*\spoints="([^"]+)"/g;
  while ((m = polyRe.exec(text)) !== null) {
    const pts = m[1].trim().split(/[\s,]+/);
    if (pts.length < 4) continue;
    let d = `M ${pts[0]} ${pts[1]}`;
    for (let i = 2; i < pts.length; i += 2) d += ` L ${pts[i]} ${pts[i + 1]}`;
    out.push(d);
  }
  return out;
}

function extractLines(text) {
  const out = [];
  const re = /<line\s[^>]*\bx1="([^"]+)"\s+y1="([^"]+)"\s+x2="([^"]+)"\s+y2="([^"]+)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ x1: parseFloat(m[1]), y1: parseFloat(m[2]), x2: parseFloat(m[3]), y2: parseFloat(m[4]) });
  }
  return out;
}

function extractCircles(text) {
  const out = [];
  const re = /<circle\s[^>]*\bcx="([^"]+)"\s+cy="([^"]+)"\s+r="([^"]+)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ cx: parseFloat(m[1]), cy: parseFloat(m[2]), r: parseFloat(m[3]) });
  }
  return out;
}

// Filter d-strings: keep only those that look like outlined "blob" paths
// (drawn with fill="none"). These are the organic forms; everything else
// is text glyphs or filled background shapes.
function filterFillNoneDStrings(text) {
  const out = [];
  // Only match path elements that have fill="none" attribute
  const re = /<path\b[^>]*\bfill="none"[^>]*\sd="([^"]+)"|<path\b[^>]*\sd="([^"]+)"[^>]*\bfill="none"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push(m[1] || m[2]);
  }
  return out;
}

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

function bboxOfLines(lines) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const l of lines) {
    if (l.x1 < minX) minX = l.x1;
    if (l.x2 < minX) minX = l.x2;
    if (l.x1 > maxX) maxX = l.x1;
    if (l.x2 > maxX) maxX = l.x2;
    if (l.y1 < minY) minY = l.y1;
    if (l.y2 < minY) minY = l.y2;
    if (l.y1 > maxY) maxY = l.y1;
    if (l.y2 > maxY) maxY = l.y2;
  }
  return isFinite(minX)
    ? { minX, minY, maxX, maxY }
    : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
}

// ─── Build wasteCategories ───────────────────────────────────────

const quantitiesSvg = readFileSync(QUANTITIES, 'utf8');
const wasteCategories = {};

for (const id of ['vllw', 'llw', 'ilw', 'hlw']) {
  const g = findGroupById(quantitiesSvg, `blob-${id}`);
  if (!g) {
    console.error(`Missing blob-${id} in waste-quantities SVG`);
    process.exit(1);
  }
  // Prefer fill="none" outlines (the organic blob lines); fall back to all paths.
  let paths = filterFillNoneDStrings(g.text);
  if (paths.length === 0) paths = extractDStrings(g.text);

  // Identify the outermost outline polyline by per-path bbox area —
  // used as the silhouette occluder in the inversion canvas.
  let outlineIndex = 0;
  let outlineArea = -1;
  const perPathBbox = paths.map((d) => {
    const flat = parseD(d);
    let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
    for (let k = 0; k < flat.length; k += 2) {
      const x = flat[k], y = flat[k + 1];
      if (x < mnx) mnx = x; if (x > mxx) mxx = x;
      if (y < mny) mny = y; if (y > mxy) mxy = y;
    }
    return (mxx - mnx) * (mxy - mny);
  });
  for (let i = 0; i < perPathBbox.length; i++) {
    if (perPathBbox[i] > outlineArea) { outlineArea = perPathBbox[i]; outlineIndex = i; }
  }

  const bbox = bboxOfDStrings(paths);
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const nativeRadius = Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY) / 2;
  wasteCategories[id] = {
    paths,
    outlineIndex,
    bbox,
    centroid: [cx, cy],
    nativeRadius,
    ...WASTE_VALUES[id],
  };
  console.log(
    `blob-${id.padEnd(5)} paths=${paths.length} outlineIdx=${outlineIndex} ` +
    `bbox=[${bbox.minX.toFixed(1)},${bbox.minY.toFixed(1)},${bbox.maxX.toFixed(1)},${bbox.maxY.toFixed(1)}] ` +
    `centroid=[${cx.toFixed(1)},${cy.toFixed(1)}] R=${nativeRadius.toFixed(1)}`,
  );
}

// Top-level slot positions (taken from each category's print centroid).
// In volume mode, vllw/llw/ilw/hlw occupy A/B/C/D respectively; the
// component swaps the assignment in radioactivity mode so the dominant
// form lands at the dominant slot.
const slots = {
  A: wasteCategories.vllw.centroid,
  B: wasteCategories.llw.centroid,
  C: wasteCategories.ilw.centroid,
  D: wasteCategories.hlw.centroid,
};

// ─── Build producers ─────────────────────────────────────────────

const locationsSvg = readFileSync(LOCATIONS, 'utf8');
const producers = {};

for (const id of Object.keys(PRODUCER_VALUES)) {
  const g = findGroupById(locationsSvg, `loc-${id}`);
  if (!g) {
    console.error(`Missing loc-${id} in waste-locations SVG`);
    process.exit(1);
  }
  const circles = extractCircles(g.text);
  if (circles.length === 0) {
    console.error(`No circle inside loc-${id}`);
    process.exit(1);
  }
  const c = circles[0];
  producers[id] = {
    cx: c.cx,
    cy: c.cy,
    r: c.r,
    ...PRODUCER_VALUES[id],
  };
  console.log(`loc-${id.padEnd(10)} cx=${c.cx.toFixed(1)} cy=${c.cy.toFixed(1)} r=${c.r.toFixed(1)} share=${PRODUCER_VALUES[id].sharePct}%`);
}

// ─── Build doses ────────────────────────────────────────────────

const dosesSvg = readFileSync(DOSES, 'utf8');
const doses = {};

// Map our dose id to the SVG group id (most are dose-X but llw_drum is dose-llw)
const DOSE_ID_MAP = {
  reactor:    'dose-reactor',
  dental:     'dose-dental',
  chest:      'dose-chest',
  llw_drum:   'dose-llw',
  flight:     'dose-flight',
  ilw:        'dose-ilw',
  hlw:        'dose-hlw',
  background: 'dose-background',
  ct:         'dose-ct',
};

for (const [doseId, svgGroupId] of Object.entries(DOSE_ID_MAP)) {
  const g = findGroupById(dosesSvg, svgGroupId);
  if (!g) {
    console.error(`Missing ${svgGroupId} in radiation-doses SVG`);
    process.exit(1);
  }
  const circles = extractCircles(g.text);
  if (circles.length === 0) {
    console.error(`No centre circle in ${svgGroupId}`);
    process.exit(1);
  }
  const centre = circles[0];
  // Source line geometry only — no synthesis. The smallest doses
  // (reactor, dental) genuinely have no rays in the print artwork; they
  // render as a centre dot, which is the point.
  const lines = extractLines(g.text);
  const bbox = bboxOfLines(lines);
  doses[doseId] = {
    centre: [centre.cx, centre.cy],
    centreRadius: centre.r,
    lines,
    bbox,
    doseMSv: DOSE_VALUES[doseId],
  };
  console.log(
    `${svgGroupId.padEnd(18)} centre=[${centre.cx.toFixed(1)},${centre.cy.toFixed(1)}] ` +
    `r=${centre.r.toFixed(2)} lines=${lines.length} dose=${DOSE_VALUES[doseId]} mSv`,
  );
}

// ─── Build storage ──────────────────────────────────────────────

const storageSvg = readFileSync(STORAGE, 'utf8');
const storage = {};

// Strip burned-in glyph paths (the storage SVG's title and subtitle
// have been outlined to filled paths — fill="#0d1a1e" and the very
// occasional "#111a1b") while keeping illustration fills (the print's
// emphasis colour fill="#1b3967" — ground in cross-sections, roof
// blocks, etc.) and stroked outlines (fill="none").
const TEXT_FILL_COLOURS = new Set(['#0d1a1e', '#111a1b']);
function filterIllustrationOnly(innerSvg) {
  return innerSvg.replace(
    /<(path|polyline)\b[^>]*?\/>/g,
    (match) => {
      const fillMatch = match.match(/fill="([^"]+)"/);
      if (fillMatch && TEXT_FILL_COLOURS.has(fillMatch[1].toLowerCase())) return '';
      return match;
    },
  );
}

for (const id of ['landfill', 'vaults', 'treatment', 'gdf']) {
  const g = findGroupById(storageSvg, `storage-${id}`);
  if (!g) {
    console.error(`Missing storage-${id} in waste-storage SVG`);
    process.exit(1);
  }
  // Drop filled glyph paths so the React component owns all typography.
  const innerSvg = filterIllustrationOnly(g.text);
  // Bbox now covers only the illustration (filled label paths gone),
  // which gives a tight viewBox without the burned-in title space.
  const illustrationPaths = filterFillNoneDStrings(innerSvg);
  const bbox = bboxOfDStrings(illustrationPaths.length > 0
    ? illustrationPaths
    : extractDStrings(innerSvg));
  storage[id] = {
    innerSvg,
    bbox,
  };
  console.log(`storage-${id.padEnd(10)} bytes=${innerSvg.length} illustration paths=${illustrationPaths.length} bbox=[${bbox.minX.toFixed(1)},${bbox.minY.toFixed(1)},${bbox.maxX.toFixed(1)},${bbox.maxY.toFixed(1)}]`);
}

// ─── Write JSON ─────────────────────────────────────────────────

const out = { wasteCategories, slots, producers, doses, storage };

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`\nWrote ${OUT}`);
