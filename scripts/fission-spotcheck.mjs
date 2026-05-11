#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// fission-spotcheck.mjs
//
// Reads client/src/assets/fission-form-points.json and writes a
// black-on-white SVG dot plot to scripts/fission-spotcheck.svg.
// Open the SVG in any browser or in macOS Preview to confirm the
// extracted cloud still reads as the nucleus form. Run after
// extract-fission-form.mjs whenever the source SVG, the sampling
// interval, or the normalisation logic changes.
//
// Phase 1 of the Fission Room build. See FISSION_BRIEF.md.
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot  = resolve(__dirname, '..');

const SRC = resolve(repoRoot, 'client/src/assets/fission-form-points.json');
const OUT = resolve(repoRoot, 'scripts/fission-spotcheck.svg');

const payload = JSON.parse(readFileSync(SRC, 'utf8'));
const { count, boundingRadius, positions, viewBox } = payload;

// Normalised cloud sits in [-1, +1]. Pad slightly so dots don't kiss
// the SVG edge, and flip y back to SVG's y-down convention so the
// preview matches the nucleus icon as printed (top is top).
const PAD = 0.06;
const STROKE = 0.0055;
const VB = `${(-1 - PAD).toFixed(3)} ${(-1 - PAD).toFixed(3)} ${(2 + PAD * 2).toFixed(3)} ${(2 + PAD * 2).toFixed(3)}`;

// One big <path> with zero-length lines + round linecap renders each
// point as a filled disc of radius STROKE/2. ~15 chars per dot.
const segments = [];
for (let i = 0; i < positions.length; i += 2) {
  const x = positions[i];
  const y = -positions[i + 1]; // re-flip for SVG y-down
  segments.push(`M${x.toFixed(4)} ${y.toFixed(4)}l0 0`);
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}" width="720" height="720" style="background:#fff">
  <title>fission-form-points spot-check</title>
  <desc>${count} points, boundingRadius ${boundingRadius}, form radius ${viewBox.boundingRadiusInViewBox} of ${viewBox.width / 2} viewBox half-width.</desc>
  <path fill="none" stroke="#000" stroke-width="${STROKE}" stroke-linecap="round" d="${segments.join('')}"/>
</svg>
`;

writeFileSync(OUT, svg);

const bytes = Buffer.byteLength(svg);
console.log('fission-spotcheck.mjs');
console.log(`  source   : ${SRC.replace(repoRoot + '/', '')}`);
console.log(`  out      : ${OUT.replace(repoRoot + '/', '')}`);
console.log(`  points   : ${count}`);
console.log(`  svg size : ${(bytes / 1024).toFixed(1)} kB`);
console.log('');
console.log('  Open with:');
console.log(`    open ${OUT.replace(repoRoot + '/', '')}`);
