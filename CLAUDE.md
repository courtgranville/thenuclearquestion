# The Nuclear Question — Project Context

This file provides persistent context for AI assistants working on this repo. Claude Code reads it automatically when launched in this directory. Claude Desktop sessions using the local filesystem MCP connector should also read this file before making changes.

## What this project is

The website for The Nuclear Question — Court Granville's Bachelor in Design undergraduate thesis at IE University Madrid, supervised by Professor Kaleb Cardenas Zavala. The written thesis was submitted on 6 May 2026 and is locked. Defence is on 21 May 2026. The window for website iteration is short and the production environment is live; treat both as constraints.

The thesis question: How can design be used to discuss the feasibility of a nuclear-powered future?

The website is the public-facing artefact of the design intervention: a series of six data-visualisation posters with interactive web versions, an About page, a Sources page, and a Contact page that doubles as a portfolio surface.

## What this codebase is

A Vite + React + TypeScript single-page application. Self-hosted on Cloudflare Pages with all assets in `client/public/assets/`. Originally built on Manus and migrated to this repository in May 2026; original Manus filenames are preserved in the asset paths.

### Key paths

- `client/src/components/` — flat list of components, no per-poster subfolders
  - `Poster001Viz.tsx`, `Poster001CanvasViz.tsx`, `Poster001Legend.tsx`
  - `Poster002Viz.tsx`, `Poster002CanvasViz.tsx`, `Poster002Legend.tsx`
  - `Poster003Viz.tsx` + `Poster003Slider.tsx`, `Poster003Dots.tsx`, `Poster003Dendrogram.tsx`, `Poster003CanvasDeaths.tsx`, `Poster003Ticker.tsx`, `Poster003Legend.tsx`
  - `Poster004CanvasViz.tsx` + `Poster004Legend.tsx`
  - `Poster005Viz.tsx` + `Poster005Map.tsx`, `Poster005Dendrogram.tsx`, `Poster005Timeline.tsx`, `Poster005StatusLegend.tsx`, `Poster005ReactorDetail.tsx`, `Poster005Callouts.tsx`
  - `Poster006Viz.tsx` + `Poster006WasteInversion.tsx`, `Poster006Sellafield.tsx`, `Poster006RadiationDoses.tsx`, `Poster006WasteStorage.tsx`, `Poster006Legend.tsx`
  - `NucleusHero.tsx`, `IsotopeToggle.tsx`, `IntroAnimation.tsx`, `IsotopeToggle.tsx`
  - `SiteHeader.tsx`, `SiteFooter.tsx`, `PageTransition.tsx`, `ScrollProgress.tsx`, `ErrorBoundary.tsx`
  - `InteractiveSVG.tsx` — legacy helper, still used by older poster components

- `client/src/lib/` — flat list, no per-poster subfolders
  - `posterData.ts` — canonical poster metadata (titles, descriptions, methodology, image paths)
  - `parseSvg.ts` — polyline preparation for canvas rendering
  - `posterMotion.ts` — TUNING constants and motion resolution shared by every canvas viz
  - `posterMotionLiquid.ts` — variant for poster 002 water/land forms
  - `fission.ts` — homepage U-238 split sequence state
  - `particles.ts` — homepage particle effects
  - `poster003Data.ts`, `poster003Store.ts`, `poster003Data.test.ts` — poster 003 specifics
  - `poster004State.ts`, `poster004Engine.ts` — poster 004 form motion + pulse engine
  - `poster005Data.ts`, `poster005Store.ts` — poster 005 reactor manifest + cross-view filter/hover store
  - `utils.ts`, `vizConfigs.ts` — shared helpers

- `client/src/pages/`
  - `Home.tsx`, `About.tsx`, `Sources.tsx`, `Contact.tsx`, `PosterPage.tsx`, `NotFound.tsx`
  - `PosterPage.tsx` is the generic poster route; it reads `params.id` and dispatches to the correct `Poster00XViz` component

- `client/src/assets/` — pre-extracted form JSON used by canvas vizzes
  - `nucleus-paths.json` (homepage hero)
  - `poster-001-forms.json`, `poster-002-forms.json`, `poster-003-forms.json`, `poster-004-forms.json`, `poster-005-forms.json`, `poster-006-forms.json`

- `client/public/assets/` — all rendered SVG, PNG, and PDF assets

- `scripts/` — extraction scripts (`extract-poster-001-forms.mjs`, etc.) that rebuild the JSON assets from the source SVGs. Run when source SVGs change.

## Hosting and domain

