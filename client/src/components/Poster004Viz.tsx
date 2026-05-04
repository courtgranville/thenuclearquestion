import InteractiveSVG, { type Region } from "@/components/InteractiveSVG";

/*
  POSTER 004 — Most of Our Energy Isn't Electricity
  
  UK final energy consumption by carrier: 1,542 TWh total.
  6 energy carriers shown as organic forms with colored circles and text labels.
  
  SVG structure:
  - Colored circles (dots) grouped by source color
  - Text groups matched to nearest circle cluster
  - 7 organic forms identified by stroke color
  - Links (flow lines) connecting carriers to sectors
  
  Interaction: Click legend buttons or tap forms to highlight one carrier.
*/

const SVG_URL = "/manus-storage/004-processed_a9547a07.svg";

// Helper: generate groupIds for circles and text by source name
// The processed SVG has: dot-{source}-{idx}, text-{source}-{idx}, form-{source}
// We use CSS attribute selectors via the class names: source-{source}
// But InteractiveSVG targets by ID, so we need the actual IDs.
// Since there are many, we'll use the form + a few key IDs.
// Actually, the CSS scoped approach targets by ID, so we need all IDs.
// For efficiency, we'll list the form IDs and rely on the class-based approach.

// The InteractiveSVG uses CSS `#id` selectors. For 004, each source has:
// - form-{source} (the organic form)
// - form-electricity-2 (second electricity form)
// - Multiple dot-{source}-{n} and text-{source}-{n}
// Since listing all 70+ circle IDs is impractical, we'll use a different approach:
// We'll add CSS class selectors to the dynamic CSS.

// Actually, let's just list the form IDs (the main visual elements) plus
// any key label IDs. The forms are the primary visual, and dimming them
// is the main interaction.

const regions: Region[] = [
  {
    id: "petroleum",
    groupIds: ["form-petroleum"],
    name: "Petroleum",
    color: "#a51e23",
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
    groupIds: ["form-natural-gas"],
    name: "Natural Gas",
    color: "#4b6e70",
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
    groupIds: ["form-electricity", "form-electricity-2"],
    name: "Electricity",
    color: "#267c3e",
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
    groupIds: ["form-bioenergy"],
    name: "Bioenergy & Waste",
    color: "#b4822e",
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
    groupIds: ["form-heat"],
    name: "Heat Sold",
    color: "#1b3967",
    description:
      "District heating and heat sold directly to consumers. A very small share in the UK compared to Scandinavian countries.",
    info: [
      { label: "Consumption", value: "14 TWh" },
      { label: "Share", value: "0.9%" },
      { label: "Main use", value: "District heating" },
    ],
  },
  {
    id: "solid-fuel",
    groupIds: ["form-solid-fuel"],
    name: "Solid Fuel",
    color: "#7d746a",
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
