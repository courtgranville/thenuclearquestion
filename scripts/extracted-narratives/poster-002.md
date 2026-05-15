# Poster 002: The Physical Cost of a Megawatt-Hour

- **Source:** `002-the-physical-cost-of-our-electricity.pdf`, draft dated 24 April 2026 (longer-prose version, pre-trim).
- **Cross-reference:** `version 2/002-version2.pdf`, dated 1 May 2026 (shipped trim).
- **Extracted:** 2026-05-15

The print draft and the shipped poster carry the same title and the same subtitle: *Land and water consumed by electricity source across the full lifecycle*. The site's `posterData.ts` retains the title and uses "Lifecycle land use and water consumption per electricity source" as a subtitle - close to the print but rephrased.

---

## Headline / opener

The print draft has three body paragraphs sitting alongside the visualisation. The shipped v2 print trimmed all three down to a single ~70-word block.

**Print draft, verbatim:**

> The previous poster compared electricity sources on lifecycle emissions alone. That single axis favours nuclear and renewables decisively. But every kilowatt-hour also takes physical things from the world - land that could have been used for something else, and water that never returns to its source. Here, each source appears as a single form: a green surface showing its lifetime land footprint - measured in square-metre-years per megawatt-hour - with a blue volume showing its lifetime water consumption - measured in cubic metres per megawatt-hour - sitting above it. Water consumed is not the same as water withdrawn. A plant may draw enormous volumes for once-through cooling and return almost all of it downstream; what is counted here is only what is permanently lost in the process.

> Read the forms one by one and the pattern emerges. Nuclear's land footprint is extremely dense, but its water volume is the second-largest on the poster, behind only coal with carbon capture. Cadmium-thin-film solar PV has a moderate footprint and barely any water volume at all. Hydropower inverts the comparison entirely: the land footprint is the largest on the chart, the water volume among the smallest. The source that wins on land is not the source that wins on water. Whichever metric you prioritise, a different source comes out best.

> This poster argues that no single source wins on every measure - different physical costs fall on different sources, and an honest comparison has to name that. It does not argue that water use should disqualify nuclear from the grid. Water intensity is dominated by cooling design: coastal plants using seawater lose almost nothing to evaporation; inland plants with cooling towers lose the most. Siting and cooling choices can swing nuclear's water figure by an order of magnitude. Whether a particular reactor is a reasonable use of fresh water is a question that depends on where it is.

**Shipped v2 print, verbatim:**

> Every kilowatt-hour takes physical things from the world - land that could have been used for something else, and water that never returns to its source. Each source on this poster appears as a single form: a blue volume scaled to its lifetime water consumption, sitting on a green surface scaled to its lifetime land footprint. The source that wins on land rarely wins on water. No source wins on every measure.

---

## Per-element annotations

Each source carries a paired land + water value. Captured verbatim from the print draft:

- **Gas:** 19.23 m²·year/MWh land footprint, 35 m³/MWh water consumption.
- **Solar PV (Cadmium):** 14.88 m²·year/MWh land, 120 m³/MWh water.
- **Coal:** 33.39 m²·year/MWh land, 13 m³/MWh water.
- **Solar PV (Silicon):** 12.65 m²·year/MWh land, 8 m³/MWh water.
- **Coal (CCS):** 21.06 m²·year/MWh land, 214 m³/MWh water.
- **Hydropower:** 1.04 m²·year/MWh land, 45 m³/MWh water.
- **Nuclear:** 0.33 m²·year/MWh land, 132 m³/MWh water.

> Note: the print draft labels CCS as "CSS" in the form-callout block ("Coal (CSS) 214") and the lower-right reference annotation ("Coal (CSS) 214"), but uses "carbon capture" in the body prose. Same typo as poster 001. The shipped v2 print kept "Coal (CCS)" consistently.

### Per-source callouts present only in the shipped v2 print

The shipped poster adds short annotations alongside individual forms - these do not appear in the print draft:

- **Nuclear callout (v2 only):** Nuclear's land footprint is the smallest of any source - 0.33 m²·year/MWh, around 45× less than solar PV.
- **Hydropower callout (v2 only):** Hydropower's water consumption is low per MWh, but its land footprint - reservoir surface area - is the largest.
- **Solar PV callout (v2 only):** Two solar technologies with two physical profiles. Materials choice can change the footprint as much as the technology does.
- **Coal (CCS) callout (v2 only):** Carbon capture roughly doubles coal's water demand. Cleaning emissions has a physical cost of its own.

These callouts were added on the trim, not removed. If the web page uses the print-draft body, it should still pick up these v2-only callouts as in-canvas annotations.

### Legend annotations

Print draft, under the heading **Legend:** with sub-heads **The Forms** and **The Markers**:

- **The Forms (figure description):** Each source appears as an organic form: a green surface showing its lifetime land footprint, and a blue volume showing its lifetime water consumption sitting above it. Each source label carries both values. A small marker precedes each, showing which metric is which at a glance.
- **Land marker description:** Surface area is proportional to lifecycle land use, measured in square-metre-years per megwatt-hour [sic] (m²·year/MWh). Larger Surfaces demonstrate the source occupied more land for longer.
- **Water marker description:** Volume is proportional to water consumed - drawn from its source and not returned - measured in cubic metres per megawatt-hour (m³/MWh). Larger forms demonstrate the source consumed more.
- **Reference markers shown on print:** Nuclear 0.33 (land); Solar PV (Cd) 8 (water); Coal (CSS) 214 (water); Hydropower 33.39 (land).