- Domain registrar: GoDaddy. The domain is thenuclearquestion.com.
- Hosting: Cloudflare Pages.
- Deployment trigger: auto-deploy on push to `main`. Any commit landing on `main` ships to thenuclearquestion.com automatically — usually within 30–90 seconds. There is no manual deploy gate. Treat `main` as production.
- Package manager: pnpm. Lockfile is `pnpm-lock.yaml`. Do not use npm or yarn.
- Build output: `dist/public/` (configured in `vite.config.ts`).

## Git workflow

Default working pattern. Follow this unless Court explicitly instructs otherwise.

```bash
# 1. Start from a clean main
git checkout main
git pull origin main

# 2. Create a feature branch
git checkout -b feature/<short-desc>

# 3. Make changes, then verify what's staged
git status
git diff

# 4. Stage and commit with a clear message
git add <specific-paths>
git status
git commit -m "Imperative-mood subject line under 70 chars"

# 5. Push the feature branch
git push origin feature/<short-desc>

# 6. Court reviews on GitHub. After approval, merge via PR.
```

### Hard rules

- Never `git push origin main` directly. All changes to main go through a PR Court has reviewed.
- Never `git commit -am`. Always `git status` first to see what's staged.
- Never `git add .` without checking with `git status` first.
- Never `git push --force` to any branch without Court's explicit approval, and never to `main` under any circumstance.
- Never rebase `main` of a feature branch in a way that rewrites shared history.
- Never delete or rename branches without checking with Court.

### Branch naming

- `feature/<short-desc>` for new features and improvements
- `fix/<short-desc>` for bug fixes and corrections
- `copy/<short-desc>` for copy-only edits
- `data/<short-desc>` for data corrections to poster numbers or sources
- `docs/<short-desc>` for documentation updates

### Pre-deploy verification

Before merging any branch to `main`, verify locally:

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

If `pnpm build` fails locally, it will fail on Cloudflare. Fix it before pushing.

## Working surfaces

Two AI surfaces have access to this codebase.

**Claude Code (CLI in this directory):** can read, write, build, run dev servers, and execute git commands. Primary surface for development work.

**Claude Desktop with local filesystem MCP connector:** can read and write files but typically does not run commands. Appropriate for copy edits, content changes, reviewing component logic, drafting. Court still runs the git sequence himself after Claude Desktop writes.

## Visual language (locked)

- Background `#ECE7DF` cream; text `#0D1A1E` dark.
- Poster accent palette: blue `#1c3867`, green `#217b3d`, red `#a51e22`, ochre `#b5822e`, teal `#4a6e70`, stone `#7d736a`.
- Typography: **Playfair Display** (titles) and **Playfair** (body, labels, data, UI). The site has been fully migrated to Playfair-only. Do not introduce Source Serif 4, DM Sans, IBM Plex Mono, or any other typeface.
- Illustration style: hand-drawn organic forms (Procreate), composited in Illustrator.

The visual system is the same as the printed posters and the thesis document. Default to staying within this system unless Court explicitly opens it to revision.

## Canonical interactive patterns

The site has converged on a small set of interactive patterns. Inherit from these; don't reinvent.

**Pattern A — Canvas + stripped-SVG overlay** (organic forms with breathing, cursor magnetism, optional pulse).
Reference implementations: `NucleusHero.tsx`, `Poster001CanvasViz.tsx`, `Poster002CanvasViz.tsx`, `Poster004CanvasViz.tsx`, and (in progress) the hubs in `Poster005Dendrogram.tsx`. Shared utilities live in `lib/parseSvg.ts`, `lib/posterMotion.ts`, and `lib/poster004Engine.ts` (for pulse rendering primitives — refactor out of `Poster004CanvasViz.tsx` when reusing).

**Pattern B — Hover-to-focus on injected SVG groups** (CSS-class transitions on `transform: scale()` and `opacity`).
Reference implementations: `Poster006Sellafield.tsx`, `Poster006WasteStorage.tsx`, `Poster005Map.tsx`. Memoised `InjectedDendrogram` wrapper, container-delegated `pointerover`/`pointerout`, CSS injected once into `<head>`, walks up to the nearest `g[id^="loc-"]` or `circle[data-unit]`.

**Pattern C — Pub/sub store for high-frequency cross-view state** (sliders, hover-brushing across linked views).
Reference implementations: `lib/poster003Store.ts` and `lib/poster005Store.ts`. Plain TS class, `Set<Subscriber>`, no external dependencies. Viz layers subscribe and apply state via direct DOM mutation, never through React state during interaction.

