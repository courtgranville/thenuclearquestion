import { useEffect, useState } from 'react';
import Poster006WasteInversion from '@/components/Poster006WasteInversion';
import Poster006Sellafield from '@/components/Poster006Sellafield';
import Poster006RadiationDoses from '@/components/Poster006RadiationDoses';
import Poster006WasteStorage from '@/components/Poster006WasteStorage';

// Shared forms-data shape covering the three sub-component slices.
// Dynamic-imported once at the Viz level and passed down so the three
// sub-components don't each fire their own duplicate import.
export interface Poster006FormsData {
  wasteCategories: Record<
    string,
    {
      paths: string[];
      centroid: [number, number];
      nativeRadius: number;
      volumePct: number;
      radioactivityPct: number;
    }
  >;
  doses: Record<
    string,
    {
      centre: [number, number];
      centreRadius: number;
      lines: { x1: number; y1: number; x2: number; y2: number }[];
    }
  >;
  storage: Record<
    string,
    {
      innerSvg: string;
      bbox: { minX: number; minY: number; maxX: number; maxY: number };
    }
  >;
}

interface SectionFrameProps {
  title: string;
  lead: string;
  children: React.ReactNode;
}

// Uniform type scale across the four interactive subsections.
//
// Hierarchy on the poster page (largest → smallest):
//   H1  "Britain's Nuclear Waste"        text-3xl / lg:text-4xl   (30 / 36 px)
//   H2  "Explore the Data"               text-2xl                 (24 px)
//   H3  subsection (e.g. "The Inversion") text-xl                  (20 px)
//   ─── eyebrow / lead / body / captions in descending order ───
function SectionFrame({ title, lead, children }: SectionFrameProps) {
  // Wrapper matches PosterPage's "Explore the Data" block exactly:
  //   <div className="container mb-4">
  //     <div className="max-w-3xl mx-auto"> ... </div>
  //   </div>
  // The Tailwind `container` utility plus max-w-3xl mx-auto produces a
  // single canonical column that every text block on the page snaps to.
  return (
    <div className="w-full">
      <div className="container mb-10">
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
          <hr className="border-border/40 my-16" />
        </div>
      </div>
    </div>
  );
}

export default function Poster006Viz() {
  // One dynamic import for all three slices. Three sub-components share
  // the result so we don't fire three concurrent fetches for the same JSON.
  const [formsData, setFormsData] = useState<Poster006FormsData | null>(null);
  useEffect(() => {
    let cancelled = false;
    import('@/assets/poster-006-forms.json').then((mod) => {
      if (!cancelled) setFormsData(mod.default as unknown as Poster006FormsData);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="w-full">
      <SectionFrame
        title="The Inversion"
        lead="The four categories of UK radioactive waste, scaled two ways. Toggle between physical volume and radioactivity. The smallest physical volume holds almost all of the radioactivity - this is the editorial fact this page is built around."
      >
        <Poster006WasteInversion formsData={formsData} />
      </SectionFrame>

      <SectionFrame
        title="Sellafield"
        lead="Where Britain's radioactive waste actually sits. Hover any producer to focus it. Sellafield holds 72.4% of the total volume and the bulk of the cleanup bill."
      >
        <Poster006Sellafield />
      </SectionFrame>

      <SectionFrame
        title="Radiation Doses"
        lead="Common radiation doses on a logarithmic scale, from a UK reactor's annual contribution to a CT scan. Hover any form to replay its burst."
      >
        <Poster006RadiationDoses formsData={formsData} />
      </SectionFrame>

      <SectionFrame
        title="Storage"
        lead="The four routes UK radioactive waste takes for storage and disposal. Hover for which waste types each route handles."
      >
        <Poster006WasteStorage formsData={formsData} />
      </SectionFrame>
    </div>
  );
}
