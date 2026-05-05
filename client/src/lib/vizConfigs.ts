import type { Region } from "@/components/InteractiveSVG";

/*
  VISUALISATION CONFIGURATIONS
  
  Each poster's interactive SVGs are configured here with:
  - SVG URL (processed with semantic group IDs)
  - Region definitions (group IDs, names, colors, info data)
*/

// ============================================================
// POSTER 006 - Britain's Nuclear Waste
// ============================================================

export const wasteQuantitiesConfig = {
  svgUrl: "/manus-storage/006-waste-quantities-v4_5eb3cae5.svg",
  regions: [
    {
      id: "vllw",
      groupIds: ["blob-vllw", "label-vllw", "data-vllw"],
      name: "VLLW",
      color: "#7d746a",
      description:
        "Very low level waste - rubble, soil, building materials lightly contaminated by decades of nuclear operation. The radioactivity is low enough that this material can be disposed of in landfill-type facilities under regulatory permits. The largest fraction by volume; a vanishingly small fraction by radioactivity.",
      info: [
        { label: "Volume", value: "2,610,000 m\u00B3" },
        { label: "% of Total", value: "58.6%" },
        { label: "Radioactivity", value: "<0.001%" },
      ],
    },
    {
      id: "llw",
      groupIds: ["blob-llw", "label-llw", "data-llw"],
      name: "LLW",
      color: "#4b6e70",
      description:
        "Low level waste - protective clothing, tools, filters, and metal from day-to-day operations and decommissioning. Contains short-lived radioactivity. Compacted, grouted into containers, and stored in engineered vaults at the Low Level Waste Repository in Cumbria and at Dounreay.",
      info: [
        { label: "Volume", value: "1,340,000 m\u00B3" },
        { label: "% of Total", value: "30.2%" },
        { label: "Radioactivity", value: "<0.001%" },
      ],
    },
    {
      id: "ilw",
      groupIds: ["blob-ilw", "label-ilw", "data-ilw"],
      name: "ILW",
      color: "#1b3967",
      description:
        "Intermediate level waste - reactor components, chemical sludges, and resins from reprocessing. Requires shielding during handling but not active cooling. Typically encased in cement or bitumen and stored in engineered vaults pending the geological disposal facility.",
      info: [
        { label: "Volume", value: "496,000 m\u00B3" },
        { label: "% of Total", value: "11.1%" },
        { label: "Radioactivity", value: "4.4%" },
      ],
    },
    {
      id: "hlw",
      groupIds: ["blob-hlw", "label-hlw", "data-hlw"],
      name: "HLW",
      color: "#a51e23",
      description:
        "High level waste - spent fuel and reprocessing liquors. Extremely radioactive and heat-generating. Requires deep geological disposal. Despite holding 95.6% of all the radioactivity in the UK's inventory, it occupies less than a tenth of one per cent of the volume - a tiny amount of intensely problematic material.",
      info: [
        { label: "Volume", value: "1,470 m\u00B3" },
        { label: "% of Total", value: "<0.1%" },
        { label: "Radioactivity", value: "95.6%" },
      ],
    },
  ] as Region[],
};

