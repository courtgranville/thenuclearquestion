# Poster 005: Where Are All Britain's Reactors?

- **Source:** `005-where-are-all-britains-reactors.pdf`, draft dated 24 April 2026 (longer-prose version, pre-trim).
- **Cross-reference:** `version 2/005-version2.pdf`, dated 4 May 2026 (shipped trim — note: this poster's v2 was re-exported later than 1 May).
- **Extracted:** 2026-05-15

The print draft and the shipped print share the title *Where Are All Britain's Reactors?* and the subtitle *Every civil reactor the United Kingdom has ever built, operated, planned, or abandoned - 1953 to 2026*. The site's `posterData.ts` uses a slightly shortened form: *"Every civil reactor the UK has built, operated, planned or abandoned (1953-2026)"*.

---

## Headline / opener

The print draft has three body paragraphs sitting alongside the visualisation. The shipped v2 print trimmed all three to a single ~80-word block.

**Print draft, verbatim:**

> When people talk about Britain's nuclear pause, it is easy to imagine a country that changed its mind. That is not what happened. For a brief period in the twentieth century, Britain led the world on this technology. Calder Hall, opened in 1956, was the first commercial nuclear power station anywhere. For three decades afterwards, British engineers built reactors at speed - Magnox, then advanced gas-cooled reactors, a distinct national design no other country adopted. At their peak in the mid 1990s, these reactors supplied roughly a quarter of the country's electricity.

> Then Britain stopped. No new reactor entered operation since Sizewell B came online in 1995. However, this pause was not purely an absence of ambition. Over the same period, the government and industry announced more than thirty replacement reactors across eight sites - Moorside, Oldbury, Wylfa, Bradwell, Hinkley, Sizewell, Dungeness and Sellafield. Almost none were built. One project breaks the pattern. Hinkley Point C, under construction in Somerset since 2017, is currently projected to generate power sometime in the 2030s. If it does, it will be the only reactor commissioned in Britain this century. What the map, the tree, and the timeline on this page collectively describe is a country that kept deciding to build, and kept failing to finish its reactors.

> The Global Energy Monitor records capacity and dates, not intent. A cancellation looks the same here whether the developer walked away from the costs (Moorside, 2018), the government killed the project (Wylfa Newydd, 2020), or a whole programme lapsed without formal closer [sic] (Wylfa SMR, 2025). Those distinctions matter enormously. What the data on its own can tell you is only the shape of what happened: an industry that built ambitiously, retired on schedule, and then - for reasons the data alone cannot explain - largely stopped.

> Note: "without formal closer" is in the print draft as printed; should read "closure". Court should choose whether to correct it on the web.

**Shipped v2 print, verbatim:**

> When people talk about Britain's nuclear pause, they imagine a country that changed its mind. It didn't. For three decades, British engineers built reactors at speed; by the mid-1990s, they supplied roughly a quarter of the country's electricity. Then construction stopped. But ambition didn't. The one exception, Hinkley Point C, is projected to generate power sometime in the 2030s. The map, the dendrogram, and the timeline below describe a country that kept deciding to build - and kept failing to finish.

---

## Per-element annotations

### Map cluster insets

- **Sellafield / Moorside:** 7 reactors
- **Sizewell:** 3 projects
- **Wylfa:** 3 reactors

### Status legend (map + dendrogram + timeline shared)

Colour key: Cancelled, Retired, Operating, Under Construction. Map adds **Shelved** as a fifth status. The dot legend visible on the print:

- Operating
- Under construction
- Shelved
- Retired
- Cancelled

### Big-number callouts (right side of poster, print draft)

- **35 years** — since Britain last switched on a new nuclear reactor.
- **30+ reactors** — announced by government and industry since 1995. Almost none were built.
- **14,141 MW** — of planned capacity - more than twice the capacity of Britain's entire operating nuclear fleet today.

> Print draft says "35 years" since the last switch-on (Sizewell B in 1995). The shipped v2 print updates this to "31 years" - which is correct from the 2026 viewpoint. The 35-year figure on the print draft appears to be from an earlier draft window. The web should use 31, not 35.

### Dendrogram annotations (print draft)

- **Subject:** 72 reactors organised by status and project. Size shows capacity.
- **Leaf size scale:** 77 → 1720 MW.
- **Smallest / largest callout:** Smallest: 77 MW Wylfa SMRs (cancelled 2025). Largest: Hinkley C's two 1,720 MW EPRs.

### Timeline annotations (print draft)

- **Subject:** One horizontal bar per reactor. Colour shows phase; x-axis is years.
- **Retired:** Built, operated, shut down.
- **Operating:** Still running, no end tick.
- **Under construction:** Dashed; projected to target COD.
- **Cancelled:** Dot at cancellation year only.
- **x-axis note:** Spans 1950 to 2035. Red shows years in construction; green shows years of operation.

### Reactor names visible on the timeline (verbatim, print order)

The timeline shows 72 named reactors. Captured here for completeness so the web canvas can validate against this list. Listed approximately right-to-left as they appear on the x-axis:

Moorside 1, Moorside 2, Moorside 3, Oldbury B1, Oldbury B2, Oldbury B3, Wylfa Newydd 1, Wylfa Newydd 2, Dungeness C, Sellafield (Candu) 1, Sellafield (Candu) 2, Wylfa SMR 1, Wylfa SMR 10, Wylfa SMR 11, Wylfa SMR 12, Wylfa SMR 2, Wylfa SMR 3, Wylfa SMR 4, Wylfa SMR 5, Wylfa SMR 6, Wylfa SMR 7, Wylfa SMR 8, Wylfa SMR 9, Sellafield (Hitachi) 1, Sellafield (Hitachi) 2, Hinkley Point B1, Hinkley Point B2, Hinkley Point A1, Hinkley Point A2, Dungeness B1, Dungeness B2, Dungeness A1, Dungeness A2, Hunterston B1, Hunterston B2, Hunterston A1, Hunterston A2, Sizewell A1, Sizewell A2, Trawsfynydd 1, Trawsfynydd 2, Oldbury A2, Dounreay PFR, Dounreay DFR, Calder Hall 1, Calder Hall 2, Calder Hall 3, Calder Hall 4, Chapelcross 1, Chapelcross 2, Chapelcross 3, Chapelcross 4, Winfrith SGHWR, Windscale AGR, Heysham B1, Heysham B2, Heysham A1, Heysham A2, Hartlepool A1, Hartlepool A2, Sizewell B, Hinkley Point C1, Hinkley Point C2, Wylfa 2, Wylfa 1, Oldbury A1, Berkeley 1, Berkeley 2, Bradwell 1, Bradwell 2, Torness 1, Torness 2.

(The list extracts to 71 items as printed; the print poster says 72 reactors. The discrepancy may be a labelling boundary the extractor missed - the web should validate against the canonical `poster005Data.ts`.)

### V2-only annotations

The shipped v2 print added two compressed callouts and a methodology header that do not appear in the print draft as labelled blocks:

- **Methodology callout (v2 only):** The data records what happened, not why - a cancelled project looks the same here whether the developer walked away, the government killed it, or the programme lapsed.
- **Capacity callout (v2 only):** 14,141 MW announced and never built - more than twice the UK fleet currently operating.

---

## Methodology block

The print draft does not have a dedicated methodology heading - the methodology work is the third body paragraph (the "Global Energy Monitor records capacity and dates, not intent" block). The data strap at the foot, verbatim:

> Data: Global Energy Monitor Nuclear Power Tracker (2025); UK Department for Energy Security and Net Zero; World Nuclear Association UK country profile. Visualisation: Court Granville, 2026.

The shipped v2 print promoted the "records what happened, not why" line into a labelled **Methodology** block:

> The data records what happened, not why - a cancelled project looks the same here whether the developer walked away, the government killed it, or the programme lapsed.

---

## Declared weakness ("what this can't tell us")

The honesty disclosure is the third body paragraph of the print draft, verbatim:

> The Global Energy Monitor records capacity and dates, not intent. A cancellation looks the same here whether the developer walked away from the costs (Moorside, 2018), the government killed the project (Wylfa Newydd, 2020), or a whole programme lapsed without formal closer [sic] (Wylfa SMR, 2025). Those distinctions matter enormously. What the data on its own can tell you is only the shape of what happened: an industry that built ambitiously, retired on schedule, and then - for reasons the data alone cannot explain - largely stopped.

This is the strongest weakness statement on the whole site - it names three different real-world cancellations with the year and the kind of failure, then steps back and admits "the data alone cannot explain" the pattern. The print version is much fuller than the v2 compression. The site `posterSources.005.caveat` already paraphrases this; the print is the original.

---

## Editorial threads not present in the print

Items below are in the longer print draft but were cut from the shipped v2 print. Worth considering for the web.

1. **The "Calder Hall, 1956, first commercial reactor anywhere" line.** Print only. The shipped print compresses this to "For three decades, British engineers built reactors at speed." Useful on the web because the Calder Hall origin point is the historical anchor for the whole poster - and the site's `posterSources.005.caveat` does not currently include any historical scaffolding.

2. **The "Magnox, then AGR, a distinct national design no other country adopted" line.** Print only. Names the technical specificity of the UK nuclear programme - useful for readers who don't know that the UK ran a parallel reactor design from the rest of the world. Worth keeping because it answers the "why did we stop?" question implicitly - the AGR was a UK-only line, so when it retired there was no global supply chain to replace it with.

3. **The "more than thirty replacement reactors across eight sites" enumeration.** "Moorside, Oldbury, Wylfa, Bradwell, Hinkley, Sizewell, Dungeness and Sellafield." Print only as a named list; v2 keeps only "30+ reactors announced." The list is what makes the failure pattern feel like a sequence rather than an abstraction.

4. **The three explicit cancellation examples.** "Moorside, 2018 (developer walked away from the costs)," "Wylfa Newydd, 2020 (government killed the project)," and "Wylfa SMR, 2025 (whole programme lapsed without formal closer)." Print only at this level of specificity. The shipped print keeps the three categories but not the named examples. Strong candidate for promotion to the web because these three are the actual receipts behind the weakness statement.

5. **The "country that kept deciding to build, and kept failing to finish its reactors" line.** Print body conclusion. Compressed in v2 to "kept failing to finish" - the longer form is more direct.

6. **The "35 years" figure (now 31 years).** Print draft has 35; v2 has 31. The 31 is correct for 2026. The web should use 31.

---

## Suggested web placement

- **Page-level lead, above the visualisation:** Use the shipped v2 opener as-is - it's tight, on-message, and references the three viz components below. Alternatively, the print draft's first paragraph (Calder Hall, mid-1990s peak) reads well as the opener too. Court should choose; the shipped v2 is more efficient.
- **Between visualisation sections / in a SectionFrame above the dendrogram or timeline:** The print draft's second paragraph ("Then Britain stopped... thirty replacement reactors across eight sites... Hinkley Point C... the only reactor commissioned in Britain this century"). This is the body of the argument; it earns a dedicated section on the web.
- **Expandable "More on this" disclosure below the viz, OR a dedicated SectionFrame titled "What the data does and doesn't tell us":** The third print paragraph in full (the "Global Energy Monitor records capacity and dates, not intent" block). This is the strongest weakness statement in the series; it should be visible on the page, not just on the sources page.
- **On the Sources page:** Promote the print's three cancellation examples (Moorside 2018, Wylfa Newydd 2020, Wylfa SMR 2025) into the `posterSources.005.caveat`. Currently the caveat is general; named receipts make it stronger.
- **As pull-quote:** "A country that kept deciding to build, and kept failing to finish its reactors." The current `posterData.ts.pullQuote` uses "The country that built the world's first commercial nuclear reactor is now the most expensive place in the world to build one" - this is a Court-voice line that does not appear in either the print or v2. Flagging for Court to verify it has a home.
- **As in-canvas annotations on the timeline:** The dendrogram + timeline legends from the print draft (subject + Retired / Operating / Under construction / Cancelled). These are canvas furniture, not body prose.
- **Cross-link callout to Poster 006 (Sellafield):** The print mentions Sellafield as one of the eight sites with announced replacement reactors; Poster 006 is the deep dive on what Sellafield actually holds. Worth a one-line link on the web.

---

## Total word count extracted

Print draft body, legend, and callout prose (excluding reactor name labels and the data strap): ~560 words. Shipped v2 print body, legend, and callout prose: ~220 words. Net gain available for promotion to web: ~340 words.
