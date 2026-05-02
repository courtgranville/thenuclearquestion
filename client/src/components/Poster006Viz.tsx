import { useState } from "react";
import InteractiveSVG from "@/components/InteractiveSVG";
import {
  wasteQuantitiesConfig,
  radiationDosesConfig,
  wasteLocationsConfig,
  wasteStorageConfig,
} from "@/lib/vizConfigs";

/*
  POSTER 006 — Interactive Visualisations
  
  4 tabs:
  1. Waste Quantities (blob chart)
  2. Radiation Doses (burst chart)
  3. Waste Locations (dendrogram)
  4. Waste Storage (illustrated methods)
*/

const tabs = [
  {
    id: "quantities",
    label: "Waste Quantities",
    description:
      "The UK has produced approximately 4.45 million cubic metres of radioactive waste. The forms below are scaled proportionally to volume — yet the smallest contains almost all of the radioactivity.",
    config: wasteQuantitiesConfig,
  },
  {
    id: "doses",
    label: "Radiation Doses",
    description:
      "Comparing common radiation doses from everyday activities and nuclear waste. Each burst is scaled to the dose — the largest is a CT scan at 10 mSv.",
    config: radiationDosesConfig,
  },
  {
    id: "locations",
    label: "Waste Locations",
    description:
      "Where Britain's radioactive waste is stored. Circle sizes are proportional to volume — Sellafield holds over 72% of the total.",
    config: wasteLocationsConfig,
  },
  {
    id: "storage",
    label: "Storage Methods",
    description:
      "The four main disposal and storage routes for the UK's radioactive waste, from landfill for the lowest-activity materials to deep geological disposal for the most hazardous.",
    config: wasteStorageConfig,
  },
];

export default function Poster006Viz() {
  const [activeTab, setActiveTab] = useState("quantities");
  const currentTab = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="w-full">
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-border/50 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2.5 text-xs tracking-[0.1em] uppercase transition-all duration-200
              border-b-2 -mb-px cursor-pointer
              ${
                activeTab === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground/70"
              }
            `}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <p
        className="text-sm text-muted-foreground max-w-2xl mb-6 leading-relaxed"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {currentTab.description}
      </p>

      {/* Interactive SVG */}
      <InteractiveSVG
        key={activeTab}
        svgUrl={currentTab.config.svgUrl}
        regions={currentTab.config.regions}
        legendPosition="top"
      />
    </div>
  );
}