export const radiationDosesConfig = {
  svgUrl: "/manus-storage/006-radiation-doses-processed_372c6bea.svg",
  regions: [
    {
      id: "dose-reactor",
      groupIds: ["dose-reactor"],
      name: "Near a reactor",
      color: "#a51e23",
      description:
        "Living 1 km from a UK nuclear reactor for an entire year. This is far below the dose from a single dental x-ray.",
      info: [
        { label: "Dose", value: "0.003 mSv" },
        { label: "Equivalent to", value: "~1 hour of background radiation" },
      ],
    },
    {
      id: "dose-dental",
      groupIds: ["dose-dental"],
      name: "Dental x-ray",
      color: "#a51e23",
      description:
        "A single dental x-ray. One of the lowest medical radiation exposures.",
      info: [
        { label: "Dose", value: "0.005 mSv" },
        { label: "Equivalent to", value: "~2 hours of background radiation" },
      ],
    },
    {
      id: "dose-chest",
      groupIds: ["dose-chest"],
      name: "Chest x-ray",
      color: "#a51e23",
      description:
        "A standard chest x-ray. Still a very small dose in context.",
      info: [
        { label: "Dose", value: "0.02 mSv" },
        { label: "Equivalent to", value: "~3 days of background radiation" },
      ],
    },
    {
      id: "dose-llw",
      groupIds: ["dose-llw"],
      name: "LLW drum",
      color: "#a51e23",
      description:
        "Standing 1 hour next to a low-level waste drum. The dose is comparable to a chest x-ray.",
      info: [
        { label: "Dose", value: "0.05 mSv" },
        { label: "Equivalent to", value: "~1 week of background radiation" },
      ],
    },
    {
      id: "dose-flight",
      groupIds: ["dose-flight"],
      name: "Transatlantic flight",
      color: "#a51e23",
      description:
        "A single transatlantic flight. Cosmic radiation exposure increases at altitude.",
      info: [
        { label: "Dose", value: "0.08 mSv" },
        { label: "Equivalent to", value: "~11 days of background radiation" },
      ],
    },
    {
      id: "dose-ilw",
      groupIds: ["dose-ilw"],
      name: "ILW package",
      color: "#a51e23",
      description:
        "Standing 1 hour next to an intermediate-level waste package. Requires shielding during handling.",
      info: [
        { label: "Dose", value: "2 mSv" },
        { label: "Equivalent to", value: "~9 months of background radiation" },
      ],
    },
    {
      id: "dose-hlw",
      groupIds: ["dose-hlw"],
      name: "HLW flask",
      color: "#a51e23",
      description:
        "Standing 1 hour next to a high-level waste transport flask. The flask's shielding limits the dose to the same level as an ILW package.",
      info: [
        { label: "Dose", value: "2 mSv" },
        { label: "Equivalent to", value: "~9 months of background radiation" },
      ],
    },
    {
      id: "dose-background",
      groupIds: ["dose-background"],
      name: "Background radiation",
      color: "#a51e23",
      description:
        "The annual dose every person in the UK receives from natural background radiation (radon, cosmic rays, food, ground).",
      info: [
        { label: "Dose", value: "2.7 mSv" },
        { label: "Equivalent to", value: "Annual UK average" },
      ],
    },
    {
      id: "dose-ct",
      groupIds: ["dose-ct"],
      name: "CT scan",
      color: "#a51e23",
      description:
        "A CT scan of the abdomen. One of the highest common medical exposures - yet routinely performed millions of times per year.",
      info: [
        { label: "Dose", value: "10 mSv" },
        { label: "Equivalent to", value: "~4 years of background radiation" },
      ],
    },
  ] as Region[],
};

export const wasteLocationsConfig = {
  svgUrl: "/manus-storage/006-waste-locations-processed_6ed9ecfd.svg",
  regions: [
    {
      id: "loc-total",
      groupIds: ["loc-total"],
      name: "Total",
      color: "#7d746a",
      description:
        "The total volume of radioactive waste in the UK, held across all sites.",
      info: [
        { label: "Volume", value: "4,580,000 m\u00B3" },
        { label: "Share", value: "100%" },
      ],
    },
    {
      id: "loc-sellafield",
      groupIds: ["loc-sellafield"],
      name: "Sellafield",
      color: "#a51e23",
      description:
        "The UK's largest nuclear complex in Cumbria. Holds the vast majority of the country's radioactive waste due to decades of reprocessing and military plutonium production.",
      info: [
        { label: "Volume", value: "3,320,000 m\u00B3" },
        { label: "Share", value: "72.4%" },
      ],
    },
    {
      id: "loc-magnox",
      groupIds: ["loc-magnox"],
      name: "Magnox Sites",
      color: "#7d746a",
      description:
        "The UK's first-generation commercial reactors, now all shut down and in various stages of decommissioning.",
      info: [
        { label: "Volume", value: "563,000 m\u00B3" },
        { label: "Share", value: "12.3%" },
      ],
    },
    {
      id: "loc-others",
      groupIds: ["loc-others"],
      name: "Others",
      color: "#7d746a",
      description:
        "Medical, research, and fuel-cycle facilities that produce smaller quantities of radioactive waste. Hospitals, universities, fuel fabrication sites, and the older defence research footprint outside the dedicated military category.",
      info: [
        { label: "Volume", value: "370,000 m\u00B3" },
        { label: "Share", value: "8.1%" },
      ],
    },
    {
      id: "loc-agr",
      groupIds: ["loc-agr"],
      name: "AGR & PWR",
      color: "#7d746a",
      description:
        "Advanced Gas-cooled Reactors and Pressurised Water Reactors - the UK's second and third generation of commercial nuclear power stations.",
      info: [
        { label: "Volume", value: "156,000 m\u00B3" },
        { label: "Share", value: "3.4%" },
      ],
    },
    {
      id: "loc-dounreay",
      groupIds: ["loc-dounreay"],
      name: "Dounreay",
      color: "#7d746a",
      description:
        "A former fast-reactor research site in northern Scotland, now undergoing complex decommissioning.",
      info: [
        { label: "Volume", value: "114,000 m\u00B3" },
        { label: "Share", value: "2.5%" },
      ],
    },
    {
      id: "loc-defence",
      groupIds: ["loc-defence"],
      name: "Defence",
      color: "#7d746a",
      description:
        "Military nuclear sites including submarine reactor facilities and weapons establishments.",
      info: [
        { label: "Volume", value: "51,900 m\u00B3" },
        { label: "Share", value: "1.1%" },
      ],
    },
    {
      id: "loc-hinkley",
      groupIds: ["loc-hinkley"],
      name: "Hinkley Point C",
      color: "#7d746a",
      description:
        "The UK's only reactor currently under construction. The volume here is forward-looking - waste it will generate over its operating lifetime once it switches on, not waste already produced.",
      info: [
        { label: "Volume", value: "9,970 m\u00B3" },
        { label: "Share", value: "0.2%" },
      ],
    },
  ] as Region[],
};

