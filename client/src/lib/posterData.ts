export interface PosterData {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  section: "desirability" | "feasibility" | "objections";
  sectionLabel: string;
  description: string;
  keyInsight: string;
  pullQuote: string;
  methodology: string;
  imagePath: string;
  /** WebP sibling of imagePath. Computed once at module load. */
  webpPath: string;
  /** Landscape-cropped thumbnail used in the homepage ribbon. */
  thumbnailPath: string;
  /** WebP sibling of thumbnailPath. Computed once at module load. */
  thumbnailWebpPath: string;
  pdfPath: string;
  /** Long-form prose surfaced on the poster page. Two optional
   *  zones bracket the visualisation. */
  narrative?: {
    /** Prose that sits between the description/keyInsight block
     *  and the visualisation. Use sparingly. Markdown-flavoured:
     *  ## subheadings optional; \n\n separates paragraphs. */
    before?: string;
    /** Prose that sits below the visualisation, before the sources
     *  block. The "more on this poster" zone. Markdown-flavoured:
     *  ## subheadings split it into subsections, \n\n separates
     *  paragraphs within each subsection. */
    after?: string;
  };
}

type PosterDataBase = Omit<PosterData, "webpPath" | "thumbnailWebpPath">;

const rawPosters: PosterDataBase[] = [
  {
    id: "001",
    number: "001",
    title: "The Emissions of Our Electricity Sources",
    subtitle: "How many greenhouse gases are produced in each source's lifecycle",
    section: "desirability",
    sectionLabel: "Desirability",
    description:
      "The first poster addresses one of the primary points in any climate debate: the benefits of renewable and clean energy sources over fossil fuels. Nine electricity-generation sources are shown as organic forms, scaled so their areas are proportional to lifecycle emissions, measured in grams of CO\u2082 per kilowatt-hour. The smallest form is nuclear (5.6 gCO\u2082/kWh), and the largest is coal (970 gCO\u2082/kWh). The proportionality makes the argument itself - coal occupies 173 times the area of nuclear.",
    keyInsight:
      "The decision to use lifecycle emissions rather than operational emissions was significant. Operational figures only count emissions from the power plant itself, which underestimates fossil fuels (which leak methane further up the supply chain) and misrepresents nuclear and renewables, whose emissions are almost entirely held in the construction and materials of the plants.",
    pullQuote:
      "Public argument treats nuclear as a fossil-fuel cousin. By the only measure that compares plants on the same terms, it isn\u2019t.",
    methodology:
      "Median values from peer-reviewed lifecycle assessments compiled by Our World in Data, IPCC AR5, and UNECE. Real projects vary by site and fuel grade - ranges overlap at the edges, not the centre.",
    imagePath: "/assets/001-version2_643b19ce.png",
    thumbnailPath: "/assets/poster-001-thumbnail.png",
    pdfPath: "/assets/001-version2_a9296d6a.pdf",
    narrative: {
      after: `## Why lifecycle, not operational?

Mining the raw materials, manufacturing the turbine or the fuel, building the plant, running it across its working life, decommissioning it at the end - every stage releases greenhouse gases. Divide the total by every kilowatt-hour the plant produced, and you arrive at a single figure: grams of CO\u2082-equivalent per kilowatt-hour delivered. That figure is what every form on this poster represents. Volume is proportional to it.

Operational emissions - what leaves the chimney while the plant is running - are the number most often quoted and the wrong number for this comparison. It undercounts fossil fuels, which leak substantial methane upstream of the plant, and overcounts nuclear and renewables, which emit during manufacturing and construction but almost nothing once operating. A lifecycle figure is what allows a wind turbine, a nuclear reactor, and a coal station to be judged on the same ruler.

## How confident are these numbers?

Each number here is a median drawn from peer-reviewed lifecycle assessments compiled by Our World in Data, the IPCC, and UNECE. Real projects vary. A wind turbine in a windy site emits less per kilowatt-hour than one on a poor site. A coal plant burning lignite emits more than one burning anthracite. A hydropower reservoir flooding a forest emits more than one flooding bare ground. The ranges overlap at the edges. They do not overlap at the centre. The ordering shown here is stable across every reputable dataset in the field.`,
    },
  },
  {
    id: "002",
    number: "002",
    title: "The Physical Cost of a Megawatt-Hour",
    subtitle: "Lifecycle land use and water consumption per electricity source",
    section: "desirability",
    sectionLabel: "Desirability",
    description:
      "The second poster shifts from emissions to physical costs: water consumption and land use. Each source is split into two forms - one for water consumption (blue, circular) and one for land use (green surface area). Both are normalised per megawatt-hour. Combining these two metrics by placing them one atop the other makes the quantities feel physical and allows the sources to be compared directly.",
    keyInsight:
      "No source of electricity is perfect. Hydropower performs well on water consumption, but its land footprint is massive due to reservoir surface area. The poster is honest about nuclear\u2019s strengths and weaknesses: land use is low, but water consumption is relatively high. Omitting these weaknesses would simplify the advocacy argument but weaken its foundation.",
    pullQuote:
      "The source that wins on land is not the source that wins on water. Whichever metric you prioritise, a different source comes out best.",
    methodology:
      "Land and water values from UNECE (2021) Lifecycle Assessment of Electricity Generation Options, accessed via Our World in Data. Land use is measured in m\u00b2\u00b7year/MWh (a time-integrated footprint); water use is consumption in m\u00b3/MWh (water permanently lost, not water withdrawn).",
    imagePath: "/assets/002-version2_b4d2d765.png",
    thumbnailPath: "/assets/poster-002-thumbnail.png",
    pdfPath: "/assets/002-version2_14df9892.pdf",
    narrative: {
      after: `## Reading the forms one by one

Nuclear's land footprint is extremely dense, but its water volume is the second-largest on the poster, behind only coal with carbon capture. Cadmium-thin-film solar PV has a moderate footprint and barely any water volume at all. Hydropower inverts the comparison entirely: the land footprint is the largest on the chart, the water volume among the smallest. The source that wins on land is not the source that wins on water. Whichever metric you prioritise, a different source comes out best.

## What this poster argues, and what it doesn't

This poster argues that no single source wins on every measure - different physical costs fall on different sources, and an honest comparison has to name that. It does not argue that water use should disqualify nuclear from the grid. Water intensity is dominated by cooling design: coastal plants using seawater lose almost nothing to evaporation; inland plants with cooling towers lose the most. Siting and cooling choices can swing nuclear's water figure by an order of magnitude. Whether a particular reactor is a reasonable use of fresh water is a question that depends on where it is.`,
    },
  },
  {
    id: "003",
    number: "003",
    title: "The Lives We Could Save",
    subtitle:
      "UK electricity mortality across three energy-mix scenarios",
    section: "desirability",
    sectionLabel: "Desirability",
    description:
      "Most people picture nuclear deaths as Chernobyl. Most people don't picture the deaths their everyday electricity already produces - through air pollution, through supply-chain accidents, through the slow public-health cost of burning fuel at industrial scale. The UK grid kills an estimated 699 people every year. Almost all of them die from sources nobody worries about. The visualisation below holds total demand constant and asks: if more of that grid were nuclear, what changes? The answer is uncomfortable for both sides of the argument.",
    keyInsight:
      "Mortality from energy production is normally given as a rate - precise but not relatable. Showing each death as an individual dot allows the viewer to connect scenarios to the deaths they cause. The journey from the UK\u2019s current nuclear proportion to France\u2019s current proportion is measured in lives saved.",
    pullQuote:
      "Almost all of them die from sources nobody worries about.",
    methodology:
      "Mortality rates from Markandya & Wilkinson (2007) and Sovacool et al. (2016), applied to UK electricity demand of 284 TWh. Scenarios hold demand constant to isolate the effect of changing the energy mix.",
    imagePath: "/assets/003-version2_4e239d18.png",
    thumbnailPath: "/assets/poster-003-thumbnail.png",
    pdfPath: "/assets/003-version2_b27a85d6.pdf",
    narrative: {
      before: `The UK's electricity system kills an estimated 699 people every year. Not through accidents or explosions - through air pollution, supply chain injuries, and the cumulative health burden of burning fuel at industrial scale. Gas, the country's largest electricity source, accounts for 243 of those deaths. Oil - which most people do not realise the UK still burns for electricity - accounts for 211, despite generating just 4% of the supply. Bioenergy, often counted as renewable, accounts for 186. Nuclear, generating 14% of UK electricity, accounts for one.

This visualisation speculates: what would happen to those numbers if the UK increased its nuclear share? At 30%, coal and oil disappear from the mix entirely, and estimated deaths fall to 297 - saving 401 lives per year. At 70% (France's current capacity), only nuclear, wind, and solar remain. Deaths fall to 9. That is a 98.7% reduction - 690 people who would not die. These are not predictions. They are modelled estimates based on published death rates applied to a speculative energy mix. The question they pose is not whether this will happen, but what it would mean if it did.`,
      after: `## Millstead: making a death rate visible

Death rates for energy sources are measured per terawatt-hour - a unit most people cannot picture. Millstead makes it tangible. Adapted from Our World in Data's "Euroville" model, Millstead is a hypothetical British town of 150,000 people, roughly the size of Oxford, consuming one terawatt-hour of electricity per year. By applying the published death rates to this single town, we can see what each energy source costs in human terms at a recognisable scale. If Millstead were powered entirely by coal, 24.62 of its residents would die prematurely each year. Powered by oil, 18.43. By bioenergy, 4.63. By gas, 2.82. By hydropower, 1.30. By wind, 0.04. By nuclear, 0.03. By solar, 0.02. These are the rates from which every national estimate on this poster is calculated.

## On the Chernobyl number

Nuclear death rates here include Chernobyl and Fukushima mortality estimates distributed across total historical generation. The true toll of Chernobyl remains contested, with estimates ranging from under 100 confirmed deaths to several thousand. The figures on this poster sit in the middle of that range; readers who prefer the higher estimates can mentally inflate nuclear's bar and the comparison still holds.`,
    },
  },
  {
    id: "004",
    number: "004",
    title: "Most of Our Energy Isn\u2019t Electricity",
    subtitle:
      "UK final energy consumption in 2024, by carrier and end-use sector",
    section: "feasibility",
    sectionLabel: "Feasibility",
    description:
      "The fourth poster shifts focus from electricity generation to the entire UK energy system. In 2024, the UK used 1,542 TWh of final energy. Electricity accounts for only 18% of that total. Petroleum accounts for 47% and natural gas for 28% - both exceeding the entire electricity system by a significant margin. A radial dendrogram visualises the system as a whole, branching from total energy into primary carriers, then into end-use sectors.",
    keyInsight:
      "The scale of this problem is critical to any debate about switching to renewables or nuclear. Changing our sources of electricity only impacts 18% of the final energy system. The rest is unaffected unless widespread electrification takes place. The nuclear-versus-renewables conversation most people have in mind is a conversation about one-fifth of the actual problem.",
    pullQuote:
      "Every other carrier is effectively stuck at its chemistry. Electricity is the only one with a direction of travel.",
    methodology:
      "Final energy consumption data from the Digest of UK Energy Statistics (DUKES) 2025, Tables 1.1.1, 1.1.3 and 1.1.5. Final energy is energy delivered to end users, per DUKES convention; primary energy would be approximately 50% larger because it includes conversion losses.",
    imagePath: "/assets/004-version2_1f18c33d.png",
    thumbnailPath: "/assets/poster-004-thumbnail.png",
    pdfPath: "/assets/004-version2_014ffb7f.pdf",
    narrative: {
      after: `## Our energy system has transformed before

In 1970 coal supplied more than a third of UK energy and petroleum supplied almost half. Then North Sea gas arrived, and over two decades coal collapsed - almost entirely replaced by gas. But electricity's share of total energy barely moved, creeping from 11% to 18% across fifty-four years. The carriers can change - that much has happened before. What has never happened is the rapid growth of electricity as a share of total energy use. That is what has to happen next.

## All retail energy tracks global fossil markets

Look at the lines: they move together. Every oil shock of the past fifty years - 1973, 1979, 2008, 2022 - shows up on all five fuels simultaneously. That is because British retail energy is priced, ultimately, against global fossil markets, no matter which carrier a household chooses. Electricity has always been the most expensive per unit. Gas has always been the cheapest. But all five rise and fall together, because British energy is still fossil energy, and fossil energy has one price.

## Only one carrier is decarbonising at speed

Petroleum, natural gas, solid fuel, heat, bioenergy - their emissions per unit of fuel burned barely change from decade to decade, because the chemistry of combustion doesn't change. A litre of petrol releases the same carbon in 2026 as it did in 1990. Engines and boilers have become more efficient, which reduces how much fuel we need to burn - but the fuel itself is unchanged. One line falls steeply. In 1990 the UK grid emitted over 700 grams of CO\u2082 per kilowatt-hour, burning mostly coal. Over three decades that fell by more than 70%. The electricity line crossed beneath coal in 2016, beneath petroleum in 2020, and is closing in on natural gas. Every other carrier is effectively stuck at its chemistry. Electricity is the only one with a direction of travel.

## The full methodology

This poster shows UK *final* energy consumption - energy delivered to end users - not primary energy. Primary energy would add roughly 50% to the gas and coal share, reflecting conversion losses in power stations before electricity reaches the grid. Both are legitimate framings; the choice of final energy is what makes the 18% electricity figure visible.

Electricity is shown as a carrier where it is consumed. In 2024 the UK grid was roughly 30% gas, 30% wind, 13% nuclear, 13% biomass, 11% imports, 4% solar. How electricity is generated is the subject of Poster 001.

The carbon-intensity figures use combustion emissions from DESNZ 2025 GHG conversion factors (gross calorific value basis). Electricity figures are the UK grid average, which changes annually with the generation mix. Lifecycle (well-to-tank) emissions would add roughly 15-25% to each fossil fuel line but would not change their flat shape. Bioenergy is counted at zero combustion emissions under standard UK inventory accounting, reflecting the biogenic nature of the carbon. Lifecycle accounting would give a non-zero value.

The energy industry's own consumption (around 105 TWh) and international aviation and shipping bunker fuels are excluded from the dendrogram, per DUKES convention.`,
    },
  },
  {
    id: "005",
    number: "005",
    title: "Where Are All Britain\u2019s Reactors?",
    subtitle:
      "Every civil reactor the UK has built, operated, planned or abandoned (1953 - 2026)",
    section: "feasibility",
    sectionLabel: "Feasibility",
    description:
      "The fifth poster maps every civil nuclear reactor the UK has built, operated, planned or abandoned from 1953 to 2026, organised by status: operating, under construction, shelved, retired, and cancelled. A UK map shows site clusters, a status dendrogram organises the reactors, and a construction timeline runs along the bottom.",
    keyInsight:
      "The UK rapidly built reactors in the mid-20th century, only to abruptly stop. Since the mid-1990s, more than 35 projects have been announced, but no new reactor has been switched on in the last 31 years. The pattern is one of repeated announcements followed by failure to deliver - over 14,000 MW of announced capacity was never built.",
    pullQuote:
      "A country that kept deciding to build, and kept failing to finish its reactors.",
    methodology:
      "Reactor data compiled from the Global Energy Monitor Nuclear Power Tracker (2025) and the World Nuclear Association country profile for the United Kingdom. The dataset records project outcomes, not reasons for cancellation.",
    imagePath: "/assets/005-preview-1_fea2ab19.png",
    thumbnailPath: "/assets/poster-005-thumbnail.png",
    pdfPath: "/assets/005-version2_ad4c9725.pdf",
    narrative: {
      before: `For a brief period in the twentieth century, Britain led the world on this technology. Calder Hall, opened in 1956, was the first commercial nuclear power station anywhere. For three decades afterwards, British engineers built reactors at speed - Magnox, then advanced gas-cooled reactors, a distinct national design no other country adopted. At their peak in the mid-1990s, these reactors supplied roughly a quarter of the country's electricity.

Then Britain stopped. No new reactor entered operation since Sizewell B came online in 1995. However, this pause was not purely an absence of ambition. Over the same period, the government and industry announced more than thirty replacement reactors across eight sites - Moorside, Oldbury, Wylfa, Bradwell, Hinkley, Sizewell, Dungeness and Sellafield. Almost none were built. One project breaks the pattern. Hinkley Point C, under construction in Somerset since 2017, is currently projected to generate power sometime in the 2030s. If it does, it will be the only reactor commissioned in Britain this century.`,
      after: `## What the data does and doesn't tell us

The Global Energy Monitor records capacity and dates, not intent. A cancellation looks the same here whether the developer walked away from the costs (Moorside, 2018), the government killed the project (Wylfa Newydd, 2020), or a whole programme lapsed without formal closure (Wylfa SMR, 2025). Those distinctions matter enormously. What the data on its own can tell you is only the shape of what happened: an industry that built ambitiously, retired on schedule, and then - for reasons the data alone cannot explain - largely stopped.`,
    },
  },
  {
    id: "006",
    number: "006",
    title: "Britain\u2019s Nuclear Waste",
    subtitle:
      "UK radioactive waste by where it comes from, what it is, and where it ends up",
    section: "objections",
    sectionLabel: "Objections",
    description:
      "The previous posters in this series have made nuclear energy look more defensible than most people expect. It emits less carbon than almost any other source. It uses less land and less material per unit of energy. It kills fewer people per terawatt-hour than any fossil fuel, and fewer than most renewables. Waste is the question those findings don't answer. It is the objection that survives the others. Many people who accept the climate case for nuclear still hesitate here, and the hesitation isn't irrational.",
    keyInsight:
      "This is the most information-dense poster in the series, intentionally so. The waste discussion is presented in full rather than simplified, because it is a complex and often misunderstood topic, and because it is often the most emotionally charged one. The poster demonstrates that 72.4% of the UK\u2019s radioactive waste is concentrated at a single site in Cumbria.",
    pullQuote:
      "The volume is small. The duration is not.",
    methodology:
      "Waste volumes from the NDA\u2019s 2022 UK Radioactive Waste and Materials Inventory. Radiation doses from UK Health Security Agency and IAEA reference values. Sellafield cleanup cost and leak figures from the National Audit Office (2024) and Public Accounts Committee (2025).",
    imagePath: "/assets/006-version2_5c838076.png",
    thumbnailPath: "/assets/poster-006-thumbnail.png",
    pdfPath: "/assets/006-version2_3b036a7e.pdf",
    narrative: {
      after: `## What the inventory actually shows

Most UK radioactive waste is lightly contaminated concrete, metal and soil from knocking down old facilities. It can be landfilled within a few years of arising. A much smaller fraction - spent fuel and reactor components - holds almost all the radioactivity. That fraction needs to be isolated from people for tens of thousands of years. The volume is small. The duration is not.

## A legacy problem

This is a legacy problem. Nearly three-quarters of the UK's radioactive waste sits on one 6 km\u00b2 site in Cumbria, most of it produced between the 1940s and the 1990s. Originally a plutonium factory for Britain's weapons programme, Sellafield became the UK's civil reprocessing hub in the 1960s. Reprocessing ended in July 2022. The site is now a storage and cleanup operation with no new nuclear mission. The reactors being built today add very little to the total. They also can't unmake what is already there.

## What's missing is the last step

A Geological Disposal Facility for higher-activity waste has been planned, in various forms, since the 1970s. A site selection process reopened in 2020. No site has been chosen. The country that built the world's first commercial reactor still has nowhere permanent to put what came out of it.`,
    },
  },
];

