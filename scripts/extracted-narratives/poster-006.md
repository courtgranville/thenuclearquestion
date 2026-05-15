# Poster 006: Britain's Nuclear Waste

- **Source:** `006-britains-nuclear-waste.pdf`, draft dated 24 April 2026 (longer-prose version, pre-trim).
- **Cross-reference:** `version 2/006-version2.pdf`, dated 1 May 2026 (shipped trim).
- **Extracted:** 2026-05-15

The print draft and shipped print share the title *Britain's Nuclear Waste* and the subtitle *UK radioactive waste by where it comes from, what it is and where it ends up.* The site's `posterData.ts` extends the subtitle with an Oxford comma but is otherwise identical.

---

## Headline / opener

The print draft has **two long opening paragraphs plus a separate "what's missing is the last step" closing block**. The shipped v2 print compressed all three into one tighter ~110-word block.

**Print draft, verbatim (three sequential blocks):**

> The previous posters in this series have made nuclear energy look more defensible than most people expect. It emits less carbon than almost any other source. It uses less land and less material per unit of energy. It kills fewer people per terawatt-hour than any fossil fuel, and fewer than most renewables. Waste is the question those findings don't answer. It is the objection that survives the others. Many people who accept the climate case for nuclear still hesitate here, and the hesitation isn't irrational. The UK has been producing radioactive material for nearly eighty years and still has no permanent place to put the most dangerous of it. A storage silo in Cumbria has been leaking into the ground since 2018. The cleanup bill for that one site runs to £136 billion and gets larger every time it is recalculated.

> The inventory shows what the problem actually is. Most UK radioactive waste is lightly contaminated concrete, metal and soil from knocking down old facilities. It can be landfilled within a few years of arising. A much smaller fraction - spent fuel and reactor components - holds almost all the radioactivity. That fraction needs to be isolated from people for tens of thousands of years. The volume is small. The duration is not. This is a legacy problem. Nearly three-quarters of the UK's radioactive waste sits on one 6 km² site in Cumbria, most of it produced between the 1940s and the 1990s. The reactors being built today add very little to the total. They also can't unmake what is already there.

> What's missing is the last step. A Geological Disposal Facility for higher-activity waste has been planned, in various forms, since the 1970s. A site selection process reopened in 2020. No site has been chosen. The country that built the world's first commercial reactor still has nowhere permanent to put what came out of it.

**Shipped v2 print, verbatim (single block):**

> Nuclear energy looks more defensible than most people expect — lower carbon than almost any other source, less land-use per unit of energy, fewer deaths per terawatt-hour than fossil fuels and most renewables. Waste is the question those findings don't answer. It is the objection that survives the others, and the hesitation isn't irrational. Britain has been producing radioactive material for nearly eighty years and still has no permanent place to put the most dangerous of it. A storage silo at Sellafield has been leaking into the ground since 2018; the cleanup bill runs to £136 billion and grows every time it is recalculated. The country that built the world's first commercial reactor still has nowhere permanent to put what came out of it.

> Note: the shipped v2 print uses em-dashes here. The site's punctuation rule (CLAUDE.md) is hyphen-minus only. Any web port of this text must replace `—` with ` - `.

---

## Per-element annotations

### Producer dendrogram (where waste comes from, % of 4,580,000 m³ total)

- **Total:** 100% — 4,580,000 m³
- **Sellafield:** 72.4% — 3,320,000 m³
- **Magnox Reactor Sites:** 12.3% — 563,000 m³
- **Others (Medical, Fuel):** 8.1% — 370,000 m³
- **AGR & PWR Power Stations:** 3.4% — 156,000 m³
- **Dounreay:** 2.5% — 114,000 m³
- **Defence (AWE, Submarines):** 1.1% — 51,900 m³
- **Hinkley Point C (New Build):** 0.2% — 9,970 m³

### Waste-category organic forms (volume × radioactivity)

