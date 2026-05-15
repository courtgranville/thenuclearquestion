# Poster 001: The Emissions of Our Energy Sources

> Print title is "The Emissions of Our **Energy** Sources" with subtitle "Lifecycle greenhouse gas emissions by electricity source." The shipped print (version 2) and the live site retitle this as "The Emissions of Our **Electricity** Sources" with the subtitle "How many greenhouse gases are produced in each source's lifecycle." Both phrasings are Court's; the print draft is the longer-prose source.

- **Source:** `001-the-emissions-of-our-electricity-sources.pdf`, draft dated 24 April 2026 (longer-prose version, pre-trim).
- **Cross-reference:** `version 2/001-version2.pdf`, dated 1 May 2026 (shipped trim).
- **Extracted:** 2026-05-15

---

## Headline / opener

Three paragraphs sit alongside the visualisation in the print draft. The shipped v2 print compressed all three into a single ~70-word block. The longer print draft text reads:

> Electricity looks identical at the wall socket. The carbon cost of producing it does not. Mining the raw materials, manufacturing the turbine or the fuel, building the plant, running it across its working life, decommissioning it at the end - every stage releases greenhouse gases. Divide the total by every kilowatt-hour the plant produced, and you arrive at a single figure: grams of CO₂-equivalent per kilowatt-hour delivered. That figure is what every form on this poster represents. Volume is proportional to it.

> Operational emissions - what leaves the chimney while the plant is running - are the number most often quoted and the wrong number for this comparison. It undercounts fossil fuels, which leak substantial methane upstream of the plant, and overcounts nuclear and renewables, which emit during manufacturing and construction but almost nothing once operating. A lifecycle figure is what allows a wind turbine, a nuclear reactor, and a coal station to be judged on the same ruler.

> Each number here is a median drawn from peer-reviewed lifecycle assessments compiled by Our World in Data, the IPCC, and UNECE. Real projects vary. A wind turbine in a windy site emits less per kilowatt-hour than one on a poor site. A coal plant burning lignite emits more than one burning anthracite. A hydropower reservoir flooding a forest emits more than one flooding bare ground. The ranges overlap at the edges. They do not overlap at the centre. The ordering shown here is stable across every reputable dataset in the field.

The shipped print version recast the opening to:

> Electricity looks identical at the wall socket; the carbon cost of producing it does not. Operational emissions - the chimney number - undercount fossil fuels and overcount renewables. Lifecycle emissions, measured from mine to decommissioning, are the right ruler. On that ruler, nuclear emits 5.6 grams of CO₂-equivalent per kilowatt-hour. Coal emits 970 - a 173× gap. Wind, solar, hydropower, and nuclear all sit below 120; gas, oil, and coal start above 400. Public argument treats nuclear as a fossil-fuel cousin. By the only measure that compares plants on the same terms, it isn't.

---

## Per-element annotations

Each form on the chart carries a source name + a single gCO₂/kWh value. Captured verbatim:

- **Gas:** 439 gCO2/KWh
- **Coal:** 970 gCO2/KWh
- **Coal with Carbon Capture (CSS):** 294 gCO2/KWh
- **Hydropower:** 117 gCO2/KWh
- **Solar PV (silicon, on-ground):** 52 gCO2/KWh
- **Offshore Wind:** 17 gCO2/KWh
- **Solar PV (cadmium, on-ground):** 16 gCO2/KWh
- **Onshore Wind:** 11 gCO2/KWh
- **Nuclear:** 5.6 gCO2/KWh

> Note: "CSS" appears in the print as printed; the standard acronym is CCS. The shipped v2 print kept the same typo. Court should choose whether to correct it on the web.

### Legend annotations (print draft)

These three explanatory blocks sit under the heading **Legend:** with the sub-heads **The Forms** and **The Scale**.

- **The Forms (figure description):** Each form is one electric generation source. Volume is proportional to lifecycle greenhouse gas emissions - larger forms released more carbon dioxide-equivalent per kilowatt-hour of electricity delivered.
- **The Scale (units note):** Measured in grams of carbon dioxide-equivalent released per kilowatt-hour of electrity [sic] delivered, written gCO2/KWh throughout.
- **Reference: Coal / Nuclear marker pair:** The coal form contains one hundred and seventy-three times the volume of the nuclear form. That ratio is shown to scale.
- **Reference: Nuclear callout:** The only non-renewable on this poster with emissions below ten grams of CO2-equivalent per kilowatt-hour.
- **Colour key:** Green marks nuclear. Grey marks other sources.

The shipped v2 print rewrote the legend to a tighter pair of sentences:

> Each form is one electricity source. Area is proportional to lifecycle emissions, in grams of CO₂-equivalent per kilowatt-hour delivered. Green marks nuclear; grey marks other sources.

