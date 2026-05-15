# Extracted narratives — index

Read-only extraction. Source PDFs live at `~/Desktop/003_academics/[1]_IE/YEAR 4/THESIS/DATA-VISUALISATION/final-posters/` (longer-prose drafts dated 24 April 2026) with `version 2/` sub-folder cross-referenced as the shipped-print trim (dated 1–4 May 2026). Each digest captures the print body, per-element annotations, methodology, declared weakness, editorial threads cut from the shipped print, and a per-block suggested web placement.

These files are descriptive, not prescriptive — Court will edit before any of this prose is placed on web pages (Prompt 7 handles placement).

---

## Per-poster summary

| Poster | Title (print draft) | Print body / legend words | Shipped (v2) body / legend words | Net editorial gain | Distinct text blocks | Notable editorial threads worth promoting to web |
|---|---|---:|---:|---:|---:|---|
| 001 | The Emissions of Our Energy Sources | ~430 | ~160 | ~270 | 7 | Lifecycle "same ruler" framing; manufacturing-to-decommissioning walk-through; "ordering stable across every reputable dataset" sentence; "only non-renewable below ten" callout |
| 002 | The Physical Cost of a Megawatt-Hour | ~480 | ~190 | ~290 | 7 | "Previous poster" hand-off; source-by-source walk-through ending "the source that wins on land is not the source that wins on water"; the "argues / does not argue" framing; v2-only canvas callouts that should still travel with the print prose |
| 003 | The Deaths We Don't Count | ~720 | ~340 | ~380 + Millstead | 11 | Full Millstead unit-of-analysis (a hypothetical town of 150,000 powered by one TWh/year); Oil-at-4%-but-211-deaths; France-at-70% calibration; the 98.7% reduction figure; the Chernobyl uncertainty range |
| 004 | Most of Our Energy Isn't Electricity | ~960 | ~290 | ~670 + 3 sub-charts | 13 | **Three full subsidiary charts cut from the shipped print**: 1970–2024 final-energy time-series; 1970–2026 retail-price chart; 1990–2026 carbon-intensity chart. Each with its own headline + body prose. Plus a five-strand methodology block (only two strands survived to v2) |
| 005 | Where Are All Britain's Reactors? | ~560 | ~220 | ~340 | 11 | Calder Hall (1956, first commercial reactor anywhere); Magnox/AGR "distinct national design"; "more than thirty replacement reactors across eight sites" enumeration; three named cancellation examples (Moorside 2018 / Wylfa Newydd 2020 / Wylfa SMR 2025) with the kind of failure attached; 31-year correction over the print's 35 |
| 006 | Britain's Nuclear Waste | ~700 | ~330 | ~370 | 14 | The "inventory shows what the problem actually is" chart-teaching paragraph; the "legacy problem" framing; "reactors being built today can't unmake what is already there"; the "What's missing is the last step" closer; Sellafield "no new nuclear mission" phrasing |

**Series totals.** Print draft prose extracted: ~3,850 words. Shipped v2 print prose: ~1,530 words. Net gain available for promotion to web: ~2,320 words, plus the Millstead unit-of-analysis (Poster 003), the three subsidiary charts (Poster 004), and the named cancellation receipts (Poster 005).

---

## Cross-poster patterns

A few editorial decisions recur across the print → v2 trim. Worth noting for the integration prompt:

1. **The shipped v2 print universally compressed three-paragraph print bodies to single paragraphs.** Five of six posters lose two paragraphs of body prose at the trim. Poster 004 also loses three full subsidiary charts. The web is the place to restore the longer form.

2. **The shipped v2 print added per-canvas callouts that the print draft does not carry.** Posters 002, 003, 004 and 005 each added 1–4 short callouts on the trim. These are useful for the web canvas and should travel alongside the print body, not replace it.

3. **The shipped v2 print promoted weakness disclosures into dedicated Methodology blocks.** The print draft handles the same content in running prose; v2 made it a labelled strap. Both formats are usable on the web - the labelled-strap version reads more honestly, the running-prose version reads more like Court.

4. **Several print typos survived to the shipped v2 print.** "CSS" for CCS (P001, P002), "Recyclyed" (P006), "cnetre-left" and "does bubbles" (P006), "10ox" for 100× (P006, fixed in v2), "without formal closer" (P005). The web port should correct silently; flagging here so Court knows the prints carry these.

5. **The print uses both em-dashes and hyphen-minuses inconsistently.** The shipped v2 print uses em-dashes more frequently. The site's punctuation rule (CLAUDE.md) is hyphen-minus only - any web port must sweep `—` and `–` → ` - `.

6. **The "previous posters in this series" hand-offs are print-only.** Posters 002 and 006 both open by referencing the prior posters. Useful on the web because the site does not currently scaffold the sequence; promoting these openers would make the desirability → feasibility → objections arc visible.

7. **France appears twice on the print as a calibration reference.** Poster 003 names France's 70% nuclear share as the upper-bound scenario; the print spells this out, v2 cuts it. Poster 005 implicitly references France via the AGR "distinct national design" framing. The web should keep both - the France reference is what makes the speculative scenarios calibrated rather than arbitrary.

8. **Cross-references between posters are mostly print-only.** Poster 004's "How electricity is generated is the subject of Poster 001" explicit cross-reference is print-only; Poster 005's "Sellafield" mention is the natural bridge to Poster 006. The site does not currently cross-link between poster pages; the print prose offers the natural language for it if Court wants to add it.

---

## What's not in these digests

- The data values in `client/src/lib/posterData.ts`, `poster003Data.ts`, `poster004State.ts`, `poster005Data.ts`. These are extracted into the canvas vizzes and do not need re-extraction.
- The Sources-page item lists. These already exist in `posterSources` on the live site and largely agree with the print straps.
- Any prose Court has written outside the print PDFs (Slack DMs, supervisor meetings, scratch notes). These are not part of the source material for this extraction.
