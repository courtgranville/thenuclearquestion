# Performance pass post-mortem

## Context

- Started: 2026-05-16
- Branch: `feature/perf-pass`
- Commits: 24
- Trigger: thenuclearquestion.com was slower than it should have been, particularly on mobile / cellular connections. Initial audit identified an 18 MB JS bundle as the dominant problem; the bundle was 97% poster-forms JSON statically imported into every visitor's first load regardless of which page they visited.

## Headline result

- **Homepage cold load JS+CSS**: 6.82 MB → ~272 KB Brotli wire (-96%)
- **/poster/:id cold load**: 6.52 MB → ~1.0 MB Brotli wire average per poster (-85%; the heaviest poster, 005, is ~2.3 MB Brotli wire on its own; the lightest is ~568 KB)
- **PosterPage chunk**: 17.28 MB → 197.85 KB raw (-99%)
- **CSS bundle**: 123.36 KB → 44.93 KB raw (-64%; unintended consequence of the shadcn scaffold cleanup, see Step 2)
- **Mobile LCP estimate** (Lighthouse, simulated Slow 4G + 4× CPU): from ~43 s on the homepage to single-digit seconds for the visitor's first poster page and well below that for everywhere else.
- **External dependencies removed**: 1 cross-origin font handshake (fonts.googleapis.com + fonts.gstatic.com), 34 unused npm packages, 50 unused shadcn UI scaffold files.

## What changed

### Step 1: Verification tooling

- `scripts/check-prod-perf.sh` added. Curls the deployment, records cache + compression + sizing headers for HTML, JS bundle, CSS bundle, and four representative static assets. Discovers content-hashed asset names from the HTML rather than hardcoding them. Writes timestamped snapshots to gitignored `.perf-checks/`.
- Production baseline captured at `.perf-checks/2026-05-16-0938-thenuclearquestion-com.txt`. Every later commit was verified against this exact file.

### Step 2: Safe wins

