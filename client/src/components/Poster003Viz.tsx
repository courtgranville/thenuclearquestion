import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Poster003Slider from "@/components/Poster003Slider";
import Poster003Dots from "@/components/Poster003Dots";
import Poster003CanvasDeaths from "@/components/Poster003CanvasDeaths";
import Poster003Dendrogram from "@/components/Poster003Dendrogram";
import Poster003Ticker from "@/components/Poster003Ticker";
import { interpolate, type ScenarioData } from "@/lib/poster003Data";
import { poster003Store } from "@/lib/poster003Store";

/*
  Poster 003 - Slider-driven scenario page.

  After commit 19, every drag-time visual layer reads from
  poster003Store directly:
 - Poster003CanvasDeaths   (commit 18)
 - Poster003Dots           (commit 19)
 - Poster003Dendrogram     (commit 19)
 - Poster003Ticker         (commit 19)
  All four are wrapped in React.memo and take NO props from this
  parent - they never re-render during slider drag.

  Poster003Viz still owns the slider's controlled value (sliderFraction)
  and re-renders on every drag tick to feed the slider thumb position.
  ScenarioReadout updates when anchorState changes (fraction crosses
  0.25 / 0.75) and at snap - low frequency, fine for React.

  Editorial constraints (encoded structurally, not stylistically):
    1. Numerical readouts read ONLY from anchorState. The interpolate()
       helper exposes geometric fields for layer geometry but no
       formatted-number export - the page physically cannot display a
       fabricated mid-drag death count.
    2. Dot ordering has no source attribution.
    3. Animation register is serious - no spring, no overshoot.
*/

const SCENARIO_DESCRIPTIONS: Record<ScenarioData["id"], string> = {
  s1: "The UK grid kills an estimated 699 people every year - almost two every day, mostly invisible because they happen in hospitals, not headlines. Gas alone accounts for roughly a third of the toll. Most of these deaths are from sources nobody worries about.",
  s2: "Doubling nuclear's share of the grid - to roughly the level the UK had in the late 1990s - cuts annual deaths to 297 and saves 401 lives a year. The reduction comes mostly from displacing gas, which dominates the current toll.",
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

  // Slider onChange dispatches BOTH to React state (drives the
  // slider thumb's controlled value + the ScenarioReadout's anchor
  // updates) AND to the poster003Store (drives the four memoised
  // viz layers via direct DOM mutation, no React commits).
  const handleSliderChange = useCallback((f: number) => {
    setSliderFraction(f);
    poster003Store.update(f);
  }, []);

  // Press / release. The store carries the dragging flag so the
  // dot grid + ticker can preserve their snap-corrected values
  // (anchorState.livesSaved at S2 = 401, vs 699 − 297 = 402).
  const handleDragStateChange = useCallback((d: boolean) => {
    poster003Store.setDragging(d);
  }, []);

  // Single source of truth for ScenarioReadout. Memoised; changes
  // only when sliderFraction does. The viz layers don't read this.
  const vizState = useMemo(
    () => interpolate(sliderFraction),
    [sliderFraction],
  );
  const anchorScenario = vizState.anchorState;

  // Floating slider visibility - driven by an IntersectionObserver
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
          {/* No props - both layers read poster003Store directly. */}
          <Poster003Dots />
          <Poster003Ticker />
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
          <Poster003CanvasDeaths />
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
          <Poster003Dendrogram />
        </SectionFrame>
      </div>

      {/* Floating slider - fixed at the bottom of the viewport while
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
          backgroundColor: '#F5F1E9',
          border: '1px solid rgba(13, 26, 30, 0.10)',
          borderRadius: 12,
          boxShadow:
            '0 8px 28px rgba(13, 26, 30, 0.16), 0 2px 6px rgba(13, 26, 30, 0.08)',
          padding: '14px 24px 16px',
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
          onChange={handleSliderChange}
          onDragStateChange={handleDragStateChange}
        />
      </div>
    </div>
  );
}
