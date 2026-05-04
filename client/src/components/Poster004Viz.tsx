import InteractiveSVG, { type Region } from "@/components/InteractiveSVG";

/*
  POSTER 004 — Most of Our Energy Isn't Electricity
  
  UK final energy consumption by carrier: 1,542 TWh total.
  6 energy carriers shown as organic forms with colored circles and text labels.
  
  NOTE: The SVG IDs are mislabeled — the ID names don't match the actual colors.
  The mapping below is based on actual fill/stroke colors, not ID names.
  
  Interaction: Click legend buttons or tap forms to highlight one carrier.
  When a carrier is selected, ALL other carriers' elements (forms, dots, text) dim.
*/

const SVG_URL = "/manus-storage/004-processed_a9547a07.svg";

const regions: Region[] = [
  {
    id: "petroleum",
    groupIds: [
      // form-petroleum stroke=#a51e23 = RED ✓
      "form-petroleum",
      // dot-petroleum-* fill=#a61e23 = RED ✓
      "dot-petroleum-45", "dot-petroleum-46", "dot-petroleum-47", "dot-petroleum-48",
      "dot-petroleum-49", "dot-petroleum-50", "dot-petroleum-51", "dot-petroleum-52",
      "dot-petroleum-53", "dot-petroleum-54", "dot-petroleum-55", "dot-petroleum-56",
      "dot-petroleum-57", "dot-petroleum-58", "dot-petroleum-59", "dot-petroleum-60",
      "text-petroleum-116", "text-petroleum-118", "text-petroleum-120", "text-petroleum-128",
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
      // form-heat stroke=#1b3967 = DARK BLUE = Natural Gas
      "form-heat",
      // dot-heat-* fill=#1b3967 = DARK BLUE = Natural Gas
      "dot-heat-33", "dot-heat-34", "dot-heat-35", "dot-heat-36",
      "dot-heat-37", "dot-heat-38", "dot-heat-39", "dot-heat-40",
      "dot-heat-41", "dot-heat-42", "dot-heat-43", "dot-heat-44",
      "text-heat-102", "text-heat-103", "text-heat-104",
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
      // form-bioenergy stroke=#b4822e = OCHRE = Electricity
      "form-bioenergy",
      // dot-bioenergy-* fill=#b4822e = OCHRE = Electricity
      "dot-bioenergy-13", "dot-bioenergy-14", "dot-bioenergy-15", "dot-bioenergy-16",
      "dot-bioenergy-17", "dot-bioenergy-18", "dot-bioenergy-19", "dot-bioenergy-20",
      "dot-bioenergy-21", "dot-bioenergy-22", "dot-bioenergy-23", "dot-bioenergy-24",
      "text-bioenergy-82", "text-bioenergy-83", "text-bioenergy-84", "text-bioenergy-85",
      "text-bioenergy-86", "text-bioenergy-87", "text-bioenergy-88", "text-bioenergy-89",
      "text-bioenergy-90", "text-bioenergy-91", "text-bioenergy-92", "text-bioenergy-93",
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
      // form-electricity-2 stroke=#237c3e = GREEN = Bioenergy
      "form-electricity-2",
      // dot-electricity-* fill=#267c3e = GREEN = Bioenergy
      "dot-electricity-1", "dot-electricity-2", "dot-electricity-3", "dot-electricity-4",
      "dot-electricity-5", "dot-electricity-6", "dot-electricity-7", "dot-electricity-8",
      "dot-electricity-9", "dot-electricity-10", "dot-electricity-11", "dot-electricity-12",
      "text-electricity-70", "text-electricity-71", "text-electricity-72", "text-electricity-73",
      "text-electricity-74", "text-electricity-75", "text-electricity-76", "text-electricity-77",
      "text-electricity-78", "text-electricity-79", "text-electricity-80", "text-electricity-81",
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
      // form-natural-gas stroke=#4b6e70 = TEAL = Heat
      "form-natural-gas",
      // dot-natural-gas-* fill=#4b6e70 = TEAL = Heat
      "dot-natural-gas-25", "dot-natural-gas-26", "dot-natural-gas-27", "dot-natural-gas-28",
      "dot-natural-gas-29", "dot-natural-gas-30", "dot-natural-gas-31", "dot-natural-gas-32",
      "text-natural-gas-94", "text-natural-gas-95", "text-natural-gas-96", "text-natural-gas-97",
      "text-natural-gas-98", "text-natural-gas-99", "text-natural-gas-100", "text-natural-gas-101",
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
      // form-solid-fuel stroke=#7d746a = GREY ✓
      "form-solid-fuel",
      // dot-solid-fuel-* fill=#7d746b = GREY ✓
      "dot-solid-fuel-61", "dot-solid-fuel-62", "dot-solid-fuel-63", "dot-solid-fuel-64",
      "dot-solid-fuel-65", "dot-solid-fuel-66", "dot-solid-fuel-67", "dot-solid-fuel-68",
      "dot-solid-fuel-69",
      "text-solid-fuel-130", "text-solid-fuel-131", "text-solid-fuel-138",
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
