# Poster 003: The Deaths We Don't Count

> Print title is "The Deaths We Don't Count" with the subtitle "A speculation on the lives the UK loses - and could save - through its electricity generation." The shipped print (version 2) and the live site retitled this as "The Lives We Could Save" with the subtitle "What happens to the mortality rate if you take the same demand for electricity and apply 3 energy mix scenarios for the grid." Both phrasings are Court's; the print is the source of the longer prose.

- **Source:** `003-the-deaths-we-dont-count.pdf`, draft dated 24 April 2026 (longer-prose version, pre-trim).
- **Cross-reference:** `version 2/003-version2.pdf`, dated 1 May 2026 (shipped trim).
- **Extracted:** 2026-05-15

---

## Headline / opener

The print draft has one long opening paragraph and a separate "Millstead" methodology block sitting in the body. The shipped v2 print replaced the whole opening with a tighter ~80-word lead that turns the argument outward ("Most people picture nuclear deaths as Chernobyl..."). Both are below.

**Print draft opener, verbatim:**

> The UK's electricity system kills an estimated 699 people every year. Not through accidents or explosions - through air pollution, supply chain injuries, and the cumulative health burden of burning fuel at industrial scale. Gas, the country's largest electricity source, accounts for 243 of those deaths. Oil - which most people do not realise the UK still burns for electricity - accounts for 211, despite generating just 4% of the supply. Bioenergy, widely marketed as renewable, accounts for 186. Nuclear, generating 14% of UK electricity, accounts for one. This visualisation speculates: what would happen to those numbers if the UK increased its nuclear share? At 30%, coal and oil disappear from the mix entirely, and estimated deaths fall to 297 - saving 401 lives per year. At 70% (France's current capacity), only nuclear, wind, and solar remain. Deaths fall to 9. That is a 98.7% reduction - 690 people who would not die. These are not predictions. They are modelled estimates based on published death rates applied to a speculative energy mix. The question they pose is not whether this will happen, but what it would mean if it did.

**Print draft "Millstead" methodology paragraph, verbatim** (sits in the middle of the print as a labelled "Unit of Analysis" block, but is body prose):

> Death rates for energy sources are measured per terawatt-hour - a unit most people cannot picture. Millstead makes it tangible. Adapted from Our World in Data's "Euroville" model, Millstead is a hypothetical British town of 150,000 people, roughly the size of Oxford, consuming one terawatt-hour of electricity per year. By applying the published death rates to this single town, we can see what each energy source costs in human terms at a recognisable scale. The figures below show how many residents of Millstead would die prematurely each year if the town were powered entirely by a single source. These are the rates from which every national estimate on this poster is calculated.

**Shipped v2 print lead, verbatim:**

> Most people picture nuclear deaths as Chernobyl. Most people don't picture the deaths their everyday electricity already produces - through air pollution, through supply-chain accidents, through the slow public-health cost of burning fuel at industrial scale. The UK grid kills an estimated 699 people every year. Almost all of them die from sources nobody worries about. The visualisation below holds total demand constant and asks: if more of that grid were nuclear, what changes? The answer is uncomfortable for both sides of the argument.

The shipped lead and the print opener carry different arguments. The print opens with the numbers; the shipped lead opens with the perception gap. Both are usable; the web could carry both in sequence (perception gap as lead, numbers as the section underneath).

---

## Per-element annotations

### Millstead unit-of-analysis values (print draft only)

Deaths per Millstead-year if powered entirely by a single source - the underlying death rates per TWh, scaled to one TWh. Captured verbatim:

- **Coal:** 24.62 deaths
- **Oil:** 18.43
- **Bioenergy:** 4.63
- **Gas:** 2.82
- **Hydropower:** 1.30
- **Wind:** 0.04
- **Nuclear:** 0.03
- **Solar:** 0.02

These rates are the source numbers from which every national estimate on the poster is calculated. Markandya & Wilkinson (2007), Sovacool (2016). The shipped v2 print cut the Millstead frame entirely and shows only the scenario-level totals.

### Scenario 1 - "Today" (~14% nuclear · 41 TWh of 284 TWh)

Mix breakdown:

- Gas 30.4%
- Wind 29.3%
- Nuclear 14.3%
- Bioenergy 14.1%
- Solar 5.2%
- Oil 4%
- Hydro 2%
- Coal 0.7%

Deaths by source (red dots, one dot per death):

- Gas 243 Deaths
- Oil 211 Deaths
- Bioenergy 186 Deaths
- Coal 47 Deaths
- Hydro 8 Deaths
- Wind 3 Deaths
- Nuclear 1 Death
- Solar 0.03 Deaths

**Total: 699 estimated deaths per year.**

### Scenario 2 - "30% Nuclear" (85 TWh nuclear of 284 TWh)

Mix breakdown:

- Gas 30.4%
- Nuclear 30%
- Wind 29.3%
- Solar 5.2%
- Bioenergy 3.1%
- Hydro 2%

Deaths by source:

- Gas 243 Deaths
- Bioenergy 41 Deaths
- Hydro 8 Deaths
- Wind 3 Deaths
- Nuclear 3 Deaths
- Solar 1 Death

**Total: 297 estimated deaths per year. Lives saved per year: 401.**

### Scenario 3 - "70% Nuclear" (199 TWh nuclear of 284 TWh)

Mix breakdown:

- Nuclear 70%
- Wind 24.8%
- Solar 5.2%

Deaths by source:

- Nuclear 6 Deaths
- Wind 3 Deaths (also appears on the print as "Wind 3 Deaths" in the same place)
- Solar 1 Death

**Total: 9 estimated deaths per year. Lives saved per year: 690.**

### Three-layer legend annotations (print draft)

Under the heading **Legend:** with sub-heads **The Scenarios** and **The Layers**:

- **The Scenarios:** Three versions of the UK electricity system at the same total demand of 284 TWh/year. "Today" is the 2024 mix; 30% and 70% are modelled speculations, not forecasts. As nuclear's share rises, the deadliest sources are displaced first - coal, oil, bioenergy, gas. This is an editorial ordering, not a policy proposal.
- **The Layers - Top (dot circles):** Each red dot is one death; each green dot is one life saved versus today's mix.
- **The Layers - Middle (dendrogram):** A dendrogram of the electricity mix; circle size is each source's share of the mix in TWh.
- **The Layers - Bottom (organic forms):** Volume is proportional to estimated annual premature deaths.

The shipped v2 print kept these but reordered the description to **Top → Bottom → Middle** for the same three layers, and added per-layer one-liner takeaways:

- *Bottom (organic forms):* "699 deaths a year - almost two every day, mostly invisible because they happen in hospitals, not headlines."
- *Dendrogram callout (yellow Nuclear strand):* "The dendrogram of each scenario shows the percentage each source of electricity takes in an energy mix of ~284 TWh. Nuclear is highlighted in yellow."
- *Dendrogram across scenarios:* "Despite nuclear's share rising from ~14% to 70%, nuclear-related deaths only rise from 1 to 6 per year."
- *Dot circles legend:* "Each dot is one estimated life saved compared to today's mix."

These four v2-only annotations are useful for the web canvas. Captured here so they aren't lost.

---

## Methodology block

Print draft, under heading **Assumptions:** - verbatim:

> UK electricity generation: 284 TWh/year (Ember, 2024). Death rates per TWh from Markandya & Wilkinson, The Lancet (2007) and Sovacool et al. (2016), via Our World in Data. These are European averages based on modelled attributable mortality - estimated premature deaths from air pollution and supply chain accidents, not direct fatality counts. Nuclear death rates include Chernobyl and Fukushima mortality estimates distributed across total historical generation; the true toll of Chernobyl remains contested, with estimates ranging from under 100 confirmed deaths to several thousand. Electricity imports (~6% of UK supply) are excluded. All scenarios hold total generation constant at 284 TWh.

Print draft data strap (foot of poster), verbatim:

> Data: Energy deaths - Our World in Data (2024), via Markandya & Wilkinson (2007) and Sovacool et al. (2016). UK electricity mix: Ember (2024). Visualisation: Court Granville, 2026.

Shipped v2 print compressed the Assumptions block to:

> Modelled scenarios at constant 284 TWh demand. Death rates per TWh from Markandya & Wilkinson (2007) and Sovacool et al. (2016) - counterfactual estimates, not predictions. Nuclear figures include Chernobyl and Fukushima distributed across European generation.

---

## Declared weakness ("what this can't tell us")

Captured at two places in the print draft. First, the closing sentences of the opening body paragraph:

> These are not predictions. They are modelled estimates based on published death rates applied to a speculative energy mix. The question they pose is not whether this will happen, but what it would mean if it did.

Second, within the Assumptions block, the Chernobyl uncertainty:

> Nuclear death rates include Chernobyl and Fukushima mortality estimates distributed across total historical generation; the true toll of Chernobyl remains contested, with estimates ranging from under 100 confirmed deaths to several thousand.

Both are print-only in this form. The shipped v2 print collapses them into "counterfactual estimates, not predictions" and "nuclear figures include Chernobyl and Fukushima distributed across European generation." `posterSources.003.caveat` on the live site is a third paraphrase of the same idea.

---

## Editorial threads not present in the print

Items below are in the longer print draft but were cut from the shipped v2 print. Worth considering for the web.

1. **The whole Millstead unit-of-analysis.** Print only. A hypothetical British town of 150,000, the size of Oxford, consuming 1 TWh/year, used to convert deaths-per-TWh into deaths-per-recognisable-place. Useful on the web because it solves the same problem this poster has on a screen: how to make a unit of measure feel like people. Worth preserving as a sidebar or as an in-canvas "what would happen if you powered this one town" interaction. The Markandya & Wilkinson + Sovacool death rates are right there, scaled, and ready to use.

2. **The Oil-at-4%-but-211-deaths line.** "Oil - which most people do not realise the UK still burns for electricity - accounts for 211, despite generating just 4% of the supply." Print only. Surfaces the single most counter-intuitive number in the dataset. Useful on the web as an annotation on the *Today* scenario or as a body-text callout.

3. **The Bioenergy "widely marketed as renewable" line.** "Bioenergy, widely marketed as renewable, accounts for 186." Print only. Carries an editorial position that the website does not currently state explicitly. Worth deciding whether to keep this framing or soften it - the bioenergy story is the most ideologically charged number on the poster.

4. **The France-at-70% line.** "At 70% (France's current capacity), only nuclear, wind, and solar remain." Print only. This is the entire reason the 70% scenario is on the poster - it is not arbitrary, it is calibrated against France. The shipped print drops the France reference; the web should not, because the reference is what makes the scenario more than a thought experiment.

5. **The 98.7% reduction figure.** "Deaths fall to 9. That is a 98.7% reduction - 690 people who would not die." Print only as prose, though the 9 and 690 numbers appear as in-canvas labels in v2. Useful as a pull-quote.

6. **The Chernobyl uncertainty range.** "The true toll of Chernobyl remains contested, with estimates ranging from under 100 confirmed deaths to several thousand." Print only at this level of detail. The web has room for it - this is the single most-likely-to-be-challenged number on the poster, and the longer disclosure is the right answer.

7. **The "editorial ordering, not a policy proposal" line.** "As nuclear's share rises, the deadliest sources are displaced first - coal, oil, bioenergy, gas. This is an editorial ordering, not a policy proposal." Print legend only. The shipped v2 print cut it. Worth preserving because it is the methodological honesty work for the scenario construction.

8. **The shipped v2 print's "uncomfortable for both sides of the argument" opener.** This phrase does not appear in the print draft - it was added in v2. Useful because it is the most explicit truth-teller framing on the whole site, and the web can carry both the print's data-first opener and v2's perception-gap opener back-to-back.

---

## Suggested web placement

- **Page-level lead, above the visualisation:** Use the *shipped* v2 lead ("Most people picture nuclear deaths as Chernobyl..."). It is the strongest opener; it is also already in `posterData.ts.pullQuote` territory.
- **Between visualisation sections / in a SectionFrame above the three scenarios:** The print draft's opener paragraph (the 699 / 243 / 211 / 186 / 1 walk-through). This is the "name the numbers" section. The shipped print does not include it as body prose; on the web it earns its room.
- **In a dedicated "Millstead" sub-section or in-canvas interaction:** The full Millstead methodology paragraph plus the eight per-source rates. This is the single biggest editorial thread cut from the print, and it is the strongest candidate for promotion to the web. Could be a static block, a slider ("if Millstead were powered by..."), or a side-panel that opens when a death rate is hovered. Whatever the form, the prose is ready.
- **Expandable "More on this" disclosure below the viz:** The Assumptions block in full (the print version), specifically the Chernobyl-uncertainty range and the imports exclusion. The current `posterSources.003.caveat` paraphrases this; the print draft is tighter.
- **On the Sources page:** Replace or extend the current caveat with the print's "true toll of Chernobyl remains contested" sentence verbatim. This is the most honest treatment available.
- **As pull-quote:** Two candidates. (a) Print: "These are not predictions. They are modelled estimates based on published death rates applied to a speculative energy mix. The question they pose is not whether this will happen, but what it would mean if it did." (b) v2: "Almost all of them die from sources nobody worries about." Court should pick whichever has more weight in his voice.
- **As in-canvas annotations:** The four v2-only layer callouts captured under **Per-element annotations**. These belong on the canvas of the web viz, not the body prose.
- **Cut from the web (probably):** The Bioenergy "widely marketed as renewable" line as it stands. Either keep it verbatim because it is honest, or rephrase to "Bioenergy, often counted as renewable, accounts for 186." Decision for Court.

---

## Total word count extracted

Print draft body, methodology, Millstead and legend prose (excluding scenario value labels and the data strap): ~720 words. Shipped v2 print body and legend prose: ~340 words. Net gain available for promotion to web: ~380 words, plus the full Millstead unit-of-analysis.