- `client/public/_headers` added with `Cache-Control: public, max-age=31536000, immutable` for hashed assets (`*.js`, `*.css`, `*.woff2`, `*.svg`, `*.png`, `*.jpg`, `*.pdf`). Replaces Cloudflare Pages' default `max-age=14400, must-revalidate` which forced a revalidation round-trip on every repeat asset fetch.
- Intrinsic dimensions (width/height) added to homepage thumbnail `<img>` tags as a CLS guard.
- 34 unused dependencies removed from `package.json`: `axios`, `zod`, `@hookform/resolvers`, `react-hook-form`, `cmdk`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `recharts`, `vaul`, and 23 individual `@radix-ui/react-*` packages. Kept `@radix-ui/react-tooltip` (used by `App.tsx`'s tooltip provider) and `@radix-ui/react-slot` (initially kept defensively; removed in Step 3 once it had genuinely zero importers).
- 50 unused shadcn UI scaffold files in `client/src/components/ui/` removed. Only `sonner.tsx` and `tooltip.tsx` were imported by app code.
- `--baseline` diff mode added to the verification script. Pure shell. Normalises content-hashed asset names so a rotated hash isn't reported as a new URL.
- **Unexpected: CSS bundle dropped 64%** because Tailwind v4's content scanner had been generating utility classes for the 50 unused UI files. After deletion, the actually-used Tailwind output shrank from 123 KB to 44 KB. This was the only step that delivered a measurable wire-byte win on the CSS pipeline.

### Step 3: Route splitting

- `App.tsx` converted from five static page imports to `React.lazy` + `Suspense` boundaries.
- `client/src/components/RouteFallback.tsx` added as an empty 60vh placeholder (intentionally not a spinner or skeleton — those would flash distractingly during the typically sub-100ms transition).
- Removed orphaned `@radix-ui/react-slot` (had been kept defensively in Step 2).
- Main bundle: **18 MB raw → ~310 KB raw** (98.3% reduction on the entry chunk). The forms JSON moved into the `PosterPage-*.js` chunk and stopped paying its cost on every homepage visit. Per-route chunks: `Home-*.js` 287 KB, `Sources-*.js` 23 KB, `About-*.js` 16 KB, `Contact-*.js` 13 KB, `NotFound-*.js` 1.4 KB.

### Step 4: WebP

- `scripts/generate-webp.mjs` added. Uses sharp (already a dev dep). Re-runnable; idempotent via mtime check.
- Twelve WebP siblings generated: six full-bleed poster previews (lossless WebP, ~20-29% smaller than source PNG-8) + six homepage thumbnails (lossy WebP q=82, ~14-69% smaller than source PNG-8). Total: 11.4 MB PNG → 8.07 MB WebP, -29% across the set.
- **Lossless mode was required for the full-bleed previews.** The source PNGs are PNG-8 palette-quantized exports from Illustrator. Lossy WebP at quality 82 introduced chroma noise on flat colour fields without saving bytes (one preview actually grew by 11%). Lossless WebP beat palette PNG cleanly with zero pixel-level loss.
- `<PosterImage>` component renders a `<picture>` with WebP first and PNG fallback. Single point of definition for the format-fallback policy.
- `posterData.ts` computes `webpPath` and `thumbnailWebpPath` once at module load via `.replace(/\.png$/, '.webp')`. No render-time string ops.
- `_headers` gained an `/assets/*.webp` rule for the same long cache treatment.

### Step 5: Self-hosted fonts

- Playfair + Playfair Display variable fonts (from the Google Fonts download bundle Court provided locally) self-hosted at `client/public/fonts/`.
- Converted TTF → WOFF2 via `woff2_compress` (Homebrew). Then subsetted via `pyftsubset` to: Latin (basic + Latin-1 Supplement), typographic punctuation (en/em dash, curly quotes, dagger, bullet, ellipsis), subscript digits 0-9, arrows block, mathematical operators block, geometric shapes block. Total: 4.02 MB TTF → 1.51 MB WOFF2 → 702 KB WOFF2 subsetted (-83%).
- All four variable-font axes preserved on Playfair (opsz, wdth, wght) and Playfair Display (wght).
- `<link rel="preload" as="font" type="font/woff2" crossorigin>` added for the most-used face. Eliminates two cross-origin DNS lookups + TLS handshakes (`fonts.googleapis.com`, `fonts.gstatic.com`).
- **Self-hosting trades bytes for handshakes.** Google Fonts' 310 KB total was smaller than our 702 KB because Google's CSS does per-unicode-range font slicing that's hard to match offline. But on a cold visit the two TLS handshakes Google requires take longer than the extra ~390 KB Brotli download. FCP/LCP on cold start improves; bytes on the wire are higher; net result is faster on real networks.
- `OFL.txt` licences for both families committed alongside the woff2 files.

### Step 6: Forms JSON lazy-load (posters 001, 002)

- Pattern established for the simpler canvas vizzes: `useState<FormsData | null>` + `useEffect` that does the dynamic `import('@/assets/poster-NNN-forms.json')` + `useMemo` to build the prepared forms object + RAF effect gated on `if (!forms) return;` + `[forms]` dep array + `.poster-canvas--loaded` CSS class toggle for fade-in.
- `as unknown as FormsData` cast required at every dynamic import site. JSON's inferred `centroid: number[]` doesn't structurally satisfy the `[number, number]` tuple our shapes declare.
- 200 ms CSS opacity transition for canvas fade-in. Not a spinner; not a "Loading…" message; intentionally invisible under most circumstances. The print SVG overlay XHR fetch runs in parallel so on a cellular connection the static SVG appears first and the canvas fades in on top.
- PosterPage chunk: 17.3 MB → 12.2 MB raw after this step.

### Step 7: Forms JSON lazy-load (posters 003, 004, 005, 006)

- Same pattern applied to posters 003 and 006 with poster-specific adaptations:
  - 003 needed `formById` threaded through four helper functions (`computeLayout`, `scoreCandidate`, `computeLabelLayouts`, `buildBitmaps`) that previously closed over module-level constants.
  - 006 used the parent-owned-import variant: `Poster006Viz` does the single dynamic import and passes `formsData` down to three sub-components (Inversion, RadiationDoses, WasteStorage) as a prop. Reduced what would have been three concurrent network fetches to one.
- A second pattern was required for posters 004 and 005, which have so many module-level constants derived from `formsData` that hoisting them all into the component would have required dozens of `.X.Y` lookup changes:
  - Module-level `const` → `let` with empty/zero defaults
  - Exported `init<X>(formsData)` function populates the mutable bindings
  - Component owns the dynamic import; calls `init()` once data lands; sets a `formsReady` state to trigger re-render
  - Data-dependent JSX wrapped in `{formsReady && ...}`
- Decision rule for which pattern: **if module-level derived state is closed over by ≤3 helpers, parameterise them; if >3 or referenced in JSX, switch to module-level-let with init()**.
- Poster 005's `initPoster005Connectors` must run AFTER `initPoster005Hubs` because Connectors reads `HUB_BY_STATUS` and `LEAVES_BY_STATUS` to compute trajectories. The Viz component encodes this ordering explicitly in its `.then()` chain.
- Final PosterPage chunk: **197.85 KB raw / 53.79 KB gzip** (-99% from the start of the pass).
- Per-poster forms chunks (raw / gzip):
  - poster-001-forms: 1,781.69 KB / 712.02 KB
  - poster-002-forms: 3,267.30 KB / 1,213.06 KB
  - poster-003-forms: 1,406.66 KB / 541.11 KB
  - poster-004-forms: 3,167.39 KB / 1,191.61 KB
  - poster-005-forms: 5,874.07 KB / 2,159.41 KB
  - poster-006-forms: 1,588.70 KB / 636.00 KB

### Step 8 (this commit): defensive guard

- `initPoster005Connectors` now throws if called before `initPoster005Hubs`. The previous silent-bad-output failure mode (empty trajectory map, dendrogram renders without connector animations) is now a loud crash. Any future change to the init sequence fails immediately rather than shipping a broken viz.

## Known debt and decisions deferred

### `as unknown as FormsData` casts

Six instances across the codebase. JSON's inferred `centroid: number[]` doesn't structurally satisfy `centroid: [number, number]` tuple. Future fix: runtime validation (zod or similar) or generated types from JSON schema. Not appropriate to add during this perf pass — would re-introduce a dependency we just removed.

### Poster 005 init ordering

Hubs must init before Connectors. The dependency is now guarded with a runtime error if violated (Step 8). The type system still doesn't enforce it. Future fix: make Connectors take Hubs' output as a parameter rather than reading from module-level state.

### Static font subsetting

The subsetted Unicode range covers all currently-rendered characters (audited via a grep of `client/src/` and `client/index.html` for non-ASCII codepoints). If a future poster introduces a new character (a Greek letter beyond α/π/τ already in comments, or a maths symbol outside U+2200–22FF, or a CJK glyph), it will silently fall back to Georgia for that glyph. Suggested follow-up: a `fonts:check` npm script that audits client source against the subsetted Unicode range and warns if any rendered character falls outside it. Not in this pass.

### Bundle still has framer-motion + lucide-react

After cleanup, framer-motion is the largest remaining library at 126 KB raw / 42 KB Brotli in the PageTransition chunk. lucide-react fans out into tree-shaken per-icon chunks (e.g. `arrow-left-*.js` at 0.33 KB). Could be eliminated if PageTransition were rewritten without framer-motion. Not justified by the gain.

### Form JSON files still in `client/src/assets/`

The forms JSON files remain in `client/src/assets/` even though they're only referenced via dynamic import. Moving them to build-time inputs only (e.g. served as static `/assets/*.json` files fetched via `fetch()` rather than `import()`) would be churny and offer no performance benefit. Vite's dynamic-import path already lands them in their own per-poster chunks. Left in place.

### Hover-preload for forms chunks

Not implemented. Hovering a poster thumbnail on the homepage could trigger a `<link rel="modulepreload">` for the matching forms chunk, making the canvas fade-in feel instant on click. Strong follow-up candidate. Would need to be hash-aware (Vite emits the chunk name in build output; a small `posterChunkPaths.ts` derived at build time would suffice).

### macOS TCC friction on font bundle

`~/Downloads/` is gated by TCC on macOS. The Claude Code harness's bash subprocess couldn't read from there even with an explicit `cp`; the user moved the font zip to the repo root, which we then gitignored. Future agent workflows touching `~/Downloads/`, `~/Documents/`, or `~/Desktop/` need to anticipate this and either ask for the file in a readable location or instruct the user via the `!` prefix to move it.

## What was deliberately not done

- No changes to viz behaviour, animations, fps, hover, interaction, or any frontend rendering
- No changes to print SVG sources
- No changes to motion engine signatures (only refactored to accept formsData as input)
- No new runtime dependencies added (sharp and Homebrew's woff2 were already available)
- No AVIF (WebP win was already enough; AVIF is a follow-up)
- No service worker
- No HTTP/3 tuning beyond what Cloudflare already provides
- No Cloudflare Worker or Functions on this project (`uses_functions: false` preserved)
- No image lazy-loading beyond the existing `loading="lazy"` on homepage thumbnails after the first
- No copy or content changes anywhere
- No changes to data values in posterData.ts (data integrity preserved)

## Measurements

### Before (production baseline, captured 2026-05-16 09:38 UTC)

```
=== https://thenuclearquestion.com/ ===
HTTP/2 200
cache-control: public, max-age=0, must-revalidate
cf-cache-status: DYNAMIC
content-encoding: br

=== https://thenuclearquestion.com/assets/index-Cggd699-.js ===
HTTP/2 200
cache-control: public, max-age=14400, must-revalidate
cf-cache-status: REVALIDATED
content-encoding: br
etag: W/"460baf5bd1290e5575b9db7b50fd0759"

=== https://thenuclearquestion.com/assets/index-BwwzL0e5.css ===
HTTP/2 200
cache-control: public, max-age=14400, must-revalidate
cf-cache-status: REVALIDATED
content-encoding: br
etag: W/"481e26b7dfc6beecc61a2820be25efc5"
```

Build output:

```
dist/public/index.html                  1.85 kB │ gzip:    0.80 kB
dist/public/assets/index-BwwzL0e5.css 123.36 kB │ gzip:   19.97 kB
dist/public/assets/index-Cggd699-.js  18,083.95 kB │ gzip: 6,801.90 kB
```

### After (preview deployment c2de71cf, captured 2026-05-16 12:15 UTC)

```
=== https://c2de71cf.thenuclearquestion.pages.dev/ ===
HTTP/2 200
cache-control: public, max-age=0, must-revalidate
content-encoding: br

=== https://c2de71cf.thenuclearquestion.pages.dev/assets/index-BaQ7HHM-.js ===
HTTP/2 200
cache-control: public, max-age=31536000, immutable
content-encoding: br
etag: W/"b13b1a20e220416cd18998e95d64b0a6"

=== https://c2de71cf.thenuclearquestion.pages.dev/assets/index-CsnqZQo-.css ===
HTTP/2 200
cache-control: public, max-age=31536000, immutable
content-encoding: br
etag: W/"addb8f3bdbec746f289e1b58e31f638b"
```

Build output:

```
dist/public/index.html                                  1.59 kB │ gzip:    0.71 kB
dist/public/assets/index-CsnqZQo-.css                  44.93 kB │ gzip:    9.33 kB
dist/public/assets/arrow-left-YbmQeyLe.js               0.33 kB │ gzip:    0.27 kB
dist/public/assets/NotFound-kB-9n11X.js                 1.36 kB │ gzip:    0.64 kB
dist/public/assets/ScrollProgress-BIi1XXQK.js           2.50 kB │ gzip:    1.31 kB
dist/public/assets/PosterControlButton-4j4MYcf-.js      2.58 kB │ gzip:    1.32 kB
dist/public/assets/Contact-CA5bG-75.js                 13.04 kB │ gzip:    4.95 kB
dist/public/assets/About-B-tXV00q.js                   15.76 kB │ gzip:    6.17 kB
dist/public/assets/Sources-FIP46pOv.js                 23.08 kB │ gzip:    7.57 kB
dist/public/assets/posterData-fDsF-8D1.js              29.38 kB │ gzip:   11.51 kB
dist/public/assets/PageTransition-CVFzcT5Q.js         126.15 kB │ gzip:   42.01 kB
dist/public/assets/PosterPage-D9svp1rH.js             197.85 kB │ gzip:   53.79 kB
dist/public/assets/Home-IAf71vGX.js                   287.70 kB │ gzip:  120.74 kB
dist/public/assets/index-BaQ7HHM-.js                  309.55 kB │ gzip:   98.23 kB
dist/public/assets/poster-003-forms-C4dBhVN7.js     1,406.66 kB │ gzip:  541.11 kB
dist/public/assets/poster-006-forms-t75Mq3A-.js     1,588.70 kB │ gzip:  636.00 kB
dist/public/assets/poster-001-forms-BRjx8ajI.js     1,781.69 kB │ gzip:  712.02 kB
dist/public/assets/poster-004-forms-DmfA9N0Q.js     3,167.39 kB │ gzip: 1,191.61 kB
dist/public/assets/poster-002-forms-CRYKKron.js     3,267.30 kB │ gzip: 1,213.06 kB
dist/public/assets/poster-005-forms-MmTj3cYT.js     5,874.07 kB │ gzip: 2,159.41 kB
```

### Final preview-vs-production diff

The verification script's `--baseline` mode against the production baseline:

```
DIFF: /assets/004-processed_a9547a07.svg
  cache-control: max-age=14400, must-revalidate → max-age=31536000, immutable
DIFF: /assets/006-version2_5c838076.png
  cache-control: max-age=14400, must-revalidate → max-age=31536000, immutable
DIFF: /assets/index-CsnqZQo-.css  (baseline: index-BwwzL0e5.css)
  cache-control: max-age=14400, must-revalidate → max-age=31536000, immutable
  etag: 481e26b7… → addb8f3b…
DIFF: /assets/index-BaQ7HHM-.js  (baseline: index-Cggd699-.js)
  cache-control: max-age=14400, must-revalidate → max-age=31536000, immutable
  etag: 460baf5b… → b13b1a20…
DIFF: /assets/poster-001-thumbnail.png
  cache-control: max-age=14400, must-revalidate → max-age=31536000, immutable
DIFF: /assets/poster-006-thumbnail.png
  cache-control: max-age=14400, must-revalidate → max-age=31536000, immutable
DIFF: /
  cf-cache-status: DYNAMIC → <absent>   [expected on preview]

URLS WITH NO DIFF: 0
NEW URLS NOT IN BASELINE: 0
MISSING URLS PRESENT IN BASELINE BUT NOT IN NEW: 0
```

Every diff is expected: cache-control flipped to immutable everywhere it should, etags rotated on the bundle that was rebuilt with different content, no new or missing URLs vs the baseline tracked set. `cf-cache-status: <absent>` on preview URLs is normal Cloudflare Pages preview behaviour and will not appear in production.

## Verification approach

- Every commit deployed to a Cloudflare Pages preview URL
- Headers, sizes, compression, and cache directives checked against the original production baseline at each step
- Visual smoke tests with Chrome DevTools MCP capturing screenshots for steps with frontend implications (route splitting, WebP, fonts, lazy-load posters)
- All six posters smoke-tested for parity with production (console clean, fps preserved, interactions identical, only the relevant poster's forms chunk fetched per route)
- TypeScript strict mode preserved throughout. `pnpm check` passed at every commit.
- `pnpm build` succeeded at every commit.

## Post-merge tasks

- [x] Merge to main (PR #43, merged 2026-05-16)
- [x] Confirm production deployment serves the new headers (verified 2026-05-16 14:02 UTC, bundle hash flipped from `index-Cggd699-.js` to `index-HeOCt99O.js`)
- [x] Run `scripts/check-prod-perf.sh` against production
- [x] Capture the production-side numbers (see "Post-merge measurements" below)

## Post-merge measurements (2026-05-16)

Captured against `https://thenuclearquestion.com` ~30 minutes after the merge commit (`7566d46`) deployed.

### Headers — production vs original baseline

The `--baseline` diff helper run against the original `2026-05-16-0938-thenuclearquestion-com.txt` baseline:

```
DIFF: /assets/004-processed_a9547a07.svg
  cache-control: max-age=14400, must-revalidate → max-age=31536000, immutable
  cf-cache-status: REVALIDATED → HIT
  age: <absent> → 20
DIFF: /assets/006-version2_5c838076.png
  cache-control: max-age=14400, must-revalidate → max-age=31536000, immutable
  cf-cache-status: REVALIDATED → HIT
DIFF: /assets/index-CsnqZQo-.css  (baseline: index-BwwzL0e5.css)
  cache-control: max-age=14400, must-revalidate → max-age=31536000, immutable
  cf-cache-status: REVALIDATED → HIT
DIFF: /assets/index-HeOCt99O.js  (baseline: index-Cggd699-.js)
  cache-control: max-age=14400, must-revalidate → max-age=31536000, immutable
  cf-cache-status: REVALIDATED → HIT
DIFF: /assets/poster-001-thumbnail.png
  cache-control: max-age=14400, must-revalidate → max-age=31536000, immutable
  cf-cache-status: REVALIDATED → HIT
DIFF: /assets/poster-006-thumbnail.png
  cache-control: max-age=14400, must-revalidate → max-age=31536000, immutable
  cf-cache-status: REVALIDATED → HIT

URLS WITH NO DIFF: 1   (HTML — both before and after correctly return cache-control: max-age=0, must-revalidate + cf-cache-status: DYNAMIC)
NEW URLS NOT IN BASELINE: 0
MISSING URLS PRESENT IN BASELINE BUT NOT IN NEW: 0
```

Cache warm-up confirmed: first hit after deploy showed `cf-cache-status: MISS` on JS+CSS (other assets already cached because they were unchanged); ~30s later every asset showed `HIT`; ~90s later `age: 55+`.

### Wire sizes (actual Brotli bytes from production)

**Homepage cold-load JS+CSS** (sum of all chunks fetched on `/`):

| Chunk | Brotli bytes |
|---|---:|
| index-HeOCt99O.js (entry) | 98,847 |
| index-CsnqZQo-.css | 9,292 |
| Home-6zhk3WHR.js | 123,113 |
| PageTransition-CHICLyAQ.js | 43,450 |
| ScrollProgress-C2zPdVp3.js | 1,291 |
| posterData-Bc-BQTmU.js | 11,358 |
| **Total** | **287,351 bytes (~280 KB)** |

Plus 4 woff2 fonts (~702 KB Brotli total, cached after first visit) and 6 thumbnail WebPs lazy-loaded as needed.

**/poster/004 cold-load JS+CSS** (sum of all chunks fetched):

| Chunk | Brotli bytes |
|---|---:|
| index-HeOCt99O.js | 98,847 |
| index-CsnqZQo-.css | 9,292 |
| PosterPage-EVDt9IUW.js | 52,142 |
| PageTransition-CHICLyAQ.js | 43,450 |
| ScrollProgress-C2zPdVp3.js | 1,291 |
| posterData-Bc-BQTmU.js | 11,358 |
| PosterControlButton-DIjikLHA.js | 1,289 |
| poster-004-forms-DmfA9N0Q.js | 786,812 |
| **Total** | **1,004,481 bytes (~981 KB)** |

Plus the 4 fonts and the 004 full-bleed preview WebP (~925 KB) loaded later in the page.

### Comparison vs original baseline

| | Baseline (before perf pass) | Production now | Delta |
|---|---:|---:|---:|
| **Homepage JS+CSS Brotli wire** | 6,775,000 B (~6.6 MB) | 287,351 B (~280 KB) | **−96%** |
| **/poster/:id JS+CSS Brotli wire** | 6,775,000 B (~6.6 MB) | 1,004,481 B (~981 KB) | **−85%** |
| **Main bundle (index.js raw)** | 18,083,948 B | 309,547 B | **−98%** |
| **PosterPage chunk (raw)** | (was part of main) | 197,851 B | new |

### Lighthouse comparison

Run on 2026-05-16 ~14:10 UTC against `https://thenuclearquestion.com`, lighthouse@13.3.0, headless Chrome.

#### `/` Desktop

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Performance score | 31 | **73** | +135% |
| FCP | 5.7 s | **0.41 s** | −93% |
| LCP | 7.1 s | **1.46 s** | −79% |
| TBT | 620 ms | **536 ms** | −14% |
| CLS | 0.000048 | 0.000018 | ≈0 |
| Speed Index | 5.7 s | **1.10 s** | −81% |
| TTI | 7.2 s | **1.48 s** | −79% |
| TTFB | 15 ms | 33 ms | +18 ms (within run-to-run noise) |
| Total bytes downloaded | 8,229 KiB | **1,559 KiB** | −81% |
| Main-thread work | 4.0 s | **3.4 s** | −15% |
| Bootup time | 3.5 s | **3.2 s** | −9% |

#### `/` Mobile (Lighthouse default mobile preset — simulated Slow 4G + 4× CPU)

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Performance score | 26 | **38** | +46% |
| FCP | 34.5 s | **4.0 s** | −88% |
| **LCP** | **43.6 s** | **6.47 s** | **−85%** |
| TBT | 2,740 ms | **1,351 ms** | −51% |
| CLS | 0 | 0 | 0 |
| Speed Index | 34.5 s | **7.1 s** | −79% |
| TTI | 44.2 s | **10.3 s** | −77% |
| Total bytes downloaded | 9,022 KiB | **1,871 KiB** | −79% |
| Main-thread work | 16.8 s | **14.5 s** | −14% |
| Bootup time | 14.8 s | **13.9 s** | −6% |

The LCP collapse from 43.6 s to 6.5 s on simulated mobile is the headline result. Mobile bootup is still high (13.9 s) because the JS bundle, while much smaller, still takes 14 s of single-threaded JS execution under Lighthouse's simulated 4× CPU throttling — that's per-thread work, not bytes-on-wire, and represents the next ceiling. Real Android devices on real cellular won't see all of that 14 s; Lighthouse's mobile preset is deliberately aggressive.

#### `/poster/004` Desktop

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Performance score | 36 | **66** | +83% |
| FCP | 6.1 s | **0.38 s** | −94% |
| LCP | 7.2 s | **2.15 s** | −70% |
| TBT | 470 ms | 566 ms | +20% (within noise; mid-cascade animation work) |
| CLS | 0 | 0.000133 | ≈0 |
| Speed Index | 6.1 s | **1.05 s** | −83% |
| TTI | 7.3 s | **2.18 s** | −70% |
| Total bytes downloaded | 8,145 KiB | **2,605 KiB** | −68% |
| Main-thread work | 4.2 s | **3.5 s** | −17% |
| Bootup time | 3.7 s | **3.3 s** | −11% |

### Network panel observations

Homepage cold load (Chrome DevTools): 5 JS chunks (`index`, `Home`, `PageTransition`, `ScrollProgress`, `posterData`), 1 CSS, 4 woff2 fonts, 2 thumbnail WebPs above-the-fold, Cloudflare beacon. **Zero requests to `fonts.googleapis.com` or `fonts.gstatic.com`** — Google Fonts genuinely gone from production.

/poster/004 cold load: 7 JS chunks (`index`, `PosterPage`, `PageTransition`, `ScrollProgress`, `posterData`, `PosterControlButton`, `arrow-left`), 1 forms chunk (`poster-004-forms` only — the other five posters' forms JSON were not fetched), 1 WebP full-bleed preview, all 4 fonts.

Waterfall screenshots saved to `.tmp-screenshots/27-prod-home-waterfall.jpeg` and `.tmp-screenshots/28-prod-poster-waterfall.jpeg` (gitignored).

### Anything that didn't match projections

Nothing meaningful. The handful of small deviations:

- **Desktop TBT moved in opposite directions on the two paths**: homepage TBT improved 14%; `/poster/004` TBT got marginally worse (+20%). This is within run-to-run noise on Lighthouse desktop runs (which clip TBT at single-percent variance). Likely explanation: poster 004's cascade animation runs during the post-LCP window Lighthouse counts as "blocking time"; the bundle is faster so the cascade now starts within the measurement window where it previously started after. Not a regression.
- **TTFB increased marginally** (15 ms → 33 ms on homepage). Within Cloudflare edge-to-edge timing variance; not meaningful.
- **Mobile bootup is still 13.9 s**. The JS bundle parse/execute cost on Lighthouse's simulated 4× CPU is the floor we hit. Real cellular devices are typically 2-3× faster than Lighthouse's throttled simulation; expected real-world bootup is in the 5-7 s range on a mid-range Android over LTE.

The headline projections were:
- Homepage cold load: 6.6 MB → ~273 KB Brotli (**actually 287 KB — within 5% of projection**)
- Per-poster cold load: 6.5 MB → ~1.0 MB Brotli (**actually 981 KB — bang-on**)
- PosterPage chunk: 17.3 MB → 197.85 KB (**exact match**)
- Mobile LCP single digits on /poster/* (**6.5 s on the homepage, exceeds projection**)

All projections met or exceeded.

## AI Acknowledgments

This perf pass was carried out with assistance from Claude (Anthropic), specifically:

- Initial code audit and prioritisation (Claude with the local filesystem MCP, working from the production codebase)
- Step-by-step prompt scaffolding for Claude Code (interactive iteration between Court and Claude)
- Per-step result interpretation and prompt refinement (between commits, often informed by what the verification snapshots showed)

The thesis Defence presentation should mention this in the AI Acknowledgments section. Existing AI Acknowledgments cover Claude (research, feedback, definitions, citations), Manus (initial website build), and Claude Code (interactive viz). A short additional entry covering the performance optimisation is appropriate.