**Pattern D — SectionFrame assembly** (eyebrow + h3 + lead, multiple subsections under one poster).
Reference implementations: `Poster006Viz.tsx`, `Poster005Viz.tsx`.

Any new interactive component should map to one of these patterns. If a request seems to need something different, flag it before building.

## Voice and writing

Court's writing voice — applied to body copy across the site — is direct, honest, rigorous, UK English. Long flowing sentences with multiple clauses. Thinking-aloud quality. Signature phrases: "this demonstrates that", "the implications for", "further to this", "thus", "which means". Intentionally imperfect rather than polished.

When drafting any prose, match this voice. Avoid mechanical formality and AI-detection patterns. The supervisor flagged AI-detection on previous milestones, so anything written for body copy should sound like a human draft, not a paraphrased model output.

### Punctuation rule

The site does not use em-dashes (`—`) or en-dashes (`–`). Use the simple hyphen-minus (`-`) throughout, with spaces on either side where a dash would have been used: `Court Granville - 2026` rather than `Court Granville — 2026`. This rule applies to all new prose, all UI strings, all data labels, and all copy. Existing em-dashes and en-dashes are being swept out; do not reintroduce them.

## Data correctness obligations

The thesis argument rests on intellectual integrity. Data on the site must match:

1. The printed poster artwork.
2. The canonical Google Sheet workbook (ID `1zeLXEzm6MX35-OB3CAGxA4_vW6ED4FSeFdGCL1XTV0A`).

Where the printed poster, the workbook, and the website disagree, the website is wrong by definition. Cross-reference any data change against both the artwork and the workbook before committing.

If the workbook is missing a sheet for a poster (currently no `P005_*` sheet exists), the printed poster is the canonical reference; ask Court for new dataset provision rather than going to underlying sources without approval.

## Editorial principles

The site enacts the epistemic facilitator commitment of the thesis. This means:

- **Methodology and weakness are declared honestly.** Every poster's methodology block names what the data can and cannot tell us. Don't soften these.
- **Sources are verifiable.** The Sources page links every claim back to its origin. Don't introduce factual claims that aren't sourceable.
- **Body copy is short and disciplined.** Poster body copy targets 75–110 words. Annotation should point at specific features; body should confirm and extend the spatial argument, not describe it.
- **Truth-teller framing over advocacy.** Don't write copy that argues for nuclear. Present evidence neutrally with honest caveats.

## Typography hierarchy

The site uses a defined type scale (see `client/src/index.css`). Use these tokens rather than ad-hoc font-size declarations.

- **H1** — page title. `text-3xl lg:text-4xl`, `font-weight: 600`, Playfair Display.
- **H2** — major section title. `text-2xl`, `font-weight: 600`, Playfair Display.
- **H3** — subsection title (e.g. "Interactive Visualisation"). `text-xl`, `font-weight: 600`.
- **H4** — minor section title. `text-lg`, `font-weight: 600`.
- **Body** — `text-base` (16px), `font-weight: 300-400`, Playfair.
- **Small** — `text-sm` (14px) minimum. Used for captions, secondary info.
- **Eyebrow** — section label above H1. `text-sm tracking-[0.25em] uppercase`, accent colour.
- **Label** — UI element label. `text-sm tracking-[0.12em-0.15em] uppercase`.

**Minimum font size across the site is 14px (`text-sm`).** Court has set 10pt as the floor for legibility; 14px at the site's standard `font-size: 16px` root corresponds. Do not introduce `text-xs` (12px) anywhere.

## How AI assistants should work

- Critical collaborator, not yes-man. Honest pushback when something won't serve the work as well as an alternative.
- Surface structural issues before tactical ones. If a copy fix is requested but the real issue is the section structure, flag the structure first.
- Be honest about uncertainty, data quality, limitations. Never hide a weakness to make output look cleaner.
- Use context aggressively before asking questions. Read this file, the relevant component, and the canonical data sources before proposing changes.
- After completing any task, add a concrete "I could go further by [X]" line — a specific addition that would strengthen the work, not flattery.

## Defence-window pressure

The defence is on 21 May 2026. From now to then, the website is live and any change is visible to the supervisor and the wider audience the thesis intervention targets. Bias toward smaller, well-tested changes over ambitious refactors. If a change feels like it would benefit from more time than is available, flag it to Court and propose a smaller version.

## Things that are NOT this project

If asked about anything that doesn't fit the above — a different design project, a different thesis, generic web development questions unrelated to this repo, or edits to the written thesis document — answer normally without applying this project context. The written thesis is locked unless Court explicitly reopens it.
