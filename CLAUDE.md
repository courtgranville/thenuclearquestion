The Nuclear Question — Project Context
This file provides persistent context for AI assistants working on this repo. Claude Code reads it automatically when launched in this directory. Claude Desktop sessions using the local filesystem MCP connector should also read this file before making changes.
What this project is
The website for The Nuclear Question — Court Granville's Bachelor in Design undergraduate thesis at IE University Madrid, supervised by Professor Kaleb Cardenas Zavala. The written thesis was submitted on 6 May 2026 and is locked. Defence is on 21 May 2026. The window for website iteration is short and the production environment is live; treat both as constraints.
The thesis question: How can design be used to discuss the feasibility of a nuclear-powered future?
The thesis argues:

Nuclear is likely necessary for UK decarbonisation, though insufficient alone.
Public communication about nuclear has systematically failed — industry has been defensive, opposition has relied on fearmongering, and both have failed a public whose risk perception is shaped more by emotion than statistics.
There is an emerging design role between industry and activism — the epistemic facilitator / truth-teller — that creates conditions for the public to reason independently.

The website is the public-facing artefact of the design intervention: a series of six data-visualisation posters with interactive web versions, an About page, a Sources page, and a Contact page.
What this codebase is
A Vite + React + TypeScript single-page application. Self-hosted on Cloudflare Pages with all assets in client/public/assets/. Originally built on Manus and migrated to this repository in May 2026; original Manus filenames are preserved in the asset paths.
Key paths:

client/src/components/Poster00XViz.tsx — the interactive viz components for each poster
client/src/lib/posterData.ts — canonical poster metadata (titles, descriptions, methodology, image paths)
client/src/lib/vizConfigs.ts — interactive region configuration for posters 005 and 006
client/public/assets/ — all SVG, PNG, and PDF assets
client/src/pages/ — page-level routes (Home, About, Sources, Contact, PosterPage)

Hosting and domain

Domain registrar: GoDaddy. The domain is thenuclearquestion.com, renewable annually.
Hosting: Cloudflare Pages.
Deployment trigger: auto-deploy on push to main. Any commit landing on main ships to thenuclearquestion.com automatically — usually within 30–90 seconds. There is no manual deploy gate. Treat main as production.
Package manager: pnpm. The lockfile is pnpm-lock.yaml. Do not use npm or yarn; mixing package managers will produce inconsistent installs.
Build output: dist/public/ (configured in vite.config.ts). Not dist/. If a deploy fails, check the Cloudflare Pages dashboard for build logs before assuming the code is wrong.

Git workflow
The default working pattern. Follow this unless Court explicitly instructs otherwise:
bash# 1. Start from a clean main
git checkout main
git pull origin main

# 2. Create a feature branch (naming: feature/<short-desc>, fix/<short-desc>, copy/<short-desc>, or data/<short-desc>)
git checkout -b feature/refine-poster-001-tooltip

# 3. Make changes, then verify what's about to be committed
git status
git diff

# 4. Stage and commit with a clear message
git add <specific-paths>     # prefer specific paths over `git add .`
git status                    # confirm only intended files are staged
git commit -m "Refine poster 001 tooltip copy and hover state"

# 5. Push the feature branch
git push origin feature/refine-poster-001-tooltip

# 6. Court reviews on GitHub. After approval, merge via PR.
# Do NOT merge to main without Court's explicit approval.
Hard rules:

Never git push origin main directly. All changes to main go through a PR that Court has reviewed.
Never git commit -am. Always git status first to see what's staged.
Never git add . without checking with git status first. The repo can accumulate stray files (build artefacts, OS junk, temporary scratch files) that shouldn't be committed.
Never git push --force to any branch without Court's explicit approval, and never to main under any circumstance.
Never git rebase main of a feature branch in a way that rewrites shared history.
Never delete or rename branches without checking with Court.
If a command would change main, stop and confirm. This includes merges, rebases, and force pushes.

Branch naming convention:

feature/<short-desc> for new features and improvements
fix/<short-desc> for bug fixes and corrections
copy/<short-desc> for copy-only edits
data/<short-desc> for data corrections to poster numbers or sources

