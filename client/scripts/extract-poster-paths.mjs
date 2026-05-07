#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// extract-poster-paths.mjs
//
// Reads a poster SVG, walks each <g id="form-*"> group, extracts
// every descendant <path>'s d attribute, computes the bounding box
// and centroid by parsing each d-string, and writes a JSON file
// keyed by form id (without the "form-" prefix).
//
// Usage:
//   node client/scripts/extract-poster-paths.mjs <input.svg> <output.json>
//
// The output JSON shape is contractual with
// client/src/components/Poster001CanvasViz.tsx — do not change it
// without also updating the consumer.
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Hardcoded emissions values per source id, copied verbatim from
// the regions array in the original Poster001Viz.tsx so the JSON
// is the single source of truth for the canvas component.
const EMISSIONS = {
  'nuclear':        5.6,
  'onshore-wind':   11,
  'offshore-wind':  17,
  'solar-cadmium':  16,
  'solar-silicon':  32,
  'hydropower':     117,
  'coal-ccs':       294,
  'gas':            439,
  'coal':           970,
};

// ─── Inline copy of parseD from client/src/lib/parseSvg.ts ──────
// We don't import the TS module from a Node script (avoids a
// tsx / ts-node dependency). The logic must stay in sync; if
// parseSvg.ts ever changes the flattening behaviour, mirror it here.

const FLATTEN_STEPS_FALLBACK = 8;

function flattenCubic(x0, y0, x1, y1, x2, y2, x3, y3, out) {
  const chord = Math.hypot(x3 - x0, y3 - y0);
  const poly  =
    Math.hypot(x1 - x0, y1 - y0) +
    Math.hypot(x2 - x1, y2 - y1) +
    Math.hypot(x3 - x2, y3 - y2);
  const curl  = poly / Math.max(chord, 0.01);
  const STEPS =
    Math.max(6, Math.min(24, Math.round(chord * 0.35 * curl))) ||
    FLATTEN_STEPS_FALLBACK;
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

// ─── Form group extraction from the SVG ──────────────────────────
// The SVG is well-formed and machine-generated, so we can safely
// walk it with regex rather than a full XML parser.

function extractFormGroups(svgText) {
  const out = {};
  // Match <g id="form-XYZ"> ... </g>, supporting nested <g>'s
  // (none expected in this SVG, but be defensive).
  const groupRe = /<g\s+id="form-([^"]+)"[^>]*>([\s\S]*?)<\/g>/g;
  let gm;
  while ((gm = groupRe.exec(svgText)) !== null) {
    const id = gm[1];
    const inner = gm[2];
    // Match every <path d="..."> inside this group.
    const pathRe = /<path[^>]*\sd="([^"]+)"[^>]*\/?>/g;
    const paths = [];
    let pm;
    while ((pm = pathRe.exec(inner)) !== null) {
      paths.push(pm[1]);
    }
    out[id] = paths;
  }
  return out;
}

function bboxOfPaths(paths) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  for (const d of paths) {
    const flat = parseD(d);
    for (let k = 0; k < flat.length; k += 2) {
      const x = flat[k], y = flat[k + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { minX, minY, maxX, maxY };
}

// ─── Main ────────────────────────────────────────────────────────

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error('Usage: extract-poster-paths.mjs <input.svg> <output.json>');
  process.exit(1);
}

const inputPath  = resolve(inputArg);
const outputPath = resolve(outputArg);

const svgText = readFileSync(inputPath, 'utf8');
const groups  = extractFormGroups(svgText);

const result = {};
for (const [id, paths] of Object.entries(groups)) {
  if (!(id in EMISSIONS)) {
    console.warn(`Form id "${id}" has no emissions value — skipping`);
    continue;
  }
  if (paths.length === 0) {
    console.warn(`Form id "${id}" has no paths — skipping`);
    continue;
  }
  const bbox     = bboxOfPaths(paths);
  const centroid  = [(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2];
  result[id] = {
    paths,
    bbox,
    centroid,
    emissions: EMISSIONS[id],
  };
  console.log(
    `${id}: ${paths.length} paths, bbox ${Math.round(bbox.maxX - bbox.minX)}×${Math.round(bbox.maxY - bbox.minY)}, emissions ${EMISSIONS[id]}`
  );
}

// Sanity: warn if any expected form is missing.
for (const id of Object.keys(EMISSIONS)) {
  if (!(id in result)) {
    console.warn(`Expected form id "${id}" was not found in SVG`);
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`\nWrote ${outputPath} with ${Object.keys(result).length} forms`);