- **Very Low Level Waste (VLLW):** 2,610,000 m³ — 58.6% of volume, <0.001% of radioactivity.
- **Low Level Waste (LLW):** 1,340,000 m³ — 30.2% of volume, <0.001% of radioactivity.
- **Intermediate Level Waste (ILW):** 496,000 m³ — 11.1% of volume, 4.4% of radioactivity.
- **High Level Waste (HLW):** 1,470 m³ — <0.1% of volume, 95.6% of radioactivity.

### Disposal routes (where it ends up)

- **Landfill:** 3,340,000 m³ — LLW & VLLW at authorised sites.
- **Near-Surface Vaults:** 255,000 m³ — LLWR (Cumbria) & Dounreay.
- **Treatment & Recycling:** 440,000 m³ — Recyclyed [sic], incinerated, or released below threshold.
- **Geological Disposal Facility:** 499,000 m³ — Site not yet selected.

> Note: "Recyclyed" is in the print as printed; should read "Recycled". The shipped v2 print kept the same typo.

### Sellafield section ("What's Happening In Sellafield?")

- **Sub-headline:** 72.4% of the UK's radioactive waste lives on a single 6km² site in Cumbria.
- **Site state callout:** Sellafield / Moorside — 7 reactors, none operating.
- **Stats block (print draft, verbatim):**
  - £136 bn cleanup cost, running to 2125
  - £2.7 bn spent in 2023–24 (64% of NDA budget)
  - ~140 t separated civil plutonium stockpile
- **History block (print draft, verbatim):** Originally a plutonium factory for Britain's weapons programme, Sellafield became the UK's civil reprocessing hub in the 1960s. Reprocessing ended in July 2022. The site is now a storage and cleanup operation with no new nuclear mission.
- **Magnox Swarf Storage Silo callout (print draft, verbatim):** The Magnox Swarf Storage Silo has been leaking radioactive water into the ground since 2018 - roughly an Olympic swimming pool every three years. The NDA describes it as "the most hazardous building in the UK."
- **MSSS labelled as "Off This Scale"** on the print, indicating its radiation dose exceeds the bubble-scale plot.
- **Shipped v2 print history block, verbatim:** A former plutonium factory for Britain's weapons programme, Sellafield ran civil reprocessing from the 1960s until July 2022. The site is now a storage and cleanup operation.
- **Shipped v2 print stats block, verbatim:**
  - £136 bn cleanup cost, running to 2125
  - £2.7 bn spent in 2023–24
  - ~140 t separated civil plutonium stockpile

### Radiation dose bubbles ("What A Dose Of Radiation Actually Is")

- **Sub-headline:** Everyday radiation doses, in millisieverts, against the doses from shielded nuclear waste packages.
- **Dose ladder (print draft, verbatim, low to high):**
  - Living 1km from a UK reactor for 1 year — 0.003 mSv
  - A dental x-ray — 0.005 mSv
  - A chest x-ray — 0.02 mSv
  - 1 hour next to a LLW drum — 0.05 mSv
  - A transatlantic flight — 0.08 mSv
  - 1 hour next to an ILW package — 2 mSv
  - 1 hour next to a HLW transport flask — 2 mSv
  - Annual UK background radiation — 2.7 mSv
  - A CT scan of the abdomen — 10 mSv
- **HLW reference callout (print draft, verbatim):** One minute next to unshielded vitrified HLW = 1,000 mSv. This is 10ox [sic] a CT scan - enough to cause acute radiation syndrome within hours. The engineering shown below in disposal facilities are designed to prevent exposure to this specifically.
- **Banana reference (print draft, verbatim):** For further reference, eating a banana delivers ~0.0001 mSv - a bubble too small to draw at the scale.
- **Shipped v2 print HLW callout (verbatim):** At the top: one minute next to unshielded vitrified HLW = 1,000 mSv - 100× a CT scan, enough to cause acute radiation syndrome within hours. Disposal facilities are engineered specifically to prevent this. At the bottom: eating a banana delivers 0.0001 mSv, too small for a visible bubble.

> Note: "10ox" in the print draft should read "100×" - the print has a typo. The shipped v2 print fixed this.

### Legend annotations (print draft)

Under heading **Legend:**, with two sub-heads **The Forms** and **The Scale**.

