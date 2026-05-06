import InteractiveSVG, { type Region } from "@/components/InteractiveSVG";

/*
  POSTER 001 - The Emissions of Our Electricity Sources
  
  9 organic forms sized by lifecycle CO₂ emissions (gCO₂/kWh).
  Each source has: form (3D organic shape), label, value text, and dot.
  Nuclear has a green dot; all others have grey dots.
  
  Interaction: Click legend buttons or tap forms to highlight one source.
*/

const SVG_URL = "/assets/001-processed_da2eb390.svg";

const regions: Region[] = [
  {
    id: "nuclear",
    groupIds: ["form-nuclear", "label-nuclear", "value-nuclear", "dot-nuclear"],
    name: "Nuclear",
    color: "#237c3e",
    description:
      "The lowest lifecycle emissions of any electricity source. Almost all of nuclear's footprint comes from construction and fuel processing - the plant itself produces no CO₂ during operation. The 5.6 gCO₂/kWh figure is the methodological floor of the comparison.",
    info: [
      { label: "Emissions", value: "5.6 gCO₂/kWh" },
      { label: "Relative to coal", value: "173× smaller" },
    ],
  },
  {
    id: "onshore-wind",
    groupIds: ["form-onshore-wind", "label-onshore-wind", "value-onshore-wind", "dot-onshore-wind"],
    name: "Onshore Wind",
    color: "#7d746a",
    description:
      "The lowest-emission renewable in this comparison. Lifecycle emissions come almost entirely from manufacturing the turbine, blades, and concrete foundations. Operating emissions are zero.",
    info: [
      { label: "Emissions", value: "11 gCO₂/kWh" },
      { label: "Relative to coal", value: "88× smaller" },
    ],
  },
  {
    id: "offshore-wind",
    groupIds: ["form-offshore-wind", "label-offshore-wind", "value-offshore-wind", "dot-offshore-wind"],
    name: "Offshore Wind",
    color: "#7d746a",
    description:
      "Slightly higher than onshore due to subsea cabling, marine installation, and the heavier foundations needed at sea - but still extremely low compared to fossil sources.",
    info: [
      { label: "Emissions", value: "17 gCO₂/kWh" },
      { label: "Relative to coal", value: "57× smaller" },
    ],
  },
  {
    id: "solar-cadmium",
    groupIds: ["form-solar-cadmium", "label-solar-cadmium", "value-solar-cadmium", "dot-solar-cadmium"],
    name: "Solar PV (CdTe)",
    color: "#7d746a",
    description:
      "Cadmium telluride thin-film panels. Lower manufacturing energy than silicon panels, which is why their lifecycle emissions are about half. Cadmium is toxic and requires careful end-of-life handling.",
    info: [
      { label: "Emissions", value: "16 gCO₂/kWh" },
      { label: "Relative to coal", value: "61× smaller" },
    ],
  },
  {
    id: "solar-silicon",
    groupIds: ["form-solar-silicon", "label-solar-silicon", "value-solar-silicon", "dot-solar-silicon"],
    name: "Solar PV (Si)",
    color: "#7d746a",
    description:
      "Crystalline silicon panels - the most common type of solar panel deployed worldwide. Higher manufacturing energy than CdTe, but no toxic heavy metals to manage at end of life.",
    info: [
      { label: "Emissions", value: "32 gCO₂/kWh" },
      { label: "Relative to coal", value: "30× smaller" },
    ],
  },
  {
    id: "hydropower",
    groupIds: ["form-hydropower", "label-hydropower", "value-hydropower", "dot-hydropower"],
    name: "Hydropower",
    color: "#7d746a",
    description:
      "Higher than most renewables because lifecycle assessments include reservoir methane - decomposing organic matter under flooded land emits CH₄ for years after a dam is built. Tropical reservoirs are the worst offenders; northern reservoirs are much lower. The 117 figure is the global median.",
    info: [
      { label: "Emissions", value: "117 gCO₂/kWh" },
      { label: "Relative to coal", value: "8× smaller" },
    ],
  },
  {
    id: "coal-ccs",
    groupIds: ["form-coal-ccs", "label-coal-ccs", "value-coal-ccs", "dot-coal-ccs"],
    name: "Coal with CCS",
    color: "#7d746a",
    description:
      "Coal-fired generation with carbon capture and storage. CCS captures most CO₂ from the flue gas, but the energy penalty of running the capture process - plus upstream emissions from mining and transport - means the technology still produces nearly 30× more CO₂ per kWh than nuclear.",
    info: [
      { label: "Emissions", value: "294 gCO₂/kWh" },
      { label: "Relative to coal", value: "3.3× smaller" },
    ],
  },
  {
    id: "gas",
    groupIds: ["form-gas", "label-gas", "value-gas", "dot-gas"],
    name: "Gas",
    color: "#7d746a",
    description:
      "Natural gas is the cleanest of the fossil fuels - about 45% lower than coal - but still emits roughly 78× more CO₂ per kWh than nuclear. Methane leakage in the supply chain (a more potent short-term warming gas than CO₂) adds further to its real climate impact.",
    info: [
      { label: "Emissions", value: "439 gCO₂/kWh" },
      { label: "Relative to coal", value: "2.2× smaller" },
    ],
  },
  {
    id: "coal",
    groupIds: ["form-coal", "label-coal", "value-coal", "dot-coal"],
    name: "Coal",
    color: "#7d746a",
    description:
      "The highest lifecycle emissions of any major electricity source. Coal produces 173 times more CO₂ per kWh than nuclear - the ratio that defines the visual scale of this poster.",
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
