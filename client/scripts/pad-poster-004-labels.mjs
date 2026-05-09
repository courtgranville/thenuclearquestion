#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// pad-poster-004-labels.mjs
//
// Adds outward radial padding to the petroleum-cluster sector
// labels in 004-processed_a9547a07.svg. The print export packs
// these labels close enough to their dots that — at viewport
// scale — the rendered character bodies clip the dot edges.
// Right-side carriers (electricity, bioenergy, etc.) ship with
// larger natural clearances, so the asymmetry is only visible on
// the petroleum side.
//
// Strategy: each top-level <g isolation="isolate"> group whose
// nearest sector-circle is a petroleum dot (fill=#a61e23) gets a
// transform="translate(dx, dy)" injected into its opening tag.
// (dx, dy) = (centroid - petroleum_anchor) / |·| × OFFSET_PX —
// pushes the label radially outward along the same axis the
// designer placed it. The 1.0 fan-out direction is preserved;
// each label simply slides further from its dot.
//
// Run from repo root:
//   node client/scripts/pad-poster-004-labels.mjs
//
// Idempotent: skips groups whose opening tag already includes
// transform=, so re-running is safe.
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const SVG_PATH = resolve(
  REPO_ROOT,
  'client/public/assets/004-processed_a9547a07.svg',
);

// Petroleum carrier anchor in SVG coords — taken from <g id="links">
// where the path data starts at (598.35, 773.08) for every petroleum
// connector (the carrier's own form anchor).
const PETROLEUM_ANCHOR = [598.35, 773.08];
const PETROLEUM_FILL = '#a61e23';

// Outward radial nudge in SVG units.
const OFFSET_PX = 14;

const svg = readFileSync(SVG_PATH, 'utf8');

// 1. Extract every <circle/> with cx, cy, r, fill.
function extractCircles(text) {
  const re = /<circle\s+([^/]*)\/>/g;
  const out = [];
  const get = (attrs, name) =>
    (attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]+)"`)) || [])[1];
  let m;
  while ((m = re.exec(text)) !== null) {
    const a = m[1];
    const cx = parseFloat(get(a, 'cx'));
    const cy = parseFloat(get(a, 'cy'));
    const r = parseFloat(get(a, 'r'));
    const fill = (get(a, 'fill') || '').toLowerCase();
    if (Number.isFinite(cx) && Number.isFinite(cy)) {
      out.push({ cx, cy, r, fill });
    }
  }
  return out;
}

// 2. Walk the SVG to find every top-level <g isolation="isolate">.
// Returns each group's open-tag location and inner-content range.
function findTopLevelIsolateGroups(text) {
  const tokenRe = /<svg[^>]*>|<g(?:\s[^>]*)?\s*\/?>|<\/g>/g;
  const out = [];
  let depth = 0;
  let pending = null;
  let m;
  while ((m = tokenRe.exec(text)) !== null) {
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
          openTagStart: m.index,
          openTagEnd: m.index + tag.length,
          innerStart: m.index + tag.length,
        };
      }
    }
  }
  return out;
}

const dots = extractCircles(svg);
const groups = findTopLevelIsolateGroups(svg);

// 3. For each group: collect glyph M-anchors, compute centroid,
// find the nearest dot.
const pathDRe = /<path[^>]*\sd="([^"]+)"[^>]*\/?>/g;

const targets = []; // groups to pad
for (const g of groups) {
  if (g.openTag.includes('transform=')) {
    // Already padded — skip (idempotent).
    continue;
  }
  const inner = svg.slice(g.innerStart, g.innerEnd);
  pathDRe.lastIndex = 0;
  const anchors = [];
  let pm;
  while ((pm = pathDRe.exec(inner)) !== null) {
    const m = pm[1].match(/^M([\d.]+),([\d.]+)/);
    if (m) anchors.push([+m[1], +m[2]]);
  }
  if (anchors.length === 0) continue;

  // Centroid of anchors.
  let sumX = 0, sumY = 0;
  for (const [x, y] of anchors) { sumX += x; sumY += y; }
  const cX = sumX / anchors.length;
  const cY = sumY / anchors.length;

  // Nearest dot to ANY glyph anchor (not just centroid — labels are
  // rotated and elongated, so the centroid can be far from the dot
  // even when one end of the label sits right next to it).
  let bestDot = null;
  let bestD = Infinity;
  for (const dot of dots) {
    for (const [x, y] of anchors) {
      const d = Math.hypot(x - dot.cx, y - dot.cy);
      if (d < bestD) {
        bestD = d;
        bestDot = dot;
      }
    }
  }
  if (!bestDot) continue;
  if (bestDot.fill !== PETROLEUM_FILL) continue;

  // Outward direction = label centroid − petroleum anchor.
  let vx = cX - PETROLEUM_ANCHOR[0];
  let vy = cY - PETROLEUM_ANCHOR[1];
  let mag = Math.hypot(vx, vy);
  if (mag < 0.5) {
    // Edge case: centroid coincides with anchor. Use centroid −
    // dot as fallback.
    vx = cX - bestDot.cx;
    vy = cY - bestDot.cy;
    mag = Math.hypot(vx, vy) || 1;
  }
  const dx = +((vx / mag) * OFFSET_PX).toFixed(2);
  const dy = +((vy / mag) * OFFSET_PX).toFixed(2);
  targets.push({ ...g, dx, dy });
}

console.log(`Padding ${targets.length} petroleum-paired labels by ${OFFSET_PX} px outward.`);

// 4. Inject transform="..." into each opening tag. Process in
// reverse order so earlier offsets stay valid.
targets.sort((a, b) => b.openTagStart - a.openTagStart);
let modified = svg;
for (const t of targets) {
  const newTag = t.openTag.replace(
    /^<g\s/,
    `<g transform="translate(${t.dx} ${t.dy})" `,
  );
  modified =
    modified.slice(0, t.openTagStart) +
    newTag +
    modified.slice(t.openTagEnd);
}

writeFileSync(SVG_PATH, modified);
console.log(`Wrote ${SVG_PATH}`);
