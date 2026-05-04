import InteractiveSVG, { type Region } from "@/components/InteractiveSVG";

/*
  POSTER 002 — The Physical Cost of a Megawatt-Hour
  
  IMPORTANT: The SVG element IDs do NOT match their visual positions.
  For example, "land-nuclear" is visually located under the Gas blob.
  
  The mapping below is based on getBoundingClientRect() screen position
  analysis, matching each element to the nearest source blob (form).
  
  Visual layout (top-left to bottom-right):
    Row 1: Coal (top-center), Coal CCS (top-right)
    Row 2: Nuclear (left), Gas (center), Hydropower (right)
    Row 3: Solar Silicon (center-bottom), Solar Cadmium (bottom-right)
*/

const SVG_URL = "/manus-storage/002-processed_1cd7e58f.svg";

const regions: Region[] = [
  {
    id: "nuclear",
    groupIds: [
      "form-nuclear",
      "label-nuclear",
      // land-gas is visually under Nuclear's blob
      "land-gas",
      // hydropower vals are visually next to Nuclear's label
      "land-val-hydropower",
      "water-val-hydropower",
      "land-rect-hydropower",
      "water-dot-hydropower",
      // Nuclear's annotation (land footprint text)
      "annotation-50",
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
      "label-gas",
      // land-nuclear is visually under Gas's blob
      "land-nuclear",
      // coal-ccs vals are visually next to Gas's label
      "land-val-coal-ccs",
      "water-val-coal-ccs",
      "land-rect-coal-ccs",
      "water-dot-coal-ccs",
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
      "label-coal",
      // land-coal is correctly positioned under Coal's blob
      "land-coal",
      // gas vals are visually next to Coal's label
      "land-val-gas",
      "water-val-gas",
      "land-rect-gas",
      "water-dot-gas",
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
      "label-coal-ccs",
      // land-solar-silicon is visually under Coal CCS's blob
      "land-solar-silicon",
      // solar-silicon vals are visually next to Coal CCS's label
      "land-val-solar-silicon",
      "water-val-solar-silicon",
      "land-rect-solar-silicon",
      "water-dot-solar-silicon",
      // Coal CCS annotation (carbon capture text + arrow)
      "annotation-55",
      "annotation-56",
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
      "label-hydropower",
      // land-hydropower is correctly positioned under Hydropower's blob
      "land-hydropower",
      // solar-cadmium vals are visually next to Hydropower's label
      "land-val-solar-cadmium",
      "water-val-solar-cadmium",
      "land-rect-solar-cadmium",
      "water-dot-solar-cadmium",
      // Hydropower annotation (reservoir text + arrow)
      "annotation-51",
      "annotation-57",
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
      "label-solar-silicon",
      // land-coal-ccs is visually under Solar Silicon's blob
      "land-coal-ccs",
      // nuclear vals are visually next to Solar Silicon's label
      "land-val-nuclear",
      "water-val-nuclear",
      "land-rect-nuclear",
      "water-dot-nuclear",
      // Shared solar annotation (two technologies text + connector arrows)
      "annotation-52",
      "annotation-53",
      "annotation-54",
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
      "label-solar-cadmium",
      // land-solar-cadmium is correctly positioned under Solar Cadmium's blob
      "land-solar-cadmium",
      // coal vals are visually next to Solar Cadmium's label
      "land-val-coal",
      "water-val-coal",
      "land-rect-coal",
      "water-dot-coal",
      // Shared solar annotation (two technologies text + connector arrows)
      "annotation-52",
      "annotation-53",
      "annotation-54",
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
