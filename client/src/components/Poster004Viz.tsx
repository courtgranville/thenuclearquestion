import InteractiveSVG, { type Region } from "@/components/InteractiveSVG";

/*
  POSTER 004 — Most of Our Energy Isn't Electricity
  
  UK final energy consumption by carrier: 1,542 TWh total.
  6 energy carriers shown as organic forms with colored circles and text labels.
  
  SVG structure (processed):
  - form-{carrier}: organic form group (fill + stroke sub-groups, 256 paths each)
  - form-hub: central total energy form (not part of any carrier highlight)
  - links-{carrier}: connection lines from carrier to end-use sectors
  - carrier-label-{carrier}: carrier name label near form
  - dot-{carrier}-{n}: end-use sector circles sized by TWh
  - text-{carrier}-{n}: end-use sector text labels
  
  Color palette (from user):
  - Bioenergy: #267c3e (green)
  - Electricity: #b4822e (ochre/gold)
  - Heat: #4b6e70 (teal)
  - Natural Gas: #1b3967 (dark blue)
  - Petroleum: #a61e23 (red)
  - Solid Fuel: #7d746b (grey/stone)
  
  Interaction: Click legend buttons or tap forms to highlight one carrier.
  When a carrier is selected, ALL other carriers' elements (forms, dots, text, links) dim.
*/

const SVG_URL = "/manus-storage/004-processed_c45fd25b.svg";

// Helper to generate sequential IDs
function genIds(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
}

const regions: Region[] = [
  {
    id: "petroleum",
    groupIds: [
      "form-petroleum",
      "links-petroleum",
      "carrier-label-petroleum",
      ...genIds("dot-petroleum", 16),
      ...genIds("text-petroleum", 16),
    ],
    name: "Petroleum",
    color: "#a61e23",
    description:
      "The largest energy carrier in the UK, dominated by transport fuels. Petroleum accounts for nearly half of all final energy consumption — a sector that electrification has barely touched.",
    info: [
      { label: "Consumption", value: "712 TWh" },
      { label: "Share", value: "46.2%" },
      { label: "Main use", value: "Transport" },
    ],
  },
  {
    id: "natural-gas",
    groupIds: [
      "form-natural-gas",
      "links-natural-gas",
      "carrier-label-natural-gas",
      ...genIds("dot-natural-gas", 12),
      ...genIds("text-natural-gas", 12),
    ],
    name: "Natural Gas",
    color: "#1b3967",
    description:
      "The second-largest carrier, primarily used for heating buildings and industrial processes. Replacing gas heating is one of the biggest challenges in decarbonisation.",
    info: [
      { label: "Consumption", value: "425 TWh" },
      { label: "Share", value: "27.6%" },
      { label: "Main use", value: "Heating" },
    ],
  },
  {
    id: "electricity",
    groupIds: [
      "form-electricity",
      "links-electricity",
      "carrier-label-electricity",
      ...genIds("dot-electricity", 12),
      ...genIds("text-electricity", 12),
    ],
    name: "Electricity",
    color: "#b4822e",
    description:
      "Electricity accounts for only 18% of final energy. The nuclear-versus-renewables debate most people have in mind is a conversation about one-fifth of the actual problem.",
    info: [
      { label: "Consumption", value: "272 TWh" },
      { label: "Share", value: "17.6%" },
      { label: "Main use", value: "Industry, domestic, services" },
    ],
  },
  {
    id: "bioenergy",
    groupIds: [
      "form-bioenergy",
      "links-bioenergy",
      "carrier-label-bioenergy",
      ...genIds("dot-bioenergy", 12),
      ...genIds("text-bioenergy", 12),
    ],
    name: "Bioenergy & Waste",
    color: "#267c3e",
    description:
      "Biomass, biogas, and waste-to-energy. A small but growing share, used in both electricity generation and direct heating.",
    info: [
      { label: "Consumption", value: "85 TWh" },
      { label: "Share", value: "5.5%" },
      { label: "Main use", value: "Industry, electricity" },
    ],
  },
  {
    id: "heat",
    groupIds: [
      "form-heat",
      "links-heat",
      "carrier-label-heat",
      ...genIds("dot-heat", 8),
      ...genIds("text-heat", 8),
    ],
    name: "Heat Sold",
    color: "#4b6e70",
    description:
      "District heating and heat sold directly to consumers. A relatively small share in the UK compared to Scandinavian countries.",
    info: [
      { label: "Consumption", value: "34 TWh" },
      { label: "Share", value: "2.2%" },
      { label: "Main use", value: "District heating" },
    ],
  },
  {
    id: "solid-fuel",
    groupIds: [
      "form-solid-fuel",
      "links-solid-fuel",
      "carrier-label-solid-fuel",
      ...genIds("dot-solid-fuel", 9),
      ...genIds("text-solid-fuel", 9),
    ],
    name: "Solid Fuel",
    color: "#7d746b",
    description:
      "Coal and manufactured solid fuels. Once the dominant energy source, now reduced to a fraction of UK consumption.",
    info: [
      { label: "Consumption", value: "10 TWh" },
      { label: "Share", value: "0.6%" },
      { label: "Main use", value: "Industry" },
    ],
  },
];

export default function Poster004Viz() {
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
