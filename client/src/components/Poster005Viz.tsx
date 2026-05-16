// ─────────────────────────────────────────────────────────────────
// Poster005Viz.tsx - assembly only.
//
// Mirrors Poster006Viz's SectionFrame composition. Sections in
// reading order:
//
//   1. Hero map - full-width UK reactor map.
//   2. Status legend - drives the global filteredStatus that every
//      section reads.
//   3. Status dendrogram - hubs / connectors / leaves with cross-
//      view hover focus.
//   4. Reactor detail panel - shows the currently hovered reactor,
//      sourced from any of the three views.
//   5. Three editorial callouts - "31 years", "30+ reactors",
//      "14,141 MW" - verbatim from the print.
//   6. Reactor timeline - full-width bars 1953→2030.
//
// The legend + detail panel are small persistent UI; the brief
// flagged that we'd iterate on their exact placement. v1 puts them
// where they're discoverable: legend at the top so it's visible
// before the data sections, detail after the dendrogram so a hover
// has somewhere to land.
//
// SectionFrame matches Poster006Viz: eyebrow + h3 (text-xl) + lead
// (max-w-3xl Playfair) inside a `container max-w-3xl mx-auto` wrapper
// that aligns with PosterPage's "Explore the Data" column.
// ─────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Poster005Map from '@/components/Poster005Map';
import Poster005Dendrogram from '@/components/Poster005Dendrogram';
import Poster005ReactorDetail from '@/components/Poster005ReactorDetail';
import Poster005Callouts from '@/components/Poster005Callouts';
import Poster005Timeline from '@/components/Poster005Timeline';
import Poster005Legend from '@/components/Poster005Legend';
import { initPoster005Hubs, type Poster005FormsData } from '@/lib/poster005Hubs';
import { initPoster005Connectors } from '@/lib/poster005Connectors';

interface SectionFrameProps {
  title: string;
  lead: string;
  children: React.ReactNode;
}

function SectionFrame({ title, lead, children }: SectionFrameProps) {
  return (
    <div className="w-full">
      <div className="container mb-6">
        <div className="max-w-3xl mx-auto">
          <p
            className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-2"
            style={{ fontFamily: "'Playfair', Georgia, serif" }}
          >
            Interactive Visualisation
          </p>
          <h3
            className="font-serif text-xl text-foreground mb-3"
            style={{ fontWeight: 600, lineHeight: 1.2 }}
          >
            {title}
          </h3>
          <p
            className="text-base text-muted-foreground leading-relaxed"
            style={{ fontFamily: "'Playfair', Georgia, serif" }}
          >
            {lead}
          </p>
        </div>
      </div>
      {children}
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <hr className="border-border/40 my-8" />
        </div>
      </div>
    </div>
  );
}

export default function Poster005Viz() {
  // Dynamic-import the forms JSON (~5.6 MB raw, the largest of the six)
  // and initialise the Hubs + Connectors lib modules in the correct order
  // (Connectors reads from Hubs's now-populated bindings).
  // The dendrogram section is gated on formsReady; map, timeline, and the
  // other small surfaces are independent of formsData and render at once.
  const [formsReady, setFormsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    import('@/assets/poster-005-forms.json').then((mod) => {
      if (cancelled) return;
      const data = mod.default as unknown as Poster005FormsData;
      initPoster005Hubs(data);
      initPoster005Connectors(data);
      setFormsReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="w-full">
      <SectionFrame
        title="The map"
        lead="Where Britain's nuclear fleet actually sits. Three clusters - Sellafield, Wylfa, and Sizewell - account for over half of the country's reactor history; the rest are scattered along the coast. Hover any reactor to highlight it across all three views below; click a status below to filter the whole page."
      >
        <Poster005Map />
      </SectionFrame>

      <SectionFrame
        title="Every reactor, grouped by status"
        lead="The four states a UK reactor can be in. Hubs are sized by the total capacity in each status; leaf circles below are individual units, sized by their own capacity. Click a status above to filter; hover any reactor to bring up its details."
      >
        {formsReady && <Poster005Dendrogram />}
      </SectionFrame>

      <div className="container mb-12">
        <Poster005ReactorDetail />
      </div>

      <div className="container mb-16">
        <Poster005Callouts />
      </div>

      <SectionFrame
        title="When each reactor was built and shut down"
        lead="The full timeline, 1960 to 2030. Red is construction, green is operating life, navy is projected commissioning under-construction, grey hollow circles mark cancellations. Britain's last reactor came online in 1995 - nothing has been added since."
      >
        <Poster005Timeline />
        {/* Designed legend: structured grid of map / dendrogram /
            timeline / methodology sections with inline SVG icons,
            rather than the print's horizontal-strip legend laid
            out as one wide image. */}
        <div className="mt-12">
          <Poster005Legend />
        </div>
      </SectionFrame>
    </div>
  );
}