- **The Forms (verbatim):** Three kinds of forms carry the data on this poster. A dendrogram of circles at the top shows where the UK's nuclear waste comes from; Sellafield is highlighted in red. Four organic forms in the cnetre-left [sic] show each waste category's share of volume and radioactivity. Red radiating forms to the right show radiation doses at true proportional scale.
- **The Scale (verbatim):** Two measurement systems sit on this poster. Waste volumes are in cubic metres (m³), reported from the NDA 2022 UK Radioactive Waste Inventory. Radiation doses are in millisieverts (mSv), the standard unit for effective dose. All forms on the poster are drawn proportionally. The does [sic] bubbles are area-proportional on a logarithmic scale.
- **Form scale markers:**
  - Producer circles — sized by waste volume (m³)
  - Waste-category forms — size = volume; density = radioactivity
  - Radiation dose bubbles — size = effective dose (mSv)
- **Reference scale markers (printed at proportional size):**
  - Hinkley 9,970 m³ vs. Sellafield 3,320,000 m³ (producer-circle proportional reference)
  - Chest X-ray 0.02 mSv vs. CT scan 10 mSv (dose-bubble reference, log scale)

> Note: "cnetre-left" and "does bubbles" are both in the print as printed; should read "centre-left" and "dose bubbles". The shipped v2 print fixed both.

### V2-only Methodology block

Shipped v2 print, verbatim:

> Volumes from the NDA's UK Radioactive Waste Inventory 2022. Doses in millisieverts (mSv). Dose bubbles are area-proportional on a logarithmic scale; all other forms are linear.

> Waste volumes reported from the NDA's 2022 UK Radioactive Waste Inventory. Radiation doses from UK Health Security Agency and IAEA reference values; the dose-bubble scale is logarithmic to fit nine orders of magnitude on one canvas. The Geological Disposal Facility shown bottom-right has been planned in various forms since the 1970s, but no site has yet been chosen - the disposal route exists in policy, not yet on the ground.

The v2 methodology absorbs the print draft's third body paragraph (the "What's missing is the last step" closer) into the methodology strap. Either is usable; the print version is stronger as body prose.

---

## Methodology block

Print draft data strap (foot of poster), verbatim:

> Data: UK Radioactive Waste Inventory 2022 (Nuclear Decommissioning Authority). Radiation dose figures: UK Health Security Agency, Office for Nuclear Regulation, International Atomic Energy Agency SSG-26. Sellafield cleanup cost and MSSS leak figures: National Audit Office (2024), Public Accounts Committee (2025). Visualisation: Court Granville, 2026.

Identical in the shipped v2 print. This is also what `posterSources.006.intro/items` already carries on the live site.

---

## Declared weakness ("what this can't tell us")

The poster's honesty work is distributed across three sentences in the print body:

> Waste is the question those findings don't answer. It is the objection that survives the others. Many people who accept the climate case for nuclear still hesitate here, and the hesitation isn't irrational.

> The reactors being built today add very little to the total. They also can't unmake what is already there.

> A site selection process reopened in 2020. No site has been chosen. The country that built the world's first commercial reactor still has nowhere permanent to put what came out of it.

The shipped v2 print keeps the first and last of these; the middle ("can't unmake what is already there") is print-only.

The v2 methodology block adds a fourth weakness disclosure: "the disposal route exists in policy, not yet on the ground." That phrase is not in the print draft.

The live site's `posterSources.006.caveat` paraphrases all of the above and adds two additional caveats not on either print (waste volumes will shift in subsequent inventory updates; £136 bn figure has been revised upward).

---

## Editorial threads not present in the print

Items below are in the longer print draft but were cut from the shipped v2 print.

1. **The "inventory shows what the problem actually is" walk-through.** Print only. The whole second body paragraph teaches the chart: most UK radioactive waste is concrete and soil that can be landfilled; a tiny fraction holds almost all the radioactivity and needs tens of thousands of years of isolation. "The volume is small. The duration is not." This is the chart-teaching block; it earns its room on the web because the visual hierarchy of VLLW (58.6% volume, <0.001% radioactivity) vs. HLW (<0.1% volume, 95.6% radioactivity) is the poster's central argument.

