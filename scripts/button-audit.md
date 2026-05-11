# Button audit - interactive controls beneath each poster's viz

Generated for `feature/button-prominence`. Inventory of every clickable control across the six poster pages that isn't a hover-driven SVG hit-target.

Each row captures: file/line, what the control does, the current visual treatment, whether clicking reveals content below the fold (matters for the ▾ indicator).

## Poster 001 - The Emissions of Our Electricity Sources

| # | File:line | Control | Current treatment | Reveals below? |
|---|---|---|---|---|
| 1 | `Poster001CanvasViz.tsx:524` | 9 source-region toggles (Nuclear, Onshore Wind, Offshore Wind, Solar PV CdTe, Solar PV Si, Hydropower, Coal with CCS, Gas, Coal) | `px-3 py-1.5 rounded-sm text-sm uppercase`. Border `border-border/50` (low alpha), text in source `color`, leading dot. Selected: `border-current shadow-sm` + `${color}12` bg tint. | **Yes** - clicking reveals an info panel below with details + emissions value |

Poster 001 has no other clickable controls. The legend is a passive description.

## Poster 002 - The Physical Cost of a Megawatt-Hour

| # | File:line | Control | Current treatment | Reveals below? |
|---|---|---|---|---|
| 1 | `Poster002CanvasViz.tsx:911` | 3 mode buttons (Combined / Land / Water) | `px-4 py-1.5 rounded-sm text-sm uppercase`. Border `border-border/50`. Selected: `border-foreground shadow-sm bg-foreground/5`. | **No** - swaps the active visualisation layer in place |
| 2 | `Poster002CanvasViz.tsx:932` | 7 source-region toggles (mirrors P001 pattern) | Same as P001:524 | **Yes** - info panel reveals below |
| 3 | `Poster002CanvasViz.tsx:960` | Pause/Play icon button | `px-2 py-1.5 rounded-sm border border-border/50`, Lucide Play/Pause icon, 14px | **No** - toggles animation only |

## Poster 003 - The Lives We Could Save

Poster 003 has no toggle buttons. Interaction is a single horizontal scenario slider (`Poster003Slider.tsx`). The scenario the user lands on is reflected in the surrounding numbers and visualisation. No button work required for this poster.

## Poster 004 - Most of Our Energy Isn't Electricity

| # | File:line | Control | Current treatment | Reveals below? |
|---|---|---|---|---|
| 1 | `Poster004CanvasViz.tsx:1129` | "Play animation" (only when reduced-motion is OFF and the animation is finished) | Plain text link, `text-muted-foreground hover:text-foreground`, separated by middots | **No** - replays the cascade animation |
| 2 | `Poster004CanvasViz.tsx:1139` | "View as poster" | Same | **No** - snaps the canvas to the static print state |
| 3 | `Poster004CanvasViz.tsx:1147` | "Reset" | Same | **No** - returns to the default carrier-collapsed state |

These three are styled as a single muted-link cluster; the brief notes "View as poster" reveals a different visual state in place, not new content below.

## Poster 005 - Where Are All Britain's Reactors

| # | File:line | Control | Current treatment | Reveals below? |
|---|---|---|---|---|
| 1 | `Poster005StatusLegend.tsx:46` | 4 status filter buttons (Under Construction / Operating / Retired / Cancelled). Category-coloured with a coloured dot, label, and count suffix `9 · 6,472 MW`. | `px-3 py-1.5 rounded-sm border` with `borderColor: rgba(13,26,30,0.18)` inactive, status colour active. Selected gets `${colour}14` background tint and weight 600 label. | **No** - dims non-matching circles in place across map + dendrogram + timeline |
| 2 | `Poster005StatusLegend.tsx:82` | "clear" link (only appears when a filter is active) | Plain text link, italic, `text-sm text-muted-foreground hover:text-foreground` | **No** |
| 3 | `Poster005DendroQuadrant.tsx:833` | Per-quadrant hub hot-zone (click = toggle this status's filter; pointer-enter = pulse cascade) | Invisible div positioned over the hub bbox, `role="button"`. Has no visible treatment because the visible hub is the canvas-rendered form. | **No** |

Item 3 is an invisible hot-zone, not a visible button. Out of scope for the visual primitive but the toggle behaviour mirrors the StatusLegend's filter, so it stays as-is.

## Poster 006 - Britain's Nuclear Waste

| # | File:line | Control | Current treatment | Reveals below? |
|---|---|---|---|---|
| 1 | `Poster006WasteInversion.tsx:605` | "By Volume" toggle | Italic Playfair, 1rem text. Active state: foreground colour + underline at 4px below baseline. Inactive: `rgba(13,26,30,0.42)`. No border, no background. | **No** - swaps the active visualisation in place |
| 2 | `Poster006WasteInversion.tsx:622` | "By Radioactivity" toggle | Same | **No** |

`Poster006Sellafield.tsx`, `Poster006RadiationDoses.tsx`, and `Poster006WasteStorage.tsx` have no toggle buttons - all interactions are hover-driven SVG hit-targets. No button work required for those sub-components.

## Summary

- **In scope for the new primitive (TASK 2):** P001:524 (×9), P002:911 (×3), P002:932 (×7), P002:960 (icon), P004:1129/1139/1147 (×3), P005StatusLegend:46 (×4), P006WasteInversion:605/622 (×2).
- **Stays as text link / passes the primitive:** P005StatusLegend:82 "clear", and the visible-text presentation Court chose for P006WasteInversion may want a different treatment than the bordered button (Court flagged this as "by-volume/radioactivity toggle" - happy to ship as either the new primitive or keep the existing italic-underline style if Court prefers).
- **`revealsContentBelow=true` candidates:** P001 source toggles (info panel reveals), P002 source toggles (same). The P002 mode toggle, P005 status filters, P006 inversion toggles all dim/swap in place - `revealsContentBelow=false`.
- **Out of scope:** P003 (slider only), P006Sellafield/RadiationDoses/WasteStorage (hover-only SVG), P005DendroQuadrant hot-zone (invisible).