Commit message convention:
Imperative mood, short subject line (under 70 characters), describing the change concretely. "Fix poster 001 emissions values to match printed artwork" rather than "data fixes" or "updates".
Pre-deploy verification
Before merging any branch to main, verify locally:
bashpnpm install              # ensure dependencies match lockfile
pnpm dev                  # spin up the local dev server
pnpm build                # build the production bundle
pnpm preview              # preview the production build locally
If pnpm build fails locally, it will fail on Cloudflare. Fix it before pushing. If pnpm preview looks broken, the live site will look broken too.
Working surfaces
Two AI surfaces have access to this codebase, with different capabilities and different responsibilities.
Claude Code (CLI in this directory): can read, write, build, run dev servers, and execute git commands. The full git workflow above applies. Claude Code is the primary surface for development work — feature branches, builds, deploys via PR.
Claude Desktop with the local filesystem MCP connector: can read and write files in the local clone but typically does not run commands. This surface is appropriate for: copy edits in source files, small content changes, reviewing component logic, drafting before code work. Claude Desktop sessions should not attempt to push, merge, or perform git operations they cannot verify. If a Claude Desktop session writes file changes, Court still needs to run git status, git diff, and the commit/push sequence himself — or hand off to Claude Code to complete.
In both cases: read this file first, follow the visual and editorial guardrails, and never make changes that bypass the PR-to-main discipline.
Visual language (locked)
Background #ECE7DF cream, text #0D1A1E dark.
Poster accent palette: blue #1c3867, green #217b3d, red #a51e22, ochre #b5822e, teal #4a6e70, stone #7d736a.
Typography: Source Serif 4 (titles/body), DM Sans (UI/stats), IBM Plex Mono (data/citations).
Illustration style: hand-drawn organic forms (Procreate), composited in Illustrator.
The visual system is the same as the printed posters and the thesis document. Any proposed visual change should default to staying within this system unless Court explicitly opens the system to revision.
Voice and writing
Court's writing voice — applied to body copy across the site — is direct, honest, rigorous, UK English. Long flowing sentences with multiple clauses. Thinking-aloud quality. Signature phrases: "this demonstrates that", "the implications for", "further to this", "thus", "which means". Intentionally imperfect rather than polished.
When drafting any prose for the site, match this voice. Avoid mechanical formality and AI-detection patterns — the supervisor flagged AI-detection on previous milestones, so anything written for body copy should sound like a human draft, not a paraphrased model output.
Data correctness obligations
The thesis argument rests on intellectual integrity. Data on the site must match:

The data on the printed poster artwork
The canonical Google Sheet workbook (ID 1zeLXEzm6MX35-OB3CAGxA4_vW6ED4FSeFdGCL1XTV0A)

Where these three places (printed poster, workbook, website) disagree, the website is wrong by definition. Cross-reference any data change against both the artwork and the workbook before committing.
Specific corrections that have been identified and may or may not be applied yet:

Poster 001: 6 of 9 emissions values were wrong; correct values match the printed poster
Poster 002: units and values entirely wrong; should be m²·year/MWh and m³/MWh (UNECE convention), with hydropower having LOWEST water consumption
Poster 004: Heat (14 TWh) and Solid Fuel (20 TWh) values swapped; methodology cites wrong DUKES tables
Poster 006: Sellafield share discrepancy (72.4% vs 78.4%) needs resolving against NDA inventory; LLW/ILW SVG ID swap to verify

If working on poster data, refer to poster-interactives-corrections.md (if present in the project) or ask Court for the canonical numbers.
Editorial principles
The site enacts the epistemic facilitator commitment of the thesis. This means:

Methodology and weakness are declared honestly. Every poster's methodology block names what the data can and cannot tell us. Don't soften these.
Sources are verifiable. The Sources page links every claim back to its origin. Don't introduce factual claims that aren't sourceable.
Body copy is short and disciplined. Poster body copy targets 75–110 words. Annotation should point at specific features; body should confirm and extend the spatial argument, not describe it.
Truth-teller framing over advocacy. Don't write copy that argues for nuclear. Present evidence neutrally with honest caveats. The survey research validates that this framing outperforms both industry reassurance and activist opposition.

How AI assistants should work

Critical collaborator, not yes-man. Honest pushback when something won't serve the work as well as an alternative.
Surface structural issues before tactical ones. If a copy fix is requested but the real issue is the section structure, flag the structure first.
Be honest about uncertainty, data quality, limitations. Never hide a weakness to make output look cleaner.
Use context aggressively before asking questions. Read CLAUDE.md, the relevant component, and the canonical data sources before proposing changes.
After completing any task, add a concrete "I could go further by [X]" line — a specific addition that would strengthen the work, not flattery.

Defence-window pressure
The defence is on 21 May 2026. From 6 May (thesis submission) to 21 May, the website is live and any change is visible to the supervisor and the wider audience the thesis intervention targets. Bias toward smaller, well-tested changes over ambitious refactors. If a change feels like it would benefit from more time than is available, flag it to Court and propose a smaller version.
Things that are NOT this project
If asked about anything that doesn't fit the above — a different design project, a different thesis, generic web development questions unrelated to this repo, or edits to the written thesis document — answer normally without applying this project context. The written thesis is locked unless Court explicitly reopens it.