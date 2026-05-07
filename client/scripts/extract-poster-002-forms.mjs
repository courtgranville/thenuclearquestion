#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// extract-poster-002-forms.mjs
//
// Reads the poster 002 SVG, extracts geometry from form-* and
// land-* groups using the canonical ID mapping (SVG element IDs
// do NOT match visual positions), and writes a JSON file keyed
// by logical source name.
//
// Usage:
//   node client/scripts/extract-poster-002-forms.mjs <input.svg> <output.json>
//
// The output JSON shape is contractual with the poster 002 canvas
// animation component — do not change it without also updating
// the consumer.
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Canonical mapping: logical ID → { form group id, land group id, metrics }
// SVG element IDs do NOT match visual positions — this mapping is authoritative.
const SOURCES = {
  'nuclear':        { formGroup: 'form-nuclear',        landGroup: 'land-gas',            land_m2y: 0.33,  water_m3: 132 },
  'gas':            { formGroup: 'form-gas',             landGroup: 'land-nuclear',        land_m2y: 1.04,  water_m3: 45  },
  'coal':           { formGroup: 'form-coal',            landGroup: 'land-coal',           land_m2y: 14.88, water_m3: 120 },
  'coal-ccs':       { formGroup: 'form-coal-ccs',        landGroup: 'land-solar-silicon',  land_m2y: 21.06, water_m3: 214 },
  'hydropower':     { formGroup: 'form-hydropower',      landGroup: 'land-hydropower',     land_m2y: 33.39, water_m3: 13  },
  'solar-silicon':  { formGroup: 'form-solar-silicon',   landGroup: 'land-coal-ccs',       land_m2y: 19.23, water_m3: 35  },
  'solar-cadmium':  { formGroup: 'form-solar-cadmium',   landGroup: 'land-solar-cadmium',  land_m2y: 12.65, water_m3: 8   },
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

// ─── Parse polyline points attribute ────────────────────────────
// Points attribute is space-separated pairs: "x1 y1 x2 y2 ..."

function parsePolylinePoints(pointsStr) {
  const nums = pointsStr.trim().split(/\s+/).map(Number);
  return nums; // flat array [x, y, x, y, ...]
}

// ─── Extract points from a land element (polyline or path) ──────

function extractLandPoints(element) {
  // Check if it's a polyline with points attribute
  const pointsMatch = element.match(/\spoints="([^"]+)"/);
  if (pointsMatch) {
    return {
      points: pointsMatch[1],
      flat: parsePolylinePoints(pointsMatch[1]),
    };
  }
  // Otherwise it's a path with d attribute — flatten to x,y pairs
  const dMatch = element.match(/\sd="([^"]+)"/);
  if (dMatch) {
    const flat = parseD(dMatch[1]);
    // Convert flat [x0,y0,x1,y1,...] to "x0,y0 x1,y1 ..." format
    const pairs = [];
    for (let i = 0; i < flat.length; i += 2) {
      pairs.push(`${flat[i]},${flat[i + 1]}`);
    }
    return {
      points: pairs.join(' '),
      flat,
    };
  }
  return null;
}

// ─── Group extraction ───────────────────────────────────────────

function extractGroup(svgText, groupId) {
  // Match <g id="groupId"> ... </g>, supporting the content inside
  const re = new RegExp(`<g\\s+id="${groupId}"[^>]*>([\\s\\S]*?)</g>`, 'g');
  const match = re.exec(svgText);
  if (!match) return null;
  return match[1];
}

function extractFormPaths(inner) {
  const pathRe = /<path[^>]*\sd="([^"]+)"[^>]*\/?>/g;
  const paths = [];
  let pm;
  while ((pm = pathRe.exec(inner)) !== null) {
    paths.push(pm[1]);
  }
  return paths;
}

function extractLandLines(inner) {
  // Match both <polyline ...> and <path ...> elements
  const elemRe = /<(?:polyline|path)[^>]*(?:\/>|>[^<]*<\/(?:polyline|path)>)/g;
  const lines = [];
  let em;
  while ((em = elemRe.exec(inner)) !== null) {
    const parsed = extractLandPoints(em[0]);
    if (parsed) lines.push(parsed);
  }
  return lines;
}

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

function centroidOfBbox(bbox) {
  return [(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2];
}

function meanY(flat) {
  if (flat.length < 2) return 0;
  let sum = 0, count = 0;
  for (let k = 1; k < flat.length; k += 2) {
    sum += flat[k];
    count++;
  }
  return sum / count;
}

// ─── Main ────────────────────────────────────────────────────────

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error('Usage: extract-poster-002-forms.mjs <input.svg> <output.json>');
  process.exit(1);
}

const inputPath  = resolve(inputArg);
const outputPath = resolve(outputArg);

const svgText = readFileSync(inputPath, 'utf8');

const result = {};

for (const [logicalId, config] of Object.entries(SOURCES)) {
  const { formGroup, landGroup, land_m2y, water_m3 } = config;

  // ── Form group ──
  const formInner = extractGroup(svgText, formGroup);
  if (!formInner) {
    console.warn(`Form group "${formGroup}" not found — skipping ${logicalId}`);
    continue;
  }
  const formPaths = extractFormPaths(formInner);
  const formFlats = formPaths.map(d => parseD(d));
  const formBbox = bboxOfFlatPoints(formFlats);
  const formCentroid = centroidOfBbox(formBbox);

  // ── Land group ──
  const landInner = extractGroup(svgText, landGroup);
  if (!landInner) {
    console.warn(`Land group "${landGroup}" not found — skipping ${logicalId}`);
    continue;
  }
  const landElements = extractLandLines(landInner);

  // Compute overall mean Y of all land lines for dist_from_centre
  const allLandFlats = landElements.map(e => e.flat);
  const landBbox = bboxOfFlatPoints(allLandFlats);
  const landCentroid = centroidOfBbox(landBbox);

  // Overall mean Y across all lines in this surface
  let totalYSum = 0, totalYCount = 0;
  for (const flat of allLandFlats) {
    for (let k = 1; k < flat.length; k += 2) {
      totalYSum += flat[k];
      totalYCount++;
    }
  }
  const overallMeanY = totalYCount > 0 ? totalYSum / totalYCount : 0;

  const landLines = landElements.map(e => ({
    points: e.points,
    dist_from_centre: meanY(e.flat) - overallMeanY,
  }));

  result[logicalId] = {
    form_paths: formPaths,
    form_bbox: formBbox,
    form_centroid: formCentroid,
    land_lines: landLines,
    land_bbox: landBbox,
    land_centroid: landCentroid,
    land_m2y,
    water_m3,
  };

  console.log(
    `${logicalId}: ${formPaths.length} form_paths, ${landLines.length} land_lines, ` +
    `form_bbox ${Math.round(formBbox.maxX - formBbox.minX)}×${Math.round(formBbox.maxY - formBbox.minY)}, ` +
    `land_bbox ${Math.round(landBbox.maxX - landBbox.minX)}×${Math.round(landBbox.maxY - landBbox.minY)}, ` +
    `land_m2y=${land_m2y} water_m3=${water_m3}`
  );
}

// Sanity: warn if any expected source is missing
for (const id of Object.keys(SOURCES)) {
  if (!(id in result)) {
    console.warn(`Expected source "${id}" was not found in output`);
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`\nWrote ${outputPath} with ${Object.keys(result).length} sources`);