2. **The "legacy problem" framing.** "This is a legacy problem. Nearly three-quarters of the UK's radioactive waste sits on one 6 km² site in Cumbria, most of it produced between the 1940s and the 1990s." Print only. Critical for the web because it answers the most common objection to building more reactors - that they will worsen the waste problem. The legacy framing is the answer.

3. **The "reactors being built today add very little / can't unmake" line.** Print only. The single most editorially honest sentence in the series: the new reactors won't make the waste problem worse, but they won't fix it either. Strong candidate for the web.

4. **The "What's missing is the last step" closing paragraph.** Print only as body prose; v2 absorbed parts into the methodology strap. The print version is more direct and rhetorically stronger: "The country that built the world's first commercial reactor still has nowhere permanent to put what came out of it." This is already on the live site as `posterData.ts.pullQuote` in slightly different form ("hesitation isn't irrational"); the print's full closing block could serve as a SectionFrame closer.

5. **The "Sellafield originally a plutonium factory" historical block.** Both prints carry this, but the print draft is fuller: "Originally a plutonium factory for Britain's weapons programme, Sellafield became the UK's civil reprocessing hub in the 1960s. Reprocessing ended in July 2022. The site is now a storage and cleanup operation with no new nuclear mission." The "no new nuclear mission" phrase is print only and is editorially the most damning - it names the fact that the cleanup is the work, and the cleanup has no replacement.

6. **The MSSS "Olympic swimming pool every three years" frame.** Both prints carry this; it's the strongest concrete metaphor in the series. Worth flagging because if the web hesitates to use evocative comparisons, this one earns its keep - and it is from the print, not invented for web copy.

---

## Suggested web placement

- **Page-level lead, above the visualisation:** The print draft's first body paragraph ("The previous posters in this series have made nuclear energy look more defensible than most people expect..."). It's the strongest opener in the series and explicitly carries the desirability-feasibility-objections arc of the thesis into one block. The shipped v2 print compressed it to a single paragraph; the web has room for the longer one.
- **Between visualisation sections / SectionFrame on the producer dendrogram:** No additional prose needed - the per-circle labels carry the chart.
- **Between visualisation sections / SectionFrame on the waste-category forms:** The print draft's second body paragraph (the "inventory shows what the problem actually is" walk-through). This is the chart-teaching block for the four organic forms (VLLW / LLW / ILW / HLW).
- **Between visualisation sections / SectionFrame on the Sellafield section:** The print draft's Sellafield history block + the MSSS leak callout + the three stat lines (£136 bn / £2.7 bn / ~140 t). These already exist as `Poster006Sellafield.tsx` content on the site.
- **Between visualisation sections / SectionFrame on the radiation doses:** The print draft's HLW reference callout (corrected to "100×") + the banana reference. Already present in `Poster006RadiationDoses.tsx` in some form; the print is the canonical text.
- **Closer / dedicated final SectionFrame:** The print draft's third body block ("What's missing is the last step..."). This is the editorial closer of the series; it earns the final word on the page.
- **On the Sources page:** The current `posterSources.006.caveat` already paraphrases the print's weakness disclosures and adds two practical caveats (inventory updates; cost revisions). Marginal improvement available by tightening to print phrasing, but not urgent.
- **As pull-quote:** Two strong candidates. (a) "Waste is the question those findings don't answer. It is the objection that survives the others." (Both prints; already in `posterData.ts.pullQuote` in extended form.) (b) "The volume is small. The duration is not." (Print only; tighter and more aphoristic.)
- **As in-canvas annotations:** The legend's "Three kinds of forms" walk-through, the dose-bubble log-scale note, and the Hinkley/Sellafield + chest-x-ray/CT-scan reference markers. These are canvas furniture, not body prose.
- **Cut from the web (probably):** Nothing. The print prose on poster 006 is uniformly strong.

---

## Total word count extracted

Print draft body, methodology, legend, Sellafield section and dose ladder prose (excluding numeric data labels and the data strap): ~700 words. Shipped v2 print body and Sellafield section prose: ~330 words. Net gain available for promotion to web: ~370 words.
