import InteractiveSVG, { type Region } from "@/components/InteractiveSVG";

/*
  POSTER 004 - Most of Our Energy Isn't Electricity
  
  UK final energy consumption by carrier: 1,542 TWh total.
  6 energy carriers shown as organic forms with colored circles and text labels.
  
  NOTE: The SVG IDs are mislabeled - the ID names don't match the actual colors.
  The mapping below is based on actual fill/stroke colors, not ID names.
  
  Interaction: Click legend buttons or tap forms to highlight one carrier.
  When a carrier is selected, ALL other carriers' elements (forms, dots, text) dim.
*/

const SVG_URL = "/manus-storage/004-processed_a9547a07.svg";

const regions: Region[] = [
  {
    id: "petroleum",
    groupIds: [
      "form-petroleum",
      "dot-petroleum-45", "dot-petroleum-46", "dot-petroleum-47", "dot-petroleum-48",
      "dot-petroleum-49", "dot-petroleum-50", "dot-petroleum-51", "dot-petroleum-52",
      "dot-petroleum-53", "dot-petroleum-54", "dot-petroleum-55", "dot-petroleum-56",
      "dot-petroleum-57", "dot-petroleum-58", "dot-petroleum-59", "dot-petroleum-60",
      "text-petroleum-116", "text-petroleum-118", "text-petroleum-120", "text-petroleum-128",
    ],
    name: "Petroleum",
    color: "#a61e23",
    description:
      "The largest energy carrier in the UK, dominated by transport fuels - petrol, diesel, jet fuel, marine diesel. Petroleum alone accounts for nearly half of all final energy consumption, a sector electrification has barely touched.",
    info: [
      { label: "Consumption", value: "729 TWh" },
      { label: "Share", value: "47%" },
      { label: "Main use", value: "Transport" },
    ],
  },
  {
    id: "natural-gas",
    groupIds: [
      "form-heat",
      "dot-heat-33", "dot-heat-34", "dot-heat-35", "dot-heat-36",
      "dot-heat-37", "dot-heat-38", "dot-heat-39", "dot-heat-40",
      "dot-heat-41", "dot-heat-42", "dot-heat-43", "dot-heat-44",
      "text-heat-102", "text-heat-103", "text-heat-104",
    ],
    name: "Natural Gas",
    color: "#1b3967",
    description:
      "The second-largest carrier, used mostly for heating buildings and industrial processes. Replacing the UK's 23 million gas boilers is one of the largest infrastructure challenges in any decarbonisation pathway.",
    info: [
      { label: "Consumption", value: "423 TWh" },
      { label: "Share", value: "28%" },
      { label: "Main use", value: "Heating" },
    ],
  },
  {
    id: "electricity",
    groupIds: [
      "form-bioenergy",
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
      "Electricity is just 18% of UK final energy. The nuclear-versus-renewables debate most people have in mind is a conversation about one fifth of the actual problem - everything else still burns until it is electrified.",
    info: [
      { label: "Consumption", value: "271 TWh" },
      { label: "Share", value: "18%" },
      { label: "Main use", value: "Industry, domestic, services" },
    ],
  },
  {
    id: "bioenergy",
    groupIds: [
      "form-electricity-2",
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
      "Biomass, biogas, and waste-to-energy. A small but meaningful share, used in both electricity generation (Drax) and direct heating. Whether bioenergy is genuinely low-carbon depends heavily on feedstock and supply chain.",
    info: [
      { label: "Consumption", value: "83 TWh" },
      { label: "Share", value: "5%" },
      { label: "Main use", value: "Industry, electricity" },
    ],
  },
  {
    id: "solid-fuel",
    groupIds: [
      "form-solid-fuel",
      "dot-solid-fuel-61", "dot-solid-fuel-62", "dot-solid-fuel-63", "dot-solid-fuel-64",
      "dot-solid-fuel-65", "dot-solid-fuel-66", "dot-solid-fuel-67", "dot-solid-fuel-68",
      "dot-solid-fuel-69",
      "text-solid-fuel-130", "text-solid-fuel-131", "text-solid-fuel-138",
    ],
    name: "Solid Fuel",
    color: "#7d746b",
    description:
      "Coal and manufactured solid fuels, including coke. Once the dominant UK energy source - now a fraction of consumption, mainly serving heavy industry where it has not yet been displaced.",
    info: [
      { label: "Consumption", value: "20 TWh" },
      { label: "Share", value: "1%" },
      { label: "Main use", value: "Industry" },
    ],
  },
  {
    id: "heat",
    groupIds: [
      "form-natural-gas",
      "dot-natural-gas-25", "dot-natural-gas-26", "dot-natural-gas-27", "dot-natural-gas-28",
      "dot-natural-gas-29", "dot-natural-gas-30", "dot-natural-gas-31", "dot-natural-gas-32",
      "text-natural-gas-94", "text-natural-gas-95", "text-natural-gas-96", "text-natural-gas-97",
      "text-natural-gas-98", "text-natural-gas-99", "text-natural-gas-100", "text-natural-gas-101",
    ],
    name: "Heat Sold",
    color: "#4b6e70",
    description:
      "District heating networks and heat sold directly to consumers. A small share in the UK compared to Scandinavian countries, where district heating dominates urban heat supply.",
    info: [
      { label: "Consumption", value: "14 TWh" },
      { label: "Share", value: "1%" },
      { label: "Main use", value: "District heating" },
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
