import InteractiveSVG from "@/components/InteractiveSVG";
import {
  wasteQuantitiesConfig,
  radiationDosesConfig,
  wasteLocationsConfig,
  wasteStorageConfig,
} from "@/lib/vizConfigs";

/*
  POSTER 006 - Interactive Visualisations (Stacked Layout)
  
  Per wireframe, 4 sections stacked vertically:
  1. Waste Quantities (blob chart)
  2. Where Does Waste Come From (dendrogram / locations)
  3. Radiation Doses (burst chart)
  4. Waste Storage (illustrated methods)
*/

interface VizSectionProps {
  title: string;
  description: string;
  config: { svgUrl: string; regions: any[] };
  maxHeight?: string;
  viewBoxOverride?: string;
}

function VizSection({ title, description, config, maxHeight = "85vh", viewBoxOverride }: VizSectionProps) {
  return (
    <div className="w-full pb-6">
      {/* Section heading */}
      <div className="max-w-4xl mx-auto px-4 mb-4">
        <p
          className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Interactive Visualisation
        </p>
        <h3
          className="font-serif text-xl lg:text-2xl text-foreground mb-2"
          style={{ fontWeight: 600 }}
        >
          {title}
        </h3>
        <p
          className="text-sm text-muted-foreground leading-relaxed"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          {description}
        </p>
      </div>

      {/* Interactive SVG */}
      <InteractiveSVG
        svgUrl={config.svgUrl}
        regions={config.regions}
        maxHeight={maxHeight}
        viewBoxOverride={viewBoxOverride}
      />

      {/* Subtle divider */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <hr className="border-border/40" />
      </div>
    </div>
  );
}

export default function Poster006Viz() {
  return (
    <div className="w-full space-y-8">
      {/* 1. Waste Quantities */}
      <VizSection
        title="Waste Quantities"
        description="The UK has produced approximately 4.45 million cubic metres of radioactive waste. The forms below are scaled proportionally to volume - yet the smallest contains almost all of the radioactivity."
        config={wasteQuantitiesConfig}
      />

      {/* 2. Where Does Waste Come From (Dendrogram / Locations) */}
      <VizSection
        title="Where Does Waste Come From?"
        description="Where Britain's radioactive waste is stored. Circle sizes are proportional to volume - Sellafield holds over 72% of the total."
        config={wasteLocationsConfig}
        viewBoxOverride="200 120 1100 830"
      />

      {/* 3. Radiation Doses */}
      <VizSection
        title="Radiation Doses"
        description="Comparing common radiation doses from everyday activities and nuclear waste. Each burst is scaled to the dose - the largest is a CT scan at 10 mSv."
        config={radiationDosesConfig}
        viewBoxOverride="350 300 750 650"
      />

      {/* 4. Waste Storage */}
      <VizSection
        title="Waste Storage"
        description="The four main disposal and storage routes for the UK's radioactive waste, from landfill for the lowest-activity materials to deep geological disposal for the most hazardous."
        config={wasteStorageConfig}
      />
    </div>
  );
}
