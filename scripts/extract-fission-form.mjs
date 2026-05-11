#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// extract-fission-form.mjs
//
// Walks every <path d="..."> in client/public/assets/main-icon-dark.svg,
// samples each path by arc length at a uniform interval, normalises
// the cloud to [-1, +1] (centroid at origin, divided by viewBox
// half-width), and writes the flat point list to
// client/src/assets/fission-form-points.json.
//
// Usage:
//   node scripts/extract-fission-form.mjs
//
// Phase 1 of the Fission Room build. See FISSION_BRIEF.md.
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { svgPathProperties } from 'svg-path-properties';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot  = resolve(__dirname, '..');

const SRC  = resolve(repoRoot, 'client/public/assets/main-icon-dark.svg');
const OUT  = resolve(repoRoot, 'client/src/assets/fission-form-points.json');

// Arc-length interval in SVG user units. The acceptance criterion in
// FISSION_BRIEF.md (Phase 1) is 15k - 60k total points; that band is
// the binding constraint, not the example interval value. This SVG
// carries 251 paths with combined length ~211k units, so interval 10
// lands at ~42k points, mid-band. Adjust this constant - not the
// band - if the source artwork changes.
const SAMPLE_INTERVAL = 10;

// ─── Read source ─────────────────────────────────────────────────

const svg = readFileSync(SRC, 'utf8');

// Pull the viewBox so we never hard-code the half-width.
const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
if (!viewBoxMatch) {
  console.error('No viewBox attribute found on the root <svg>. Aborting.');
  process.exit(1);
}
const [, , vbW, vbH] = viewBoxMatch[1].split(/\s+/).map(Number);
if (!Number.isFinite(vbW) || !Number.isFinite(vbH)) {
  console.error(`Could not parse viewBox dimensions: "${viewBoxMatch[1]}"`);
  process.exit(1);
}

// Every <path d="..."> in the file. The brief asserts no transforms
// and no nested namespaces, so a regex is enough. We capture only the
// d-attribute payload.
const pathRe = /<path\b[^>]*\bd="([^"]+)"/g;

// ─── Sample every path ───────────────────────────────────────────

const rawPoints = []; // [x0, y0, x1, y1, ...] in viewBox coordinates
let pathCount = 0;
let perPath   = [];   // for the closing log line

let m;
while ((m = pathRe.exec(svg)) !== null) {
  const d = m[1];
  let props;
  try {
    props = new svgPathProperties(d);
  } catch (err) {
    console.warn(`Skipping path #${pathCount} - parser threw: ${err.message}`);
    continue;
  }

  const length = props.getTotalLength();
  if (!Number.isFinite(length) || length <= 0) {
    perPath.push(0);
    pathCount++;
    continue;
  }

  // Inclusive of both endpoints. For short paths (length < interval),
  // we still emit at least the start and end.
  const samples = Math.max(2, Math.ceil(length / SAMPLE_INTERVAL) + 1);
  for (let i = 0; i < samples; i++) {
    const t = (i / (samples - 1)) * length;
    const { x, y } = props.getPointAtLength(t);
    rawPoints.push(x, y);
  }
  perPath.push(samples);
  pathCount++;
}

if (rawPoints.length === 0) {
  console.error('No path samples produced. Aborting.');
  process.exit(1);
}

// ─── Centroid + normalise to [-1, +1] ────────────────────────────
//
// Two passes. First pass: compute centroid in viewBox coordinates,
// then find the most distant point from the centroid (the form's
// actual bounding radius in viewBox units). Second pass: subtract
// centroid and divide by that radius, so by construction the form
// spans exactly [-1, +1] and the downstream tuning constants
// (CASCADE_RADIUS, RECOHERE_BAND, CURSOR_RADIUS, ...) read as
// fractions of the form's own width.
//
// SVG y grows downward; we flip to math-style y-up to match Three.js.
//
// The inverse transform is stored on the JSON payload so cursor
// screen coordinates can be mapped back into viewBox space later:
//   svgX =  worldX * boundingRadiusInViewBox + centroid.x
//   svgY = -worldY * boundingRadiusInViewBox + centroid.y

