import InteractiveSVG, { type Region } from "@/components/InteractiveSVG";

/*
  POSTER 002 — The Physical Cost of a Megawatt-Hour
  
  7 energy sources, each with:
  - Organic form (3D shape) sized by combined footprint
  - Green land plane
  - Name label
  - Data quartet: land-val, land-rect, water-val, water-dot
  
  Interaction: Click legend buttons or tap forms to highlight one source.
*/

const SVG_URL = "/manus-storage/002-processed_1cd7e58f.svg";

const regions: Region[] = [
  {
    id: "nuclear",
    groupIds: [
      "form-nuclear",
      "land-nuclear",
      "label-nuclear",
      "land-val-nuclear",
      "land-rect-nuclear",
      "water-val-nuclear",
      "water-dot-nuclear",
    ],
    name: "Nuclear",
    color: "#237c3e",
    description:
      "Nuclear has the smallest land footprint of any major electricity source but relatively high water consumption due to cooling requirements.",
    info: [
      { label: "Land use", value: "0.3 km²/TWh" },
      { label: "Water use", value: "2,700 ML/TWh" },
    ],
  },
  {
    id: "gas",
    groupIds: [
      "form-gas",
      "land-gas",
      "label-gas",
      "land-val-gas",
      "land-rect-gas",
      "water-val-gas",
      "water-dot-gas",
    ],
    name: "Gas",
    color: "#b4822e",
    description:
      "Gas plants have a moderate land footprint and relatively low water consumption compared to thermal plants with cooling towers.",
    info: [
      { label: "Land use", value: "1.3 km²/TWh" },
      { label: "Water use", value: "580 ML/TWh" },
    ],
  },
  {
    id: "coal",
    groupIds: [
      "form-coal",
      "land-coal",
      "label-coal",
      "land-val-coal",
      "land-rect-coal",
      "water-val-coal",
      "water-dot-coal",
    ],
    name: "Coal",
    color: "#7d746a",
    description:
      "Coal requires significant land for mining and ash disposal, plus substantial water for cooling and coal washing.",
    info: [
      { label: "Land use", value: "2.4 km²/TWh" },
      { label: "Water use", value: "2,200 ML/TWh" },
    ],
  },
  {
    id: "coal-ccs",
    groupIds: [
      "form-coal-ccs",
      "land-coal-ccs",
      "label-coal-ccs",
      "land-val-coal-ccs",
      "land-rect-coal-ccs",
      "water-val-coal-ccs",
      "water-dot-coal-ccs",
    ],
    name: "Coal with CCS",
    color: "#7d746a",
    description:
      "Carbon capture adds additional land and water requirements on top of conventional coal — the energy penalty increases both footprints.",
    info: [
      { label: "Land use", value: "5.4 km²/TWh" },
      { label: "Water use", value: "3,200 ML/TWh" },
    ],
  },
  {
    id: "hydropower",
    groupIds: [
      "form-hydropower",
      "land-hydropower",
      "label-hydropower",
      "land-val-hydropower",
      "land-rect-hydropower",
      "water-val-hydropower",
      "water-dot-hydropower",
    ],
    name: "Hydropower",
    color: "#4b6e70",
    description:
      "Hydropower's enormous land footprint comes from reservoir surface area. Water consumption is low because the water passes through, but evaporation from reservoirs is significant.",
    info: [
      { label: "Land use", value: "18 km²/TWh" },
      { label: "Water use", value: "5,200 ML/TWh" },
    ],
  },
  {
    id: "solar-silicon",
    groupIds: [
      "form-solar-silicon",
      "land-solar-silicon",
      "label-solar-silicon",
      "land-val-solar-silicon",
      "land-rect-solar-silicon",
      "water-val-solar-silicon",
      "water-dot-solar-silicon",
    ],
    name: "Solar PV (Silicon)",
    color: "#1b3967",
    description:
      "Silicon solar panels require significant land area due to low energy density, but have very low water consumption during operation.",
    info: [
      { label: "Land use", value: "5.7 km²/TWh" },
      { label: "Water use", value: "330 ML/TWh" },
    ],
  },
  {
    id: "solar-cadmium",
    groupIds: [
      "form-solar-cadmium",
      "land-solar-cadmium",
      "label-solar-cadmium",
      "land-val-solar-cadmium",
      "land-rect-solar-cadmium",
      "water-val-solar-cadmium",
      "water-dot-solar-cadmium",
    ],
    name: "Solar PV (CdTe)",
    color: "#1b3967",
    description:
      "Cadmium telluride thin-film panels have a similar land footprint to silicon but slightly different manufacturing water requirements.",
    info: [
      { label: "Land use", value: "4.5 km²/TWh" },
      { label: "Water use", value: "270 ML/TWh" },
    ],
  },
];

export default function Poster002Viz() {
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