export const wasteStorageConfig = {
  svgUrl: "/manus-storage/006-waste-storage-processed_b5825c08.svg",
  regions: [
    {
      id: "storage-landfill",
      groupIds: ["storage-landfill"],
      name: "Landfill",
      color: "#7d746a",
      description:
        "Very low-level and low-level waste disposed of at authorised landfill sites. The radioactivity is low enough that standard landfill engineering provides adequate containment.",
      info: [
        { label: "Volume", value: "3,340,000 m\u00B3" },
        { label: "Waste types", value: "LLW & VLLW" },
      ],
    },
    {
      id: "storage-vaults",
      groupIds: ["storage-vaults"],
      name: "Near-Surface Vaults",
      color: "#4b6e70",
      description:
        "Engineered concrete vaults at the Low Level Waste Repository in Cumbria and at Dounreay. Waste is grouted into containers and stacked in vaults that will be capped and monitored.",
      info: [
        { label: "Volume", value: "255,000 m\u00B3" },
        { label: "Location", value: "LLWR (Cumbria) & Dounreay" },
      ],
    },
    {
      id: "storage-treatment",
      groupIds: ["storage-treatment"],
      name: "Treatment & Recycling",
      color: "#1b3967",
      description:
        "Waste that is recycled, incinerated, or released below regulatory thresholds. Reduces the volume requiring long-term storage.",
      info: [
        { label: "Volume", value: "440,000 m\u00B3" },
        { label: "Methods", value: "Recycled, incinerated, or released" },
      ],
    },
    {
      id: "storage-gdf",
      groupIds: ["storage-gdf"],
      name: "Geological Disposal",
      color: "#a51e23",
      description:
        "A deep geological disposal facility for intermediate and high-level waste. The UK has not yet selected a site - the process is ongoing with community consent required.",
      info: [
        { label: "Volume", value: "499,000 m\u00B3" },
        { label: "Status", value: "Site not yet selected" },
      ],
    },
  ] as Region[],
};

// ============================================================
// POSTER 005 - Where Are All Britain's Reactors?
// ============================================================

export const reactorMapConfig = {
  svgUrl: "", // Will be set after processing
  regions: [
    {
      id: "operating",
      groupIds: ["layer-main-operating"],
      name: "Operating",
      color: "#2d6a4f",
      description: "Reactors currently generating electricity.",
      info: [],
    },
    {
      id: "future",
      groupIds: ["layer-main-future"],
      name: "Under construction",
      color: "#b5822e",
      description: "Reactors currently being built or with firm construction commitments.",
      info: [],
    },
    {
      id: "paused",
      groupIds: ["layer-main-paused"],
      name: "Paused / Shelved",
      color: "#7d746a",
      description: "Projects announced but subsequently paused or shelved without formal cancellation.",
      info: [],
    },
    {
      id: "past",
      groupIds: ["layer-main-past"],
      name: "Retired",
      color: "#555555",
      description: "Reactors that operated and have since been permanently shut down.",
      info: [],
    },
    {
      id: "abandoned",
      groupIds: ["layer-main-abandoned"],
      name: "Cancelled",
      color: "#a51e23",
      description: "Projects that were formally cancelled before completion.",
      info: [],
    },
  ] as Region[],
};

// ============================================================
// POSTER 003 - The Lives We Could Save (3 scenarios)
// ============================================================

export const scenarioConfigs = {
  S1: {
    title: "Scenario 1: Today\u2019s Mix (14% nuclear)",
    deaths: "699 estimated deaths per year",
    dotsSvgUrl: "", // Will be set after processing
    deathsSvgUrl: "",
    dendrogramSvgUrl: "",
  },
  S2: {
    title: "Scenario 2: 30% Nuclear",
    deaths: "Fewer estimated deaths per year",
    dotsSvgUrl: "",
    deathsSvgUrl: "",
    dendrogramSvgUrl: "",
  },
  S3: {
    title: "Scenario 3: 70% Nuclear",
    deaths: "Fewest estimated deaths per year",
    dotsSvgUrl: "",
    deathsSvgUrl: "",
    dendrogramSvgUrl: "",
  },
};
