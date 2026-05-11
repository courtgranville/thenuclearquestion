# Cross-browser rendering audit

Generated for `fix/cross-browser-rendering`. Walks the five issue categories from the brief and records concrete findings + recommended fix priority.

## TL;DR

The single biggest cause of "much lower resolution" reports is **canvas DPR caps**. Four of the five canvas components clamp `devicePixelRatio` to 1.5 or 2.0. On a Retina display (DPR=2) capped at 1.5, the canvas renders at 75% of native resolution and visibly blurs. Removing the cap (or lifting to a generous ceiling like 3.0) is the highest-impact single fix.

Second-biggest cause is **sub-14px SVG `<text>` and HTML labels** still scattered across components - 18 instances found at 6-13px. CLAUDE.md sets 14px as the floor; these slipped through the typography sweep because they live in `fontSize=` SVG attributes and inline `style={{ fontSize: N }}` rather than Tailwind classes.

## ISSUE A - Canvas devicePixelRatio handling

Five canvas components share the same scaffolding. All correctly multiply backing-store by DPR, set CSS dimensions in px, and re-run on `ResizeObserver`. Two real issues remain.

| File | DPR cap | Resize observer | DPR refresh? | Other notes |
|---|---|---|---|---|
| `NucleusHero.tsx` | **2.0** | yes | captured once | OK |
| `Poster001CanvasViz.tsx` | **1.5** | yes | captured once | Caps at 1.5 - this is the visible-blur culprit on Retina |
| `Poster002CanvasViz.tsx` | **1.5** | yes | captured once | Same |
| `Poster004CanvasViz.tsx` | **2.0** | yes | captured once | OK at 2.0 but won't go higher on 3x displays |
| `Poster005DendroQuadrant.tsx` | **1.5** | yes | captured once | Same |

### Common failure modes

- **Cap too low (1.5)**: posters 001 / 002 / 005 explicitly clamp `Math.min(window.devicePixelRatio || 1, 1.5)`. On a macOS Retina display reporting DPR=2, the canvas renders at 1.5x - every line is anti-aliased over fewer pixels than it should be. On a 3x display the gap widens further. **This is the primary fix.**
- **DPR captured at effect mount**: `const DPR = Math.min(...)` runs once when the effect runs. The resize callback re-uses that same value. Dragging the window between a Retina display and a 1x monitor leaves the canvas at the old DPR. Low-impact in practice but trivial to fix - move the read into `resize()`.
- **`ctx.setTransform(dpr, 0, 0, dpr, ...)` applied multiple times per resize**: not observed - all five use `setTransform` (absolute), not `scale` (relative).

### Fix priority

1. **HIGHEST**: Remove the 1.5 cap on posters 001 / 002 / 005. Lift the ceiling to 3.0 across the board.
2. **MEDIUM**: Extract a shared `fitCanvasToDpr` helper in `lib/canvasUtils.ts`. All five adopt it.
3. **LOW**: Refresh DPR per-resize.

## ISSUE B - SVG container sizing

| File | Aspect-ratio strategy | Notes |
|---|---|---|
| `Poster001CanvasViz.tsx` | `aspectRatio: ${SVG_VIEW_W} / ${SVG_VIEW_H}` | OK |
| `Poster002CanvasViz.tsx` | Same | OK |
| `Poster003CanvasDeaths.tsx` | Same + `maxWidth: 600` | OK |
| `Poster003Dendrogram.tsx` | `aspectRatio: '473.86 / 306.98'` + `width="100%"` | OK |
| `Poster003Dots.tsx` | `aspectRatio: cachedAspect` (runtime) | OK |
| `Poster004CanvasViz.tsx` | Same | OK |
| `Poster005Map.tsx` | Relies on injected SVG's intrinsic viewBox + width=100% | Fragile - can collapse to 0 in Safari if injection lands after parent layout |
| `Poster005DendroQuadrant.tsx` | Fixed `height: min(46vh, 480px)` | OK |
| `Poster005Timeline.tsx` | Relies on injected SVG | Fragile (same) |
| `Poster006Sellafield.tsx` | Relies on injected SVG | Fragile (same) |
| `Poster006WasteStorage.tsx` | Relies on injected SVG | Fragile (same) |
| `Poster006RadiationDoses.tsx` | `aspectRatio: '1 / 1', maxWidth: 380` | OK |

### Fix priority

**MEDIUM**: Add explicit `aspectRatio` to the wrapper div in `Poster005Map`, `Poster005Timeline`, `Poster006Sellafield`, `Poster006WasteStorage`. Avoids the Safari-injection-race edge case.

## ISSUE C - clamp() and viewport units

