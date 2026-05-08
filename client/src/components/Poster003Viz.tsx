import { useMemo, useState } from "react";
import Poster003Slider from "@/components/Poster003Slider";
import Poster003Dots from "@/components/Poster003Dots";
import Poster003CanvasDeaths from "@/components/Poster003CanvasDeaths";
import Poster003Dendrogram from "@/components/Poster003Dendrogram";
import { interpolate, type ScenarioData } from "@/lib/poster003Data";

/*
  Poster 003 — Slider-driven scenario page.

  One slider controls all three visualisation layers:
    - Death-toll dots (SVG) — sequential red→green flip
    - Deaths-by-source blobs (canvas) — sqrt area scaling, fungal decay
    - Energy-mix dendrogram (SVG) — sqrt area-proportional radii

  Editorial constraints (encoded structurally, not stylistically):
    1. Numerical readouts read ONLY from anchorState. The interpolate()
       helper exposes geometric fields for layer geometry but no
       formatted-number export — the page physically cannot display a
       fabricated mid-drag death count.
    2. Dot ordering has no source attribution.
    3. Animation register is serious — no spring, no overshoot.
*/

const SCENARIO_DESCRIPTIONS: Record<ScenarioData["id"], string> = {
  s1: "The UK grid kills an estimated 699 people every year — almost two every day, mostly invisible because they happen in hospitals, not headlines. Gas alone accounts for roughly a third of the toll. Most of these deaths are from sources nobody worries about.",
  s2: "Doubling nuclear's share of the grid — to roughly the level the UK had in the late 1990s — cuts annual deaths to 297 and saves 401 lives a year. The reduction comes mostly from displacing gas, which dominates the current toll.",
  s3: "Reaching France's nuclear share would reduce annual UK grid deaths to 9 and save 690 lives a year compared with today. The red dots almost disappear; nuclear-related deaths only rise from 1 to 6 even as nuclear's share moves from 14% to 70%.",
};

interface ScenarioReadoutProps {
  scenario: ScenarioData;
}

function ScenarioReadout({ scenario }: ScenarioReadoutProps) {
  const description = SCENARIO_DESCRIPTIONS[scenario.id];
  return (
    <div className="max-w-4xl mx-auto px-4 mt-6">
      <div className="flex items-baseline gap-4 flex-wrap mb-3">
        <h3
          className="font-serif text-2xl text-foreground"
          style={{ fontWeight: 600 }}
        >
          {scenario.label}
        </h3>
        <span
          className="text-sm tracking-[0.12em] uppercase text-muted-foreground"
          style={{ fontFamily: "'Playfair', Georgia, serif" }}
        >
          {scenario.nuclearSharePct}% nuclear · {scenario.totalTwh} TWh
        </span>
      </div>

      <div className="flex gap-8 mb-4 flex-wrap">
        <div>
          <span
            className="block text-2xl font-serif"
            style={{ color: "#a51e23", fontWeight: 600 }}
          >
            {scenario.totalDeaths.toLocaleString()}
          </span>
          <span
            className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground"
            style={{ fontFamily: "'Playfair', Georgia, serif" }}
          >
            Deaths / year
          </span>
        </div>
        {scenario.livesSaved > 0 && (
          <div>
            <span
              className="block text-2xl font-serif"
              style={{ color: "#217b3d", fontWeight: 600 }}
            >
              {scenario.livesSaved.toLocaleString()}
            </span>
            <span
              className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              Lives saved / year
            </span>
          </div>
        )}
      </div>

      <p
        className="text-base text-muted-foreground leading-relaxed"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        {description}
      </p>
    </div>
  );
}

interface SectionFrameProps {
  title: string;
  annotation: React.ReactNode;
  children: React.ReactNode;
}

function SectionFrame({ title, annotation, children }: SectionFrameProps) {
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 mb-3">
        <h4
          className="font-serif text-xl text-foreground mb-2"
          style={{ fontWeight: 600 }}
        >
          {title}
        </h4>
        <p
          className="text-base text-muted-foreground leading-relaxed italic"
          style={{ fontFamily: "'Playfair', Georgia, serif" }}
        >
          {annotation}
        </p>
      </div>
      <div className="max-w-4xl mx-auto px-4">{children}</div>
    </div>
  );
}

export default function Poster003Viz() {
  const [sliderFraction, setSliderFraction] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Single source of truth for all three layers.
  const vizState = useMemo(
    () => interpolate(sliderFraction),
    [sliderFraction],
  );

  // Numerical readout reads from anchorState — never from the
  // geometric fields. (See poster003Data.ts comments.)
  const anchorScenario = vizState.anchorState;

  return (
    <div className="w-full">
      {/* Sticky slider at the top of the scrollable section. */}
      <div
        className="sticky top-0 z-20 -mx-4 px-4 py-4 mb-2"
        style={{
          backgroundColor: "rgba(236, 231, 223, 0.92)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          borderBottom: "1px solid rgba(13,26,30,0.08)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <Poster003Slider
            value={sliderFraction}
            onChange={setSliderFraction}
            onDragStateChange={setDragging}
          />
        </div>
      </div>

      <ScenarioReadout scenario={anchorScenario} />

      <div className="space-y-12 mt-10">
        <SectionFrame
          title="Death Toll"
          annotation={
            <>
              Each{" "}
              <span
                className="not-italic font-semibold"
                style={{ color: "#a51e23" }}
              >
                red dot
              </span>{" "}
              represents one estimated death per year from the UK's
              electricity generation. Each{" "}
              <span
                className="not-italic font-semibold"
                style={{ color: "#217b3d" }}
              >
                green dot
              </span>{" "}
              represents one life saved compared to today's energy mix.
              Dot positions and the order in which they flip are not
              tied to any individual source.
            </>
          }
        >
          <Poster003Dots vizState={vizState} dragging={dragging} />
        </SectionFrame>

        <SectionFrame
          title="Deaths by Source"
          annotation={
            <>
              Organic-form area is proportional to{" "}
              <span
                className="not-italic font-semibold"
                style={{ color: "#a51e23" }}
              >
                deaths
              </span>{" "}
              from that source. As a source's share collapses the form
              creeps in on itself before vanishing.
            </>
          }
        >
          <Poster003CanvasDeaths vizState={vizState} />
        </SectionFrame>

        <SectionFrame
          title="Energy Mix Breakdown"
          annotation={
            <>
              Each circle's area is proportional to a source's TWh
              contribution to the ~284 TWh mix.{" "}
              <span
                className="not-italic font-semibold"
                style={{ color: "#b4822e" }}
              >
                Nuclear
              </span>{" "}
              is highlighted in yellow.
            </>
          }
        >
          <Poster003Dendrogram vizState={vizState} />
        </SectionFrame>
      </div>
    </div>
  );
}