The shipped v2 print collapsed this to:

> Each source appears as an organic form: a green surface showing its lifetime land footprint, and a blue volume showing its lifetime water consumption sitting above it.

---

## Methodology block

Print draft data strap (foot of poster), verbatim:

> Data: Our World in Data (2024), drawing on UNECE (2021) Lifecycle Assessment of Electricity Generation Options. Visualisation: Court Granville, 2026.

Shipped v2 print adds, under a dedicated **Methodology** heading:

> Form area is proportional to lifetime water consumption (m³/MWh); green surface area is proportional to lifetime land use (m²·year/MWh). Water consumed is not water withdrawn. Thermal plants draw vast volumes for cooling and return most of it; what is counted here is only what is permanently lost. Nuclear's figure depends heavily on cooling design - coastal plants using seawater lose almost nothing, while inland plants with cooling towers lose the most. Siting alone can swing the figure by an order of magnitude.

The v2 methodology block is essentially a re-cast of the print draft's third body paragraph (the cooling-design caveat). The print draft puts the same content in the running prose; v2 promoted it to a dedicated methodology strap.

---

## Declared weakness ("what this can't tell us")

The honest caveat is the cooling-design point: nuclear's water number is real but mobile, and "whether a particular reactor is a reasonable use of fresh water is a question that depends on where it is." Print draft, verbatim:

> Water intensity is dominated by cooling design: coastal plants using seawater lose almost nothing to evaporation; inland plants with cooling towers lose the most. Siting and cooling choices can swing nuclear's water figure by an order of magnitude. Whether a particular reactor is a reasonable use of fresh water is a question that depends on where it is.

The shipped v2 print kept this in the methodology block in compressed form:

> Nuclear's figure depends heavily on cooling design - coastal plants using seawater lose almost nothing, while inland plants with cooling towers lose the most. Siting alone can swing the figure by an order of magnitude.

The `posterSources.002.caveat` in the website data already paraphrases this and adds a second caveat about rooftop PV (zero additional footprint) that does not appear on the print or in v2.

---

## Editorial threads not present in the print

Items below are in the longer print draft but were cut from the shipped v2 print. Worth considering for the web.

1. **The "previous poster" hand-off.** "The previous poster compared electricity sources on lifecycle emissions alone. That single axis favours nuclear and renewables decisively." This is the only place in the series where one poster is explicitly described as a continuation of another. Useful on the web because the site does not currently scaffold the sequence; promoting this sentence onto poster 002's lead would make the desirability arc visible.

2. **The "read the forms one by one" walkthrough.** The whole second print paragraph walks through nuclear, cadmium-thin-film solar, and hydropower in turn, then states the rule: "The source that wins on land is not the source that wins on water." This is the most direct way to teach the chart and is print-only. The shipped print compresses this to "The source that wins on land rarely wins on water."

3. **The "this poster argues / it does not argue" framing.** The third paragraph explicitly names the boundary of the argument: this is not a case that water use disqualifies nuclear; it is a case that no single source wins on every measure. The "argues / does not argue" framing is rhetorically careful and reads as a Court-voice tell. Useful on the web because the truth-teller framing is core to the thesis - and this poster is the one where the argument's limits matter most.

4. **The "whether a particular reactor is a reasonable use of fresh water is a question that depends on where it is."** This sentence reads as a thesis-line for poster 005's siting argument too. It is print-only and currently has no home on the site.

5. **Per-source canvas callouts (added in v2, not in print).** The shipped print added four short callouts that the print draft does not have (nuclear, hydropower, solar PV, coal-CCS). These are short, useful, and probably belong on the canvas of the web viz rather than as body prose. Captured in **Per-element annotations** above.

---

## Suggested web placement

- **Page-level lead, above the visualisation:** Use the *shipped* v2 opener ("Every kilowatt-hour takes physical things from the world..."). It is the right length and is already on-message for the site.
- **Between visualisation sections / in a SectionFrame:** The print draft's second paragraph - the source-by-source walk-through ending with "the source that wins on land is not the source that wins on water." This is the chart-teaching block; it earns its room on the web.
- **Expandable "More on this" disclosure below the viz:** The print draft's third paragraph (the "this poster argues / it does not argue" framing and the cooling-design caveat). On the web, this is the right place for an "Honest about the trade-off" block.
- **On the Sources page (supplementary methodology):** Promote the cooling-design sentence as the caveat in `posterSources.002` (it is already there in paraphrased form; tightening to match the print would be marginal but cheap).
- **As pull-quote:** "The source that wins on land is not the source that wins on water. Whichever metric you prioritise, a different source comes out best." (The site currently uses a "nuclear question is never a clean argument" pull-quote that does not appear in the print; flagging that mismatch for Court.)
- **As in-canvas annotation:** The four v2-only callouts (nuclear 45× less than solar; hydropower's reservoir surface; two-solar-profiles; CCS doubles water). These belong on the canvas, not in prose.
- **The "previous poster compared electricity sources..." hand-off line:** Best home is the site's section navigation or an intro line, not the poster body. Or cut, if the section ordering on the site does the work without prose support.

---

## Total word count extracted

Print draft body and legend prose (excluding numeric form labels and the data strap): ~480 words. Shipped v2 print body and legend prose: ~190 words. Net gain available for promotion to web: ~290 words.