> Two reference forms shown below at actual size: nuclear at 5.6 gCO₂/kWh and coal at 970. The ratio between every pair of forms on the poster is shown to the same scale.

---

## Methodology block

Print draft (data strap at the foot of the poster, verbatim):

> Data: Our World in Data (2024), drawing on IPCC AR5 WG3 Annex III and UNECE lifecycle assessment literature. Visualisation: Court Granville, 2026.

Shipped v2 print adds, under a dedicated **Methodology** heading:

> Median values from peer-reviewed lifecycle assessments compiled by Our World in Data, IPCC AR5, and UNECE. Real projects vary by site and fuel grade - ranges overlap at the edges, not the centre.

This second strap is the one currently held in `posterData.ts` as the poster's methodology field on the website.

---

## Declared weakness ("what this can't tell us")

Poster 001 does not carry a labelled "Weakness" or "Caveat" block. The honesty work happens inside the third body paragraph of the print draft:

> Real projects vary. A wind turbine in a windy site emits less per kilowatt-hour than one on a poor site. A coal plant burning lignite emits more than one burning anthracite. A hydropower reservoir flooding a forest emits more than one flooding bare ground. The ranges overlap at the edges. They do not overlap at the centre. The ordering shown here is stable across every reputable dataset in the field.

The shipped v2 print collapsed this into the methodology line: "Real projects vary by site and fuel grade - ranges overlap at the edges, not the centre." The print version is the fuller treatment of the same idea.

---

## Editorial threads not present in the print

The shipped print (v2) trimmed the print-draft opener from three paragraphs to one. The following blocks exist on the longer print draft but were cut from the shipped poster - the web has room for them:

1. **The "manufacturing-to-decommissioning" walk-through.** The opener's enumeration of where lifecycle emissions actually come from - mining the raw materials, manufacturing the turbine or the fuel, building the plant, running it across its working life, decommissioning it at the end. Useful on the web because the lifecycle vs. operational distinction is the entire epistemic argument of this poster, and the walk-through is the most accessible way of teaching it.

2. **The "wrong number" framing of operational emissions.** The print draft is explicit that the chimney number "undercounts fossil fuels, which leak substantial methane upstream of the plant, and overcounts nuclear and renewables, which emit during manufacturing and construction but almost nothing once operating." The shipped print keeps only "the chimney number - undercount fossil fuels and overcount renewables." The longer version names the mechanism in both directions; this is worth promoting because the methane upstream point is the one that decides the comparison.

3. **The "same ruler" line.** "A lifecycle figure is what allows a wind turbine, a nuclear reactor, and a coal station to be judged on the same ruler." Carries the whole epistemic claim of the poster in a single sentence. Already promoted into the v2 print as "are the right ruler", but the longer form makes the move legible.

4. **The "stable across every reputable dataset" line.** "The ordering shown here is stable across every reputable dataset in the field." This is the closest the poster comes to declaring how confident the data is, and it is print-only. Worth pulling onto the web as a sources caveat: the medians can move; the ordering does not.

5. **The "only non-renewable below ten" callout.** "The only non-renewable on this poster with emissions below ten grams of CO2-equivalent per kilowatt-hour." Print legend only; cut from v2. Functions as a one-liner re-framing of nuclear's position on the chart - useful as a callout or pull-quote on the web rather than as body prose.

---

## Suggested web placement

- **Page-level lead, above the visualisation:** Use the *shipped* v2 opener (the 70-word "Electricity looks identical at the wall socket; the carbon cost of producing it does not..." block). It already does the page's argument-in-miniature work. The current `posterData.ts` `description` field is already a paraphrase of it.
- **Between visualisation sections / in a SectionFrame:** The print draft's first two paragraphs (manufacturing-to-decommissioning walk-through + operational-vs-lifecycle "wrong number" framing). These are too long for the lead but too important to bury. Right home is a SectionFrame eyebrow like *Why lifecycle, not operational?* sitting between the canvas and the legend.
- **Expandable "More on this" disclosure below the viz:** The third print paragraph ("Each number here is a median... ordering shown here is stable across every reputable dataset in the field"). Reads as a methodology footnote on the web - exactly the kind of thing a sceptical reader wants to be able to find but most readers will skip.
- **Sources page (supplementary methodology):** The print data strap is verbatim what `posterSources.001` already holds. No change.
- **As pull-quote:** "Public argument treats nuclear as a fossil-fuel cousin. By the only measure that compares plants on the same terms, it isn't." (Already present in `posterData.ts.pullQuote`; flagging for completeness.)

The per-form values (Gas 439, Coal 970, etc.) are the canvas annotations - they belong on the canvas, not as body prose.

---

## Total word count extracted

Print draft body and legend prose (excluding form-label values and the data strap): ~430 words. Shipped v2 print body and legend prose: ~160 words. Net gain available for promotion to web: ~270 words.
