#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────
// annotate-poster-005-map.mjs
//
// Loads client/public/assets/005-map_d6bf9e9f.svg, locates each
// reactor's project circle, stamps data-unit + data-phase attributes
// onto every project circle, and writes the result to
// client/public/assets/005-map-annotated_<HASH>.svg.
//
// Why this exists:
//   The original map SVG carries data-project / data-mw / data-units /
//   data-group on its 32 reactor circles, but no data-unit. Cross-view
//   linkage on the page (hover-a-map-circle → highlight the matching
//   leaf in the dendrogram + the matching bar in the timeline) needs a
//   canonical reactor identifier that lives on the map element.
//
//   Each map circle represents a project that holds 1..N reactor
//   units, so this script writes data-unit as a comma-separated list
//   of every unit name attached to that project. data-phase is the
//   common status of those units (or "mixed" if a project has units
//   in more than one status — the original Oldbury circle, for
//   instance, sits in data-group="Past" for the A units but the
//   manifest also routes the B units to it).
//
// Mapping rule (Court correction #4):
//   For each map circle (data-project, data-group), find all reactor
//   records in the manifest whose:
//     (a) name starts with the project name, AND
//     (b) status is compatible with the data-group:
//           Future   ⇄ underConstruction | cancelled
//           Operating ⇄ operating
//           Past      ⇄ retired
//           Paused    ⇄ cancelled
//           Abandoned ⇄ cancelled
//   This stops "Hinkley Point C1" (underConstruction) from being
//   stamped onto the data-group="Past" Hinkley Point circle.
//
// Output filename uses a content hash of the annotated SVG so Vite's
// fingerprinting and Cloudflare's cache invalidation work correctly.
//
// Usage:
//   node scripts/annotate-poster-005-map.mjs
// ─────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const SOURCE_MAP = resolve(REPO_ROOT, 'client/public/assets/005-map_d6bf9e9f.svg');
const FORMS_JSON = resolve(REPO_ROOT, 'client/src/assets/poster-005-forms.json');
const ASSETS_DIR = resolve(REPO_ROOT, 'client/public/assets');

const STATUS_GROUP_COMPAT = {
  Future:    new Set(['underConstruction', 'cancelled']),
  Operating: new Set(['operating']),
  Past:      new Set(['retired']),
  Paused:    new Set(['cancelled']),
  Abandoned: new Set(['cancelled']),
};

function loadReactors() {
  const j = JSON.parse(readFileSync(FORMS_JSON, 'utf8'));
  return j.reactors;
}

function getAttr(elementText, name) {
  const m = elementText.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function annotate(svg, reactors) {
  // Walk every <circle> that already has data-project. Stamp data-unit
  // and data-phase on each.
  let written = 0;
  const unmatched = [];

  const result = svg.replace(
    /<circle\s+([^/]*?data-project="[^"]+"[^/]*?)\/>/g,
    (full, attrs) => {
      const project = getAttr(attrs, 'data-project');
      const group = getAttr(attrs, 'data-group');
      const compat = STATUS_GROUP_COMPAT[group] ?? new Set();
      const matched = reactors.filter((r) =>
        (r.name === project || r.name.startsWith(project + ' ') || r.name.startsWith(project)) &&
        compat.has(r.status),
      );
      if (matched.length === 0) {
        unmatched.push({ project, group });
        return full;
      }
      // Build the attribute additions
      const units = matched.map((r) => r.name).join(',');
      const phases = [...new Set(matched.map((r) => r.status))];
      const phase = phases.length === 1 ? phases[0] : 'mixed';

      // Strip any existing data-unit / data-phase so re-runs are
      // idempotent.
      let cleaned = attrs
        .replace(/\s+data-unit="[^"]*"/g, '')
        .replace(/\s+data-phase="[^"]*"/g, '');
      const newAttrs = `${cleaned} data-unit="${units}" data-phase="${phase}"`;
      written++;
      return `<circle ${newAttrs}/>`;
    },
  );

  return { result, written, unmatched };
}

// ─── Run ─────────────────────────────────────────────────────────

console.log('Loading source map + reactors...');
const sourceSvg = readFileSync(SOURCE_MAP, 'utf8');
const reactors = loadReactors();
console.log(`  source map: ${sourceSvg.length} chars`);
console.log(`  reactors: ${reactors.length}`);

const { result, written, unmatched } = annotate(sourceSvg, reactors);
console.log(`\nAnnotated ${written} circles`);
if (unmatched.length) {
  console.warn(`\n  UNMATCHED ${unmatched.length} circles (no compatible reactor records):`);
  for (const u of unmatched) console.warn(`    project="${u.project}" group="${u.group}"`);
}

// Compute content hash for the output filename.
const hash = createHash('sha256').update(result).digest('hex').slice(0, 8);
const outputName = `005-map-annotated_${hash}.svg`;
const outputPath = resolve(ASSETS_DIR, outputName);

// Remove any previous annotated variants so we don't leave stale
// fingerprints around.
for (const f of readdirSync(ASSETS_DIR)) {
  if (/^005-map-annotated_[0-9a-f]+\.svg$/.test(f) && f !== outputName) {
    unlinkSync(resolve(ASSETS_DIR, f));
    console.log(`  removed previous: ${f}`);
  }
}

writeFileSync(outputPath, result);
console.log(`\nWrote ${outputPath}`);
console.log(`  filename: ${outputName}`);
