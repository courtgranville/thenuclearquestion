# The Nuclear Question — Project Context

This file provides persistent context for Claude Code working in this repo. It is read automatically when Claude Code is launched here.

## What this project is

The website for **The Nuclear Question** — Court Granville's Bachelor in Design undergraduate thesis at IE University Madrid, supervised by Professor Kaleb Cardenas Zavala. Defence is end of May 2026.

The thesis question: *How can design be used to discuss the feasibility of a nuclear-powered future?*

The thesis argues:
1. Nuclear is likely necessary for UK decarbonisation, though insufficient alone.
2. Public communication about nuclear has systematically failed — industry has been defensive, opposition has relied on fearmongering, and both have failed a public whose risk perception is shaped more by emotion than statistics.
3. There is an emerging design role between industry and activism — the *epistemic facilitator* / *truth-teller* — that creates conditions for the public to reason independently.

The website is the public-facing artefact of the design intervention: a series of six data-visualisation posters with interactive web versions, an About page, a Sources page, and a Contact page.

## What this codebase is

A Vite + React + TypeScript single-page application. Originally hosted on Manus; in May 2026 migrated to self-hosted assets (assets in `client/public/assets/`) and Cloudflare Pages.

Key paths:
- `client/src/components/Poster00XViz.tsx` — the interactive viz components for each poster
- `client/src/lib/posterData.ts` — canonical poster metadata (titles, descriptions, methodology, image paths)
- `client/src/lib/vizConfigs.ts` — interactive region configuration for posters 005 and 006
- `client/public/assets/` — all SVG, PNG, and PDF assets, with original Manus filenames preserved
- `client/src/pages/` — the page-level routes (Home, About, Sources, Contact, PosterPage)

## Visual language (locked)

Background `#ECE7DF` cream, text `#0D1A1E` dark.
Poster accent palette: blue `#1c3867`, green `#217b3d`, red `#a51e22`, ochre `#b5822e`, teal `#4a6e70`, stone `#7d736a`.
Typography: Source Serif 4 (titles/body), DM Sans (UI/stats), IBM Plex Mono (data/citations).
Illustration style: hand-drawn organic forms (Procreate), composited in Illustrator.

## Voice and writing

Court's writing voice — applied to body copy across the site — is direct, honest, rigorous, UK English. Long flowing sentences with multiple clauses. Thinking-aloud quality. Signature phrases: "this demonstrates that", "the implications for", "further to this", "thus", "which means". Intentionally imperfect rather than polished.

When drafting any prose for the site, match this voice. Avoid mechanical formality and AI-detection patterns — the supervisor flagged AI-detection on previous milestones, so anything Claude writes for body copy should sound like a human draft, not a paraphrased model output.

## Data correctness obligations

The thesis argument rests on intellectual integrity. Data on the site must match:
1. The data on the printed poster artwork
2. The canonical Google Sheet workbook (ID `1zeLXEzm6MX35-OB3CAGxA4_vW6ED4FSeFdGCL1XTV0A`)

Where these three places (printed poster, workbook, website) disagree, the website is wrong by definition. Cross-reference any data change against both the artwork and the workbook before committing.

Specific corrections that have been identified and may or may not be applied yet:
- Poster 001: 6 of 9 emissions values were wrong; correct values match the printed poster
- Poster 002: units and values entirely wrong; should be `m²·year/MWh` and `m³/MWh` (UNECE convention), with hydropower having LOWEST water consumption
- Poster 004: Heat (14 TWh) and Solid Fuel (20 TWh) values swapped; methodology cites wrong DUKES tables
- Poster 006: Sellafield share discrepancy (72.4% vs 78.4%) needs resolving against NDA inventory; LLW/ILW SVG ID swap to verify

If working on poster data, refer to `poster-interactives-corrections.md` (if present in the project) or ask Court for the canonical numbers.

## Editorial principles

The site enacts the *epistemic facilitator* commitment of the thesis. This means:
- **Methodology and weakness are declared honestly.** Every poster's methodology block names what the data can and cannot tell us. Don't soften these.
- **Sources are verifiable.** The Sources page links every claim back to its origin. Don't introduce factual claims that aren't sourceable.
- **Body copy is short and disciplined.** Poster body copy targets 75–110 words. Annotation should point at specific features; body should confirm and extend the spatial argument, not describe it.
- **Truth-teller framing over advocacy.** Don't write copy that argues *for* nuclear. Present evidence neutrally with honest caveats. The survey research validates that this framing outperforms both industry reassurance and activist opposition.

## Project housekeeping

- All commits use the `migration/<feature>` branch convention while the migration is in progress
- The `main` branch is what's deployed live; never push directly to `main` without testing
- `pnpm` (not `npm` or `yarn`) is the package manager; the lockfile is `pnpm-lock.yaml`
- Build output goes to `dist/public/` (not `dist/`) — this is set in `vite.config.ts`

## Things that are NOT this project

If asked about anything that doesn't fit the above — a different design project, a different thesis, generic web development questions unrelated to this repo — Claude Code should answer normally without applying this project context.
