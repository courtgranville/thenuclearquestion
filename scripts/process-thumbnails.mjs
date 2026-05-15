#!/usr/bin/env node
// Compress the six Illustrator-exported poster thumbnails into
// homepage-ready PNGs. Re-runnable: byte-identical outputs for
// the same inputs at the same width.
//
// Usage:
//   pnpm thumbnails                      # defaults
//   pnpm thumbnails --width 1400         # narrower
//   pnpm thumbnails --source ~/Desktop/foo --out client/public/assets

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const DEFAULT_SOURCE =
  '/Users/courtgranville/Desktop/003_academics/[1]_IE/YEAR 4/THESIS/DATA-VISUALISATION/assets/thumbnails/png';
const DEFAULT_OUT = path.join(REPO_ROOT, 'client', 'public', 'assets');
const DEFAULT_WIDTH = 1600;

const POSTER_IDS = ['001', '002', '003', '004', '005', '006'];

const WARN_KB = 700;
const HARD_WARN_KB = 1024;

function parseArgs(argv) {
  const out = {
    source: DEFAULT_SOURCE,
    out: DEFAULT_OUT,
    width: DEFAULT_WIDTH,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--source' && value) {
      out.source = value;
      i += 1;
    } else if (flag === '--out' && value) {
      out.out = value;
      i += 1;
    } else if (flag === '--width' && value) {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--width must be a positive integer (got ${value})`);
      }
      out.width = parsed;
      i += 1;
    } else if (flag === '--help' || flag === '-h') {
      console.log(
        'process-thumbnails.mjs [--source DIR] [--out DIR] [--width PX]'
      );
      process.exit(0);
    }
  }
  return out;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function pad(s, n) {
  const str = String(s);
  return str.length >= n ? str : str + ' '.repeat(n - str.length);
}

async function processFile(id, opts) {
  const sourcePath = path.join(opts.source, `${id}-thumbnail.png`);
  const outPath = path.join(opts.out, `poster-${id}-thumbnail.png`);

  const sourceBuf = await readFile(sourcePath);
  const sourceBytes = sourceBuf.length;

  const pipeline = sharp(sourceBuf).resize({
    width: opts.width,
    withoutEnlargement: true,
  });

  const outputBuf = await pipeline
    .png({
      compressionLevel: 9,
      palette: true,
      quality: 90,
      effort: 10,
    })
    .toBuffer();

  // Capture dimensions from the output buffer rather than the pipeline,
  // so we report what's actually on disk.
  const outputMeta = await sharp(outputBuf).metadata();

  await writeFile(outPath, outputBuf);

  return {
    id,
    sourceBytes,
    outputBytes: outputBuf.length,
    width: outputMeta.width ?? 0,
    height: outputMeta.height ?? 0,
    outPath,
  };
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // Validate source dir up front for a nicer error than failing in the loop.
  try {
    await stat(opts.source);
  } catch (err) {
    throw new Error(
      `Source directory does not exist: ${opts.source}\n` +
        `Pass --source <path> to override the default.`
    );
  }

  await ensureDir(opts.out);

  console.log(`Source: ${opts.source}`);
  console.log(`Output: ${opts.out}`);
  console.log(`Width:  ${opts.width}px (no enlargement)`);
  console.log('');

  const rows = [];
  for (const id of POSTER_IDS) {
    const row = await processFile(id, opts);
    rows.push(row);
  }

  const totalSource = rows.reduce((a, r) => a + r.sourceBytes, 0);
  const totalOutput = rows.reduce((a, r) => a + r.outputBytes, 0);

  console.log(
    pad('Poster', 8) +
      pad('Source', 14) +
      pad('Output', 14) +
      pad('Dimensions', 14) +
      'Reduction'
  );
  console.log('-'.repeat(64));
  for (const r of rows) {
    const reduction = ((r.outputBytes / r.sourceBytes - 1) * 100).toFixed(1);
    console.log(
      pad(r.id, 8) +
        pad(formatSize(r.sourceBytes), 14) +
        pad(formatSize(r.outputBytes), 14) +
        pad(`${r.width}x${r.height}`, 14) +
        `${reduction}%`
    );
  }
  console.log('-'.repeat(64));
  console.log(
    pad('Total', 8) +
      pad(formatSize(totalSource), 14) +
      pad(formatSize(totalOutput), 14) +
      pad('', 14) +
      `${((totalOutput / totalSource - 1) * 100).toFixed(1)}%`
  );
  console.log('');

  // Warnings after the summary so they don't disrupt the table.
  for (const r of rows) {
    const kb = r.outputBytes / 1024;
    if (kb >= HARD_WARN_KB) {
      console.warn(
        `WARNING: poster-${r.id}-thumbnail.png is ${formatSize(r.outputBytes)} ` +
          `(>= ${HARD_WARN_KB} KB). Consider --width 1400 or dropping palette mode.`
      );
    } else if (kb >= WARN_KB) {
      console.warn(
        `Note: poster-${r.id}-thumbnail.png is ${formatSize(r.outputBytes)} ` +
          `(>= ${WARN_KB} KB target).`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
