import InteractiveSVG, { type Region } from "@/components/InteractiveSVG";

/*
  POSTER 002 - The Physical Cost of a Megawatt-Hour
  
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
      "land-gas",
      "land-val-hydropower",
      "water-val-hydropower",
      "land-rect-hydropower",
      "water-dot-hydropower",
      "annotation-50",
    ],
    name: "Nuclear",
    color: "#237c3e",
    description:
      "The smallest physical footprint of any firm power source. Nuclear's land use is dominated by the exclusion zone, not the reactor itself; its water use is cooling water, most of which is returned to the source. The combination of minimal land and moderate water makes it the least physically intrusive firm generation technology.",
    info: [
      { label: "Land use", value: "0.31 m\u00b2\u00b7year/MWh" },
      { label: "Water use", value: "22 m\u00b3/MWh" },
    ],
  },
  {
    id: "gas",
    groupIds: [
      "form-gas",
      "label-gas",
      "land-nuclear",
      "land-val-coal-ccs",
      "water-val-coal-ccs",
      "land-rect-coal-ccs",
      "water-dot-coal-ccs",
    ],
    name: "Gas",
    color: "#b4822e",
    description:
      "Gas plants are compact and fast to build, but their lifecycle land footprint includes upstream extraction infrastructure. Water consumption is lower than coal because combined-cycle plants are more thermally efficient - less waste heat to reject.",
    info: [
      { label: "Land use", value: "2.35 m\u00b2\u00b7year/MWh" },
      { label: "Water use", value: "12 m\u00b3/MWh" },
    ],
  },
  {
    id: "coal",
    groupIds: [
      "form-coal",
      "label-coal",
      "land-coal",
      "land-val-gas",
      "water-val-gas",
      "land-rect-gas",
      "water-dot-gas",
    ],
    name: "Coal",
    color: "#7d746a",
    description:
      "Coal's land footprint includes open-cast mines, ash ponds, and rail corridors. Its water consumption is high because subcritical boilers reject large amounts of waste heat through evaporative cooling towers. Both measures are significantly worse than gas.",
    info: [
      { label: "Land use", value: "14.88 m\u00b2\u00b7year/MWh" },
      { label: "Water use", value: "120 m\u00b3/MWh" },
    ],
  },
  {
    id: "coal-ccs",
    groupIds: [
      "form-coal-ccs",
      "label-coal-ccs",
      "land-solar-silicon",
      "land-val-solar-silicon",
      "water-val-solar-silicon",
      "land-rect-solar-silicon",
      "water-dot-solar-silicon",
      "annotation-55",
      "annotation-56",
    ],
    name: "Coal with CCS",
    color: "#7d746a",
    description:
      "Carbon capture roughly doubles coal's water demand. Cleaning emissions has a physical cost of its own - the energy penalty of running the capture process means more fuel burned, more cooling water consumed, and more land disturbed per MWh delivered.",
    info: [
      { label: "Land use", value: "21.06 m\u00b2\u00b7year/MWh" },
      { label: "Water use", value: "224 m\u00b3/MWh" },
    ],
  },
  {
    id: "hydropower",
    groupIds: [
      "form-hydropower",
      "label-hydropower",
      "land-hydropower",
      "land-val-solar-cadmium",
      "water-val-solar-cadmium",
      "land-rect-solar-cadmium",
      "water-dot-solar-cadmium",
      "annotation-51",
      "annotation-57",
    ],
    name: "Hydropower",
    color: "#4b6e70",
    description:
      "The largest land footprint of any source on this poster - the area is the reservoir surface, not the powerhouse - but the lowest water consumption per MWh, because the water passes through. Hydropower wins on water and loses on land. No source wins on every measure.",
    info: [
      { label: "Land use", value: "33.39 m\u00b2\u00b7year/MWh" },
      { label: "Water use", value: "13 m\u00b3/MWh" },
    ],
  },
  {
    id: "solar-silicon",
    groupIds: [
      "form-solar-silicon",
      "label-solar-silicon",
      "land-coal-ccs",
      "land-val-nuclear",
      "water-val-nuclear",
      "land-rect-nuclear",
      "water-dot-nuclear",
      "annotation-52",
      "annotation-53",
      "annotation-54",
    ],
    name: "Solar PV (Silicon)",
    color: "#1b3967",
    description:
      "Crystalline silicon panels. A significant land footprint per MWh because of low energy density per square metre, but very low water consumption - manufacturing dominates the figure.",
    info: [
      { label: "Land use", value: "19.22 m\u00b2\u00b7year/MWh" },
      { label: "Water use", value: "35 m\u00b3/MWh" },
    ],
  },
  {
    id: "solar-cadmium",
    groupIds: [
      "form-solar-cadmium",
      "label-solar-cadmium",
      "land-solar-cadmium",
      "land-val-coal",
      "water-val-coal",
      "land-rect-coal",
      "water-dot-coal",
      "annotation-52",
      "annotation-53",
      "annotation-54",
    ],
    name: "Solar PV (CdTe)",
    color: "#1b3967",
    description:
      "Cadmium telluride thin-film panels have a smaller land footprint than silicon and lower water consumption - materials choice can change the footprint as much as the technology does.",
    info: [
      { label: "Land use", value: "12.65 m\u00b2\u00b7year/MWh" },
      { label: "Water use", value: "8 m\u00b3/MWh" },
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
