import Poster006WasteInversion from '@/components/Poster006WasteInversion';
import Poster006Sellafield from '@/components/Poster006Sellafield';
import Poster006RadiationDoses from '@/components/Poster006RadiationDoses';
import Poster006WasteStorage from '@/components/Poster006WasteStorage';

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
  return (
    <div className="w-full">
      <SectionFrame
        title="The Inversion"
        lead="The four categories of UK radioactive waste, scaled two ways. Toggle between physical volume and radioactivity. The smallest physical volume holds almost all of the radioactivity - this is the editorial fact this page is built around."
      >
        <Poster006WasteInversion />
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
        <Poster006RadiationDoses />
      </SectionFrame>

      <SectionFrame
        title="Storage"
        lead="The four routes UK radioactive waste takes for storage and disposal. Hover for which waste types each route handles."
      >
        <Poster006WasteStorage />
      </SectionFrame>
    </div>
  );
}