export const posters: PosterData[] = rawPosters.map((p) => ({
  ...p,
  webpPath: p.imagePath.replace(/\.png$/i, ".webp"),
  thumbnailWebpPath: p.thumbnailPath.replace(/\.png$/i, ".webp"),
}));

export const sectionDescriptions: Record<string, string> = {
  desirability:
    "The first three posters establish nuclear\u2019s performance on the metrics that matter most: emissions, physical footprint, and mortality rates. They draw on peer-reviewed and government data to compare electricity-generation sources on the same terms.",
  feasibility:
    "Proving desirability does not prove feasibility. These posters shift focus to the UK specifically - the scale of the energy system that needs transforming, and the country\u2019s historical pattern of announcing nuclear plans it fails to fulfil.",
  objections:
    "Addressing objections honestly is essential to the truth-teller approach. This poster confronts nuclear waste directly - both the fear mitigation and the ways the UK is falling short.",
};

export interface PosterSource {
  intro: string;
  items: string[];
  caveat: string;
}

export const posterSources: Record<string, PosterSource> = {
  "001": {
    intro:
      "This poster uses median lifecycle emissions values harmonised to grams of CO\u2082-equivalent per kilowatt-hour, drawn from three sources:",
    items: [
      "Our World in Data (2024). Lifecycle emissions of electricity sources.",
      "IPCC (2014). Climate Change 2014: Mitigation, Working Group III, Annex II.",
      "UNECE (2021). Lifecycle Assessment of Electricity Generation Options.",
    ],
    caveat:
      "Median values were used because real-project emissions vary by site, fuel grade, and construction era - ranges overlap at the edges, not the centre. Operational-only emissions, the figure most often cited in public, would understate fossil fuels (which leak methane upstream) and misrepresent nuclear and renewables (whose emissions are mostly held in construction and materials).",
  },
  "002": {
    intro:
      "This poster uses lifecycle land and water consumption figures from:",
    items: [
      "Our World in Data (2024). Land use per energy source.",
      "UNECE (2021). Lifecycle Assessment of Electricity Generation Options.",
    ],
    caveat:
      "Figures are derived from typical-project profiles, not measurements of any single plant. Nuclear\u2019s water number depends heavily on cooling design - coastal plants using seawater lose almost nothing, while inland plants with cooling towers lose the most; siting alone can swing the figure by an order of magnitude. Solar PV land use is for ground-mount; rooftop PV has near-zero additional land footprint.",
  },
  "003": {
    intro: "This poster combines three sources:",
    items: [
      "Markandya & Wilkinson (2007). Electricity generation and health. The Lancet, 370(9591), 979 - 990.",
      "Sovacool et al. (2016). Balancing safety with sustainability: assessing the risk of accidents for modern low-carbon energy systems. Journal of Cleaner Production, 112.",
      "Ember (2024). Yearly Electricity Data - UK electricity mix.",
    ],
    caveat:
      "Death rates per terawatt-hour are modelled, not counted. Most of the deaths attributed to fossil-fuel electricity are statistical attributions made through epidemiological models, not individually identifiable cases. The two right-hand scenarios are counterfactuals, not predictions: they hold UK electricity demand constant and substitute the mix, but cannot capture the political and technical conditions required to reach those mixes in practice.",
  },
  "004": {
    intro: "This poster uses UK government final-energy data:",
    items: [
      "Department for Energy Security and Net Zero (2025). Digest of UK Energy Statistics (DUKES) 2025, Tables 1.1.1, 1.1.3, and 1.1.5.",
    ],
    caveat:
      "The poster shows final energy - energy delivered to end users - rather than primary energy, which would be approximately 50% larger because it includes conversion losses. Both are legitimate framings; the choice of final energy is what makes the 18% electricity figure visible. Non-energy use of petroleum (52.7 TWh - feedstock for petrochemicals, lubricants, bitumen, waxes) is shown as where UK petroleum physically goes, not as combusted energy.",
  },
  "005": {
    intro:
      "This poster compiles the UK reactor record from three sources:",
    items: [
      "Global Energy Monitor (2025). Global Nuclear Power Tracker.",
      "Department for Energy Security and Net Zero (2024). Civil Nuclear: Roadmap to 2050.",
      "World Nuclear Association (2025). Nuclear Power in the United Kingdom - country profile.",
    ],
    caveat:
      "The data records what happened, not why. A cancelled project looks the same whether the developer walked away from the costs (as Moorside did in 2018), the government killed it (Wylfa Newydd, 2020), or a whole programme lapsed without formal closure (Wylfa SMR, 2025). Those distinctions are political and economic, and they are not in the underlying dataset. \u201CAnnounced\u201D is permissive: it includes ministerial statements, white papers, and formal planning applications without a consistent threshold. Capacity figures are nameplate, not realised generation.",
  },
  "006": {
    intro: "This poster combines four primary sources:",
    items: [
      "Nuclear Decommissioning Authority (2022). UK Radioactive Waste and Materials Inventory 2022.",
      "UK Health Security Agency, Office for Nuclear Regulation, and IAEA Specific Safety Guide SSG-23 (radiation dose comparisons).",
      "National Audit Office (2024). The Nuclear Decommissioning Authority\u2019s management of the Sellafield site.",
      "House of Commons Public Accounts Committee (2025). Sellafield risk and decommissioning progress.",
    ],
    caveat:
      "Waste volumes are as reported in the NDA\u2019s 2022 inventory; the figures will shift in subsequent updates as decommissioning proceeds. Radiation doses are averages - individual variation is significant, and the comparisons between everyday sources and waste-package contact doses are illustrative. \u201CWhere it ends up\u201D assumes the planned Geological Disposal Facility will eventually be built; site selection is not yet confirmed, and current projections place first waste emplacement between 2050 and 2060. The \u00A3136 billion Sellafield cleanup figure is the current undiscounted estimate, which has been revised upward several times.",
  },
};
