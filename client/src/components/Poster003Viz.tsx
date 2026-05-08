import { useEffect, useMemo, useRef, useState } from "react";
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

// ─────────────────────────────────────────────────────────────────
// Live ticker totals beneath the dot grid.
//
// Editorial discipline note: this is the deliberate relaxation of
// the snap-only readout rule. The slider's anchor totals (in the
// ScenarioReadout above) still update only at snap. This ticker
// reads the dots component's current red/green counts and renders
// them directly. The numbers are honest — they are counts of dots
// actually rendered on screen at this frame, not interpolated
// mortality estimates. The relaxation applies ONLY to these aggregate
// dot totals; per-source mortality numbers (deaths-by-source labels)
// and per-source TWh % (dendrogram) stay snap-only.
// ─────────────────────────────────────────────────────────────────

interface TickerTotalsProps {
  redCount: number;
  greenCount: number;
}

function TickerTotals({ redCount, greenCount }: TickerTotalsProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 mt-6 flex gap-10 flex-wrap justify-center">
      <div className="text-center">
        <span
          className="block font-serif tabular-nums"
          style={{
            color: '#a51e22',
            fontWeight: 600,
            fontSize: 'clamp(40px, 6vw, 64px)',
            lineHeight: 1,
            fontFamily: "'Playfair', Georgia, serif",
          }}
        >
          {redCount.toLocaleString()}
        </span>
        <span
          className="block text-[11px] tracking-[0.18em] uppercase text-muted-foreground mt-2"
          style={{ fontFamily: "'Playfair', Georgia, serif" }}
        >
          Estimated deaths per year
        </span>
      </div>
      {greenCount > 0 && (
        <div className="text-center">
          <span
            className="block font-serif tabular-nums"
            style={{
              color: '#217B3D',
              fontWeight: 600,
              fontSize: 'clamp(40px, 6vw, 64px)',
              lineHeight: 1,
              fontFamily: "'Playfair', Georgia, serif",
            }}
          >
            {greenCount.toLocaleString()}
          </span>
          <span
            className="block text-[11px] tracking-[0.18em] uppercase text-muted-foreground mt-2"
            style={{ fontFamily: "'Playfair', Georgia, serif" }}
          >
            Lives saved per year
          </span>
        </div>
      )}
    </div>
  );
}

export default function Poster003Viz() {
  const [sliderFraction, setSliderFraction] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Live counts from the dots component — drive the ticker totals.
  const [dotCounts, setDotCounts] = useState({ redCount: 699, greenCount: 0 });

  // Single source of truth for all three layers.
  const vizState = useMemo(
    () => interpolate(sliderFraction),
    [sliderFraction],
  );

  // Numerical readout reads from anchorState — never from the
  // geometric fields. (See poster003Data.ts comments.)
  const anchorScenario = vizState.anchorState;

  // Floating slider visibility — driven by an IntersectionObserver
  // on the section root. The slider only appears when this section
  // is in the viewport so it doesn't hover over neighbouring pages.
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [sectionVisible, setSectionVisible] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setSectionVisible(entry.isIntersecting);
      },
      // Trigger off as soon as the section's top scrolls above the
      // viewport top OR its bottom scrolls below the viewport bottom.
      { threshold: 0, rootMargin: '0px 0px 0px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="w-full pb-32">
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
          <Poster003Dots
            vizState={vizState}
            dragging={dragging}
            onCountsChange={setDotCounts}
          />
          <TickerTotals
            redCount={dotCounts.redCount}
            greenCount={dotCounts.greenCount}
          />
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
                style={{ color: "#b5822e" }}
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

      {/* Floating slider — fixed at the bottom of the viewport while
          the section is visible. Width caps at 560px desktop; on
          mobile it spans full width minus 16px each side. */}
      <div
        aria-hidden={!sectionVisible}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
          margin: '0 auto',
          width: 'calc(100% - 32px)',
          maxWidth: 560,
          zIndex: 50,
          opacity: sectionVisible ? 1 : 0,
          pointerEvents: sectionVisible ? 'auto' : 'none',
          transition: 'opacity 200ms ease',
          backgroundColor: '#ECE7DF',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(13, 26, 30, 0.08)',
          padding: '14px 18px 10px',
        }}
      >
        <div
          className="mb-1"
          style={{
            fontFamily: "'Playfair', Georgia, serif",
            fontSize: 11,
            letterSpacing: '0.15em',
            color: '#0D1A1E',
            opacity: 0.8,
            textTransform: 'uppercase',
          }}
        >
          {anchorScenario.label} · {anchorScenario.nuclearSharePct}% nuclear
        </div>
        <Poster003Slider
          value={sliderFraction}
          onChange={setSliderFraction}
          onDragStateChange={setDragging}
        />
      </div>
    </div>
  );
}
