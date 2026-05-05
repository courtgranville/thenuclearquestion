import InteractiveSVG, { type Region } from "@/components/InteractiveSVG";

/*
  POSTER 001 - The Emissions of Our Electricity Sources
  
  9 organic forms sized by lifecycle CO₂ emissions (gCO₂/kWh).
  Each source has: form (3D organic shape), label, value text, and dot.
  Nuclear has a green dot; all others have grey dots.
  
  Interaction: Click legend buttons or tap forms to highlight one source.
*/

const SVG_URL = "/manus-storage/001-processed_da2eb390.svg";

const regions: Region[] = [
  {
    id: "nuclear",
    groupIds: ["form-nuclear", "label-nuclear", "value-nuclear", "dot-nuclear"],
    name: "Nuclear",
    color: "#237c3e",
    description:
      "The lowest lifecycle emissions of any electricity source. Most emissions come from construction and fuel processing - the plant itself produces no CO₂ during operation.",
    info: [
      { label: "Emissions", value: "5.6 gCO₂/kWh" },
      { label: "Relative to coal", value: "173× smaller" },
    ],
  },
  {
    id: "onshore-wind",
    groupIds: [
      "form-onshore-wind",
      "label-onshore-wind",
      "value-onshore-wind",
      "dot-onshore-wind",
    ],
    name: "Onshore Wind",
    color: "#7d746a",
    description:
      "Very low lifecycle emissions, primarily from manufacturing turbine components and foundations.",
    info: [
      { label: "Emissions", value: "11 gCO₂/kWh" },
      { label: "Relative to coal", value: "88× smaller" },
    ],
  },
  {
    id: "offshore-wind",
    groupIds: [
      "form-offshore-wind",
      "label-offshore-wind",
      "value-offshore-wind",
      "dot-offshore-wind",
    ],
    name: "Offshore Wind",
    color: "#7d746a",
    description:
      "Slightly higher than onshore due to subsea cabling and marine installation, but still extremely low.",
    info: [
      { label: "Emissions", value: "12 gCO₂/kWh" },
      { label: "Relative to coal", value: "81× smaller" },
    ],
  },
  {
    id: "solar-cadmium",
    groupIds: [
      "form-solar-cadmium",
      "label-solar-cadmium",
      "value-solar-cadmium",
      "dot-solar-cadmium",
    ],
    name: "Solar PV (CdTe)",
    color: "#7d746a",
    description:
      "Cadmium telluride thin-film panels. Lower manufacturing energy than silicon, but cadmium is toxic and requires careful disposal.",
    info: [
      { label: "Emissions", value: "18 gCO₂/kWh" },
      { label: "Relative to coal", value: "54× smaller" },
    ],
  },
  {
    id: "solar-silicon",
    groupIds: [
      "form-solar-silicon",
      "label-solar-silicon",
      "value-solar-silicon",
      "dot-solar-silicon",
    ],
    name: "Solar PV (Si)",
    color: "#7d746a",
    description:
      "Crystalline silicon panels - the most common type. Higher manufacturing energy than CdTe, but no toxic heavy metals.",
    info: [
      { label: "Emissions", value: "22 gCO₂/kWh" },
      { label: "Relative to coal", value: "44× smaller" },
    ],
  },
  {
    id: "hydropower",
    groupIds: [
      "form-hydropower",
      "label-hydropower",
      "value-hydropower",
      "dot-hydropower",
    ],
    name: "Hydropower",
    color: "#7d746a",
    description:
      "Emissions vary widely depending on reservoir size and climate. Tropical reservoirs can produce significant methane from decomposing vegetation.",
    info: [
      { label: "Emissions", value: "24 gCO₂/kWh" },
      { label: "Relative to coal", value: "40× smaller" },
    ],
  },
  {
    id: "gas",
    groupIds: ["form-gas", "label-gas", "value-gas", "dot-gas"],
    name: "Gas",
    color: "#7d746a",
    description:
      "Natural gas is the cleanest fossil fuel, but still emits roughly 80× more CO₂ per kWh than nuclear. Methane leaks in the supply chain add further warming.",
    info: [
      { label: "Emissions", value: "450 gCO₂/kWh" },
      { label: "Relative to coal", value: "2.2× smaller" },
    ],
  },
  {
    id: "coal-ccs",
    groupIds: [
      "form-coal-ccs",
      "label-coal-ccs",
      "value-coal-ccs",
      "dot-coal-ccs",
    ],
    name: "Coal with CCS",
    color: "#7d746a",
    description:
      "Coal with carbon capture and storage. Captures most CO₂ from the flue gas, but the energy penalty and upstream emissions mean it still produces far more than renewables or nuclear.",
    info: [
      { label: "Emissions", value: "109 gCO₂/kWh" },
      { label: "Relative to coal", value: "8.9× smaller" },
    ],
  },
  {
    id: "coal",
    groupIds: ["form-coal", "label-coal", "value-coal", "dot-coal"],
    name: "Coal",
    color: "#7d746a",
    description:
      "The highest lifecycle emissions of any electricity source. Coal produces 173 times more CO₂ per kWh than nuclear - the ratio that defines the poster's visual scale.",
    info: [
      { label: "Emissions", value: "970 gCO₂/kWh" },
      { label: "Relative to nuclear", value: "173× larger" },
    ],
  },
];

export default function Poster001Viz() {
  return (
    <div className="w-full">
      <InteractiveSVG
        svgUrl={SVG_URL}
        regions={regions}
        maxHeight="85vh"
      />
    </div>
  );
}
