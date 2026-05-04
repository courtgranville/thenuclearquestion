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
  pdfPath: string;
}

export const posters: PosterData[] = [
  {
    id: "001",
    number: "001",
    title: "The Emissions of Our Electricity Sources",
    subtitle: "How many greenhouse gases are produced in each source's lifecycle",
    section: "desirability",
    sectionLabel: "Desirability",
    description:
      "The first poster addresses one of the primary points in any climate debate: the benefits of renewable and clean energy sources over fossil fuels. Nine electricity-generation sources are shown as organic forms, scaled so their areas are proportional to lifecycle emissions, measured in grams of CO\u2082 per kilowatt-hour. The smallest form is nuclear (5.6 gCO\u2082/kWh), and the largest is coal (970 gCO\u2082/kWh). The proportionality makes the argument itself \u2014 coal occupies 173 times the area of nuclear.",
    keyInsight:
      "The decision to use lifecycle emissions rather than operational emissions was significant. Operational figures only count emissions from the power plant itself, which underestimates fossil fuels (which leak methane further up the supply chain) and misrepresents nuclear and renewables, whose emissions are almost entirely held in the construction and materials of the plants.",
    pullQuote:
      "Public argument treats nuclear as a fossil-fuel cousin. By the only measure that compares plants on the same terms, it isn\u2019t.",
    methodology:
      "Median values from peer-reviewed lifecycle assessments compiled by Our World in Data, IPCC AR5, and UNECE. Real projects vary by site and fuel grade \u2014 ranges overlap at the edges, not the centre.",
    imagePath: "/manus-storage/001-version2_643b19ce.png",
    pdfPath: "/manus-storage/001-version2_a9296d6a.pdf",
  },
  {
    id: "002",
    number: "002",
    title: "The Physical Cost of a Megawatt-Hour",
    subtitle: "Lifecycle land use and water consumption per electricity source",
    section: "desirability",
    sectionLabel: "Desirability",
    description:
      "The second poster shifts from emissions to physical costs: water consumption and land use. Each source is split into two forms \u2014 one for water consumption (blue, circular) and one for land use (green surface area). Both are normalised per megawatt-hour. Combining these two metrics by placing them one atop the other makes the quantities feel physical and allows the sources to be compared directly.",
    keyInsight:
      "No source of electricity is perfect. Hydropower performs well on water consumption, but its land footprint is massive due to reservoir surface area. The poster is honest about nuclear\u2019s strengths and weaknesses: land use is low, but water consumption is relatively high. Omitting these weaknesses would simplify the advocacy argument but weaken its foundation.",
    pullQuote:
      "The nuclear question is never a clean argument. To take part, one must be prepared to compromise \u2014 it\u2019s about deciding where the right compromises are.",
    methodology:
      "Lifecycle land-use data from UNECE (2021) and water-consumption data from peer-reviewed lifecycle assessment literature. Both metrics normalised to per-MWh values for direct comparison.",
    imagePath: "/manus-storage/002-version2_b4d2d765.png",
    pdfPath: "/manus-storage/002-version2_14df9892.pdf",
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
      "The third poster takes a different approach, employing speculative future scenarios grounded in current data. It models three UK electricity-mix scenarios at constant 284 TWh demand: today\u2019s mix (14% nuclear), a 30% nuclear scenario, and a 70% nuclear scenario. Each scenario shows estimated annual deaths as red dots and lives saved as green dots, with organic forms sized by each source\u2019s share of total deaths.",
    keyInsight:
      "Mortality from energy production is normally given as a rate \u2014 precise but not relatable. Showing each death as an individual dot allows the viewer to connect scenarios to the deaths they cause. The journey from the UK\u2019s current nuclear proportion to France\u2019s current proportion is measured in lives saved.",
    pullQuote:
      "Everyday fossil-fuel mortality is largely invisible compared with highly memorable nuclear accidents. The statistics tell a different story.",
    methodology:
      "Mortality rates from Markandya & Wilkinson (2007) and Sovacool et al. (2016), applied to UK electricity demand of 284 TWh. Scenarios hold demand constant to isolate the effect of changing the energy mix.",
    imagePath: "/manus-storage/003-version2_4e239d18.png",
    pdfPath: "/manus-storage/003-version2_b27a85d6.pdf",
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
      "The fourth poster shifts focus from electricity generation to the entire UK energy system. In 2024, the UK used 1,542 TWh of final energy. Electricity accounts for only 18% of that total. Petroleum accounts for 47% and natural gas for 28% \u2014 both exceeding the entire electricity system by a significant margin. A radial dendrogram visualises the system as a whole, branching from total energy into primary carriers, then into end-use sectors.",
    keyInsight:
      "The scale of this problem is critical to any debate about switching to renewables or nuclear. Changing our sources of electricity only impacts 18% of the final energy system. The rest is unaffected unless widespread electrification takes place. The nuclear-versus-renewables conversation most people have in mind is a conversation about one-fifth of the actual problem.",
    pullQuote:
      "Decarbonising how we generate electricity only decarbonises the fraction of the system already running on it. Everything else still burns.",
    methodology:
      "Final energy consumption data from the Digest of UK Energy Statistics (DUKES) 2025, Tables 1.1.1, 1.1.2 and 1.2.5. Final energy is energy delivered to end users, per DUKES convention.",
    imagePath: "/manus-storage/004-version2_1f18c33d.png",
    pdfPath: "/manus-storage/004-version2_014ffb7f.pdf",
  },
  {
    id: "005",
    number: "005",
    title: "Where Are All Britain\u2019s Reactors?",
    subtitle:
      "Every civil reactor the UK has built, operated, planned or abandoned (1953\u20132026)",
    section: "feasibility",
    sectionLabel: "Feasibility",
    description:
      "The fifth poster maps every civil nuclear reactor the UK has built, operated, planned or abandoned from 1953 to 2026, organised by status: operating, under construction, shelved, retired, and cancelled. A UK map shows site clusters, a status dendrogram organises the reactors, and a construction timeline runs along the bottom.",
    keyInsight:
      "The UK rapidly built reactors in the mid-20th century, only to abruptly stop. Since the mid-1990s, more than 35 projects have been announced, but no new reactor has been switched on in the last 31 years. The pattern is one of repeated announcements followed by failure to deliver \u2014 over 14,000 MW of announced capacity was never built.",
    pullQuote:
      "The country that built the world\u2019s first commercial nuclear reactor is now the most expensive place in the world to build one.",
    methodology:
      "Reactor data compiled from the Global Energy Monitor Nuclear Power Tracker (2025) and the World Nuclear Association country profile for the United Kingdom. The dataset records project outcomes, not reasons for cancellation.",
    imagePath: "/manus-storage/005-preview-1_fea2ab19.png",
    pdfPath: "/manus-storage/005-version2_ad4c9725.pdf",
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
      "The final poster addresses nuclear waste \u2014 one of the most contested topics in the nuclear debate. It shows the quantity of different types of radioactive waste currently in the UK, colour-coded by category. The poster discusses where waste comes from (with Sellafield holding the vast majority), and is honest about the environmental, economic and political challenges this presents. It also contextualises radiation doses against everyday exposures.",
    keyInsight:
      "This is the most information-dense poster in the series, intentionally so. The waste discussion is presented in full rather than simplified, because it is a complex and often misunderstood topic, and because it is often the most emotionally charged one. The poster demonstrates that 78.4% of the UK\u2019s radioactive waste is concentrated at a single site in Cumbria.",
    pullQuote:
      "Nuclear energy looks more defensible than most people expect. Waste is the question those findings don\u2019t answer. It is the objection that survives the others, and the hesitation isn\u2019t irrational.",
    methodology:
      "Waste volumes from the NDA\u2019s 2022 UK Radioactive Waste and Materials Inventory. Radiation doses from UK Health Security Agency and IAEA reference values. Sellafield cleanup cost and leak figures from the National Audit Office (2024) and Public Accounts Committee (2025).",
    imagePath: "/manus-storage/006-version2_5c838076.png",
    pdfPath: "/manus-storage/006-version2_3b036a7e.pdf",
  },
];

export const sectionDescriptions: Record<string, string> = {
  desirability:
    "The first three posters establish nuclear\u2019s performance on the metrics that matter most: emissions, physical footprint, and mortality rates. They draw on peer-reviewed and government data to compare electricity-generation sources on the same terms.",
  feasibility:
    "Proving desirability does not prove feasibility. These posters shift focus to the UK specifically \u2014 the scale of the energy system that needs transforming, and the country\u2019s historical pattern of announcing nuclear plans it fails to fulfil.",
  objections:
    "Addressing objections honestly is essential to the truth-teller approach. This poster confronts nuclear waste directly \u2014 both the fear mitigation and the ways the UK is falling short.",
};
