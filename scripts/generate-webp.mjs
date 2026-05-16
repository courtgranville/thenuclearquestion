#!/usr/bin/env node
// Generate WebP siblings for the six full-bleed poster preview PNGs and
// the six homepage thumbnail PNGs. Outputs the same base filename with a
// `.webp` extension, in the same directory. Re-runnable: if the .webp
// already exists and is newer than its source .png, the file is skipped.
//
// Usage:
//   pnpm webp                # process all 12 known PNGs
//   node scripts/generate-webp.mjs

import { readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(REPO_ROOT, 'client', 'public', 'assets');

// The 12 PNGs we convert. Listed by exact filename so the script does not
// silently include any other PNGs added to assets/ in the future. The full-
// bleed previews are listed in posterData.ts as `imagePath`; the thumbnails
// as `thumbnailPath`. Keep this list in sync with posterData.ts when the
// canonical hash changes.
//
// Mode:
//   'lossless' - WebP lossless, used for the full-bleed previews. The
//                source PNGs are PNG-8 palette-quantised exports at
//                print resolution, so lossy WebP at quality 82 adds
//                chroma noise without saving bytes; lossless WebP
//                beats palette PNG by a comfortable margin without
//                touching pixels.
//   'lossy'    - WebP quality 82, used for the small homepage
//                thumbnails. The display size is small enough that the
//                lossy mode is invisible, and the byte savings are
//                significant (55-69% over PNG-8).
const TARGETS = [
  { name: '001-version2_643b19ce.png',  mode: 'lossless' },
  { name: '002-version2_b4d2d765.png',  mode: 'lossless' },
  { name: '003-version2_4e239d18.png',  mode: 'lossless' },
  { name: '004-version2_1f18c33d.png',  mode: 'lossless' },
  { name: '005-preview-1_fea2ab19.png', mode: 'lossless' },
  { name: '006-version2_5c838076.png',  mode: 'lossless' },
  { name: 'poster-001-thumbnail.png',   mode: 'lossy' },
  { name: 'poster-002-thumbnail.png',   mode: 'lossy' },
  { name: 'poster-003-thumbnail.png',   mode: 'lossy' },
  { name: 'poster-004-thumbnail.png',   mode: 'lossy' },
  { name: 'poster-005-thumbnail.png',   mode: 'lossy' },
  { name: 'poster-006-thumbnail.png',   mode: 'lossy' },
];

// sharp webp options keyed by mode.
const WEBP_OPTIONS = {
  lossy:    { quality: 82, effort: 6 },
  lossless: { lossless: true, effort: 6 },
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function pad(s, n) {
  const str = String(s);
  return str.length >= n ? str : str + ' '.repeat(n - str.length);
}

async function exists(filepath) {
  try {
    await stat(filepath);
    return true;
  } catch {
    return false;
  }
}

async function isUpToDate(srcPath, outPath) {
  try {
    const [s, o] = await Promise.all([stat(srcPath), stat(outPath)]);
    return o.mtimeMs >= s.mtimeMs;
  } catch {
    return false;
  }
}

async function processFile(target) {
  const { name: filename, mode } = target;
  const srcPath = path.join(ASSETS_DIR, filename);
  const outName = filename.replace(/\.png$/i, '.webp');
  const outPath = path.join(ASSETS_DIR, outName);
  const options = WEBP_OPTIONS[mode];

  if (!options) {
    return { filename, mode, skipped: true, reason: `unknown mode "${mode}"` };
  }

  if (!(await exists(srcPath))) {
    return { filename, mode, skipped: true, reason: 'source missing' };
  }

  if (await isUpToDate(srcPath, outPath)) {
    const [srcStat, outStat] = await Promise.all([stat(srcPath), stat(outPath)]);
    return {
      filename,
      mode,
      outName,
      sourceBytes: srcStat.size,
      outputBytes: outStat.size,
      skipped: true,
      reason: 'up to date',
    };
  }

  const sourceBuf = await readFile(srcPath);
  const outputBuf = await sharp(sourceBuf).webp(options).toBuffer();
  await writeFile(outPath, outputBuf);

  return {
    filename,
    mode,
    outName,
    sourceBytes: sourceBuf.length,
    outputBytes: outputBuf.length,
    skipped: false,
  };
}

async function main() {
  if (!(await exists(ASSETS_DIR))) {
    await mkdir(ASSETS_DIR, { recursive: true });
  }

  console.log(`Source: ${ASSETS_DIR}`);
  console.log(
    `WebP options: lossy {quality: ${WEBP_OPTIONS.lossy.quality}, ` +
      `effort: ${WEBP_OPTIONS.lossy.effort}}, ` +
      `lossless {effort: ${WEBP_OPTIONS.lossless.effort}}`
  );
  console.log('');

  const rows = [];
  for (const target of TARGETS) {
    const row = await processFile(target);
    rows.push(row);
  }

  console.log(
    pad('File', 38) +
      pad('Mode', 10) +
      pad('PNG', 12) +
      pad('WebP', 12) +
      pad('Saving', 10) +
      'Status'
  );
  console.log('-'.repeat(92));

  let totalSource = 0;
  let totalOutput = 0;
  let processed = 0;
  let skipped = 0;

  for (const r of rows) {
    if (r.skipped && r.reason === 'source missing') {
      console.log(pad(r.filename, 38) + pad(r.mode, 10) + 'MISSING');
      continue;
    }
    const saving = ((r.outputBytes / r.sourceBytes - 1) * 100).toFixed(1);
    const status = r.skipped ? `skipped (${r.reason})` : 'generated';
    console.log(
      pad(r.filename, 38) +
        pad(r.mode, 10) +
        pad(formatSize(r.sourceBytes), 12) +
        pad(formatSize(r.outputBytes), 12) +
        pad(`${saving}%`, 10) +
        status
    );
    totalSource += r.sourceBytes;
    totalOutput += r.outputBytes;
    if (r.skipped) skipped += 1;
    else processed += 1;
  }
  console.log('-'.repeat(92));

  const totalSaving = totalSource > 0
    ? ((totalOutput / totalSource - 1) * 100).toFixed(1)
    : '0.0';
  console.log(
    pad('Total', 38) +
      pad('', 10) +
      pad(formatSize(totalSource), 12) +
      pad(formatSize(totalOutput), 12) +
      pad(`${totalSaving}%`, 10) +
      `${processed} generated, ${skipped} skipped`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