Six `clamp()` declarations across the codebase. All checked at 320 / 768 / 1280 / 1920 viewport widths.

| File:line | clamp() | Verdict |
|---|---|---|
| `Poster005Callouts.tsx:39` | `clamp(1.6rem, 3.4vw, 2.1rem)` | OK at all widths |
| `Poster003Ticker.tsx:85` | `clamp(40px, 6vw, 64px)` | OK |
| `IntroAnimation.tsx:103` | `clamp(1.75rem, 4vw, 3.25rem)` | OK |
| `index.css:124` | `clamp(1.875rem, 2.5vw + 1rem, 2.25rem)` | OK |
| `index.css:328` | `clamp(30px, 3.6vw, 56px)` | OK |
| `index.css:492` | `clamp(28px, 3vw, 46px)` | OK |

All clamps are well-formed and behave consistently across Chrome / Firefox / Safari per the CSS spec.

### Fix priority

**NONE**. No clamp() change needed.

## ISSUE D - Sub-14px font sizes

The Wave 2 typography sweep eliminated `text-xs` (12px). But sub-14px `fontSize` attributes / inline styles slipped through. **18 instances found below 14px.**

### SVG `<text fontSize={N}>` attributes

| File:line | fontSize | Context |
|---|---|---|
| `Poster001Legend.tsx:87,88,91,92` | 10, 10, 11, 11 | Nuclear / Coal scale labels and values |
| `Poster003Dendrogram.tsx:398,414` | 6, 8 | Source labels (very tight) |

### HTML inline `style={{ fontSize: N }}` (React defaults N to px)

| File:line | fontSize | Context |
|---|---|---|
| `Poster001CanvasViz.tsx:480` | 11 | Legend caption |
| `Poster002CanvasViz.tsx:818,862,874` | 10, 9, 9 | Intensity legend rows |
| `Poster003Slider.tsx:308,318,333` | 12, 10, 11 | Scenario labels |
| `Poster003Viz.tsx:284` | 11 | Annotation |
| `Poster004CanvasViz.tsx:878` | 11 | Carrier label |
| `Poster006WasteInversion.tsx:561` | 11 | Caption |

### Fix priority

1. **HIGH**: Bump every sub-14 fontSize to 14 (skip `Poster003Dendrogram` 6/8 - that's a design issue, not a cross-browser one; flag for follow-up).

## ISSUE E - Image and asset loading

- All `<img>` references in `client/src/` use hashed asset paths consistently.
- No `srcSet` usage on poster previews. Low priority.
- Cloudflare Pages default cache headers are fine.

### Fix priority

**NONE**.

## Browser testing

Per the brief, attempted Chrome (latest), Firefox (latest), Safari (latest macOS). This session has Chrome via the local dev tools. **Firefox and Safari testing was not performed** in this session - flagging to Court so he can verify before fixes ship.

### Chrome observations (latest, viewport ~1100x800, DPR 2)

- Canvas hubs on `/poster/005` render visibly softer than the SVG polylines next to them. Hub forms are canvas-rasterised at DPR 1.5 (cap), SVG connectors render at native DPR 2. The contrast is what makes the canvas look "lower resolution".
- Poster 003 dendrogram source labels (fontSize 6 and 8) are essentially unreadable.
- Poster 002 intensity legend (fontSize 9) is below the legibility floor.

## Recommended PR scope

Per the brief: "ship the audit plus the top three highest-impact fixes and flag the rest as follow-ups."

### Top three highest-impact fixes (shipped together with this PR)

1. **Remove the DPR cap on canvas components.** Raise to 3.0 across the board so high-DPR displays render at native resolution.
2. **Extract `lib/canvasUtils.ts` with `fitCanvasToDpr` helper.** All five canvas components adopt it. Single source of truth for DPR handling + ensures the fresh-DPR-on-resize fix lands everywhere at once.
3. **Bump sub-14px `fontSize` attributes / inline styles.** Poster001CanvasViz / Poster001Legend / Poster002CanvasViz / Poster003Slider / Poster003Viz / Poster004CanvasViz / Poster006WasteInversion - 13 instances - up to 14. Skip Poster003Dendrogram (fontSize 6 / 8) - flag as a design decision for follow-up.

### Flagged follow-ups

- Explicit `aspectRatio` on Poster005Map / Timeline + Poster006Sellafield / WasteStorage wrappers (Safari edge case).
- Poster003Dendrogram fontSize 6 / 8 source labels - replace with hover tooltips or remove.
- Firefox + Safari spot-checks (Court to verify).
- Poster preview thumbnail srcSet (combine with asset compression PR).