let sumX = 0;
let sumY = 0;
const count = rawPoints.length / 2;
for (let i = 0; i < rawPoints.length; i += 2) {
  sumX += rawPoints[i];
  sumY += rawPoints[i + 1];
}
const cx = sumX / count;
const cy = sumY / count;

let maxR2InViewBox = 0;
for (let i = 0; i < rawPoints.length; i += 2) {
  const dx = rawPoints[i]     - cx;
  const dy = rawPoints[i + 1] - cy;
  const r2 = dx * dx + dy * dy;
  if (r2 > maxR2InViewBox) maxR2InViewBox = r2;
}
const boundingRadiusInViewBox = Math.sqrt(maxR2InViewBox);

const positions = new Array(rawPoints.length);
let maxR2 = 0;
for (let i = 0; i < rawPoints.length; i += 2) {
  const nx = (rawPoints[i]     - cx) / boundingRadiusInViewBox;
  const ny = -((rawPoints[i + 1] - cy) / boundingRadiusInViewBox); // y flip
  positions[i]     = nx;
  positions[i + 1] = ny;
  const r2 = nx * nx + ny * ny;
  if (r2 > maxR2) maxR2 = r2;
}
const boundingRadius = Math.sqrt(maxR2); // ≈ 1.0 by construction

// ─── Write output ────────────────────────────────────────────────

mkdirSync(dirname(OUT), { recursive: true });

const payload = {
  count,
  boundingRadius: Number(boundingRadius.toFixed(6)),
  viewBox: {
    width: vbW,
    height: vbH,
    centroid: { x: Number(cx.toFixed(4)), y: Number(cy.toFixed(4)) },
    boundingRadiusInViewBox: Number(boundingRadiusInViewBox.toFixed(4)),
  },
  positions: positions.map((v) => Number(v.toFixed(6))),
};

writeFileSync(OUT, JSON.stringify(payload));

// ─── Log summary ─────────────────────────────────────────────────

const avgPerPath = pathCount > 0 ? (count / pathCount).toFixed(1) : '0';
const minPerPath = perPath.length ? Math.min(...perPath) : 0;
const maxPerPath = perPath.length ? Math.max(...perPath) : 0;
const bytes = Buffer.byteLength(JSON.stringify(payload));

console.log('extract-fission-form.mjs');
console.log(`  source         : ${SRC.replace(repoRoot + '/', '')}`);
console.log(`  out            : ${OUT.replace(repoRoot + '/', '')}`);
console.log(`  viewBox        : ${vbW} x ${vbH}`);
console.log(`  centroid       : (${cx.toFixed(2)}, ${cy.toFixed(2)})`);
console.log(`  sample interval: ${SAMPLE_INTERVAL} svg units`);
console.log(`  paths          : ${pathCount}`);
console.log(`  points         : ${count}`);
console.log(`  pts / path     : avg ${avgPerPath}, min ${minPerPath}, max ${maxPerPath}`);
console.log(`  form radius    : ${boundingRadiusInViewBox.toFixed(2)} viewBox units (${(100 * boundingRadiusInViewBox / (vbW / 2)).toFixed(1)}% of viewBox half-width)`);
console.log(`  boundingRadius : ${boundingRadius.toFixed(4)} (normalised, ≈ 1.0 by construction)`);
console.log(`  json size      : ${(bytes / 1024).toFixed(1)} kB`);

if (count < 15000 || count > 60000) {
  console.warn(
    `  ⚠ point count ${count} is outside the brief's 15k - 60k band. ` +
    `Adjust SAMPLE_INTERVAL (currently ${SAMPLE_INTERVAL}).`
  );
}
