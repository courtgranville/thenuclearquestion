import { useState, useEffect, useRef } from "react";

/*
  POSTER 003 — Interactive Scenario Comparison
  
  3 scenarios for UK energy mix and their death tolls.
  Split into 3 separate visualisation sections:
    1. Dots — death/saved dots per scenario
    2. Deaths — organic forms sized by source's share of deaths
    3. Dendrograms — energy mix breakdown
  
  LABELS ARE PRESERVED — only paragraph annotations and dashed arrows removed.
  
  CENTERING: Each SVG has its viewBox individually centered on its content bbox.
  The container uses a FIXED HEIGHT and lets the SVG center itself within it
  using preserveAspectRatio="xMidYMid meet". No fixed aspect ratio on the container.
*/

interface ScenarioData {
  id: string;
  label: string;
  subtitle: string;
  deaths: number;
  livesSaved: number | null;
  description: string;
}

const scenarios: ScenarioData[] = [
  {
    id: "s1",
    label: "Scenario 1",
    subtitle: "Today's Mix",
    deaths: 699,
    livesSaved: null,
    description:
      "The UK's current energy mix produces an estimated 699 deaths per year from air pollution and accidents — almost two every day, mostly invisible because they happen in hospitals, not headlines.",
  },
  {
    id: "s2",
    label: "Scenario 2",
    subtitle: "30% Nuclear",
    deaths: 297,
    livesSaved: 401,
    description:
      "A moderate expansion of nuclear power alongside renewables reduces estimated deaths to 297 per year — saving 401 lives annually compared to today's mix.",
  },
  {
    id: "s3",
    label: "Scenario 3",
    subtitle: "70% Nuclear",
    deaths: 9,
    livesSaved: 690,
    description:
      "A full transition to nuclear and renewables reduces estimated deaths to just 9 per year — saving 690 lives annually. The red dots almost disappear.",
  },
];

// V18 SVG URLs — Individually centered, verified against PDF
const svgUrls: Record<string, Record<string, string>> = {
  dots: {
    s1: "/manus-storage/003-S1-dots_009b59b1.svg",
    s2: "/manus-storage/003-S2-dots_12dd6665.svg",
    s3: "/manus-storage/003-S3-dots_e49e227a.svg",
  },
  deaths: {
    s1: "/manus-storage/003-S1-deaths_63b44ec7.svg",
    s2: "/manus-storage/003-S2-deaths_a367d5c3.svg",
    s3: "/manus-storage/003-S3-deaths_5f5e68c7.svg",
  },
  dendrogram: {
    s1: "/manus-storage/003-S1-dendrogram_19832a4f.svg",
    s2: "/manus-storage/003-S2-dendrogram_aeb36071.svg",
    s3: "/manus-storage/003-S3-dendrogram_8d6b3808.svg",
  },
};

// Fixed heights per section (px) — gives each section appropriate visual weight
const sectionHeight: Record<string, number> = {
  dots: 420,
  deaths: 420,
  dendrogram: 420,
};

// Section annotations that apply to all scenarios
const vizSections = [
  {
    id: "dots",
    title: "Death Toll",
    subtitle: "Each red dot is one death; each green dot is one life saved versus today's mix",
  },
  {
    id: "deaths",
    title: "Deaths by Source",
    subtitle: "Organic forms sized proportionally to each source's estimated annual premature deaths",
  },
  {
    id: "dendrogram",
    title: "Energy Mix Breakdown",
    subtitle: "Each source's share of the electricity mix in TWh — nuclear highlighted in yellow",
  },
];

/* ── SVG cache to avoid re-fetching ── */
const svgCache: Record<string, string> = {};

/* ── Inline SVG display with fixed-height container ── */
function InlineSvg({
  src,
  alt,
  height,
}: {
  src: string;
  alt: string;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    const injectSvg = (svgText: string) => {
      if (cancelled || !containerRef.current) return;

      // Remove any fixed width/height but KEEP the viewBox
      let modified = svgText
        .replace(/(<svg[^>]*?)\s+width="[^"]*"/g, "$1")
        .replace(/(<svg[^>]*?)\s+height="[^"]*"/g, "$1");

      // Ensure SVG fills container and is centered
      modified = modified.replace(
        /(<svg[^>]*?)>/,
        '$1 style="width:100%;height:100%;display:block" preserveAspectRatio="xMidYMid meet">'
      );

      containerRef.current.innerHTML = modified;
      setLoading(false);
    };

    if (svgCache[src]) {
      injectSvg(svgCache[src]);
      return;
    }

    const timer = setTimeout(() => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", src, false);
        xhr.send();
        if (xhr.status >= 200 && xhr.status < 400) {
          svgCache[src] = xhr.responseText;
          injectSvg(xhr.responseText);
        } else {
          if (!cancelled) setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [src]);

  return (
    <div
      className="relative bg-[#f5f1eb]/50 rounded-sm border border-border/30 overflow-hidden mx-auto flex items-center justify-center"
      style={{
        width: "100%",
        maxWidth: "900px",
        height: `${height}px`,
      }}
      role="img"
      aria-label={alt}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground/60 rounded-full animate-spin" />
            <span
              className="text-xs text-muted-foreground"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Loading visualisation...
            </span>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

/* ── Scenario buttons row ── */
function ScenarioButtons({
  activeScenario,
  onSelect,
}: {
  activeScenario: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-3 mt-4">
      {scenarios.map((s) => {
        const isActive = activeScenario === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`
              flex-1 py-3 px-4 rounded-sm border transition-all duration-200 cursor-pointer text-left
              ${
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }
            `}
          >
            <span
              className="block text-[10px] tracking-[0.15em] uppercase mb-0.5"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {s.label}
            </span>
            <span
              className="block text-sm font-medium"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              {s.subtitle}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Stats row for the active scenario ── */
function ScenarioStats({ scenarioId }: { scenarioId: string }) {
  const scenario = scenarios.find((s) => s.id === scenarioId)!;
  return (
    <div className="mt-4">
      <p
        className="text-sm text-muted-foreground leading-relaxed mb-3"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {scenario.description}
      </p>
      <div className="flex gap-6">
        <div>
          <span
            className="block text-2xl font-serif"
            style={{ color: "#a51e23", fontWeight: 600 }}
          >
            {scenario.deaths.toLocaleString()}
          </span>
          <span
            className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Deaths / year
          </span>
        </div>
        {scenario.livesSaved !== null && (
          <div>
            <span
              className="block text-2xl font-serif"
              style={{ color: "#267c3e", fontWeight: 600 }}
            >
              {scenario.livesSaved.toLocaleString()}
            </span>
            <span
              className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Lives saved / year
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function Poster003Viz() {
  const [dotsScenario, setDotsScenario] = useState("s1");
  const [deathsScenario, setDeathsScenario] = useState("s1");
  const [dendrogramScenario, setDendrogramScenario] = useState("s1");

  const activeScenarios: Record<string, string> = {
    dots: dotsScenario,
    deaths: deathsScenario,
    dendrogram: dendrogramScenario,
  };

  const setters: Record<string, (id: string) => void> = {
    dots: setDotsScenario,
    deaths: setDeathsScenario,
    dendrogram: setDendrogramScenario,
  };

  return (
    <div className="w-full space-y-16">
      {vizSections.map((section) => {
        const activeId = activeScenarios[section.id];
        const svgUrl = svgUrls[section.id][activeId];
        const scenario = scenarios.find((s) => s.id === activeId)!;
        const height = sectionHeight[section.id];

        return (
          <div key={section.id} className="w-full">
            {/* Section header */}
            <div className="max-w-4xl mx-auto px-4 mb-4">
              <p
                className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {section.subtitle}
              </p>
              <h4
                className="font-serif text-xl text-foreground"
                style={{ fontWeight: 600 }}
              >
                {section.title}
              </h4>
            </div>

            {/* Annotation callout — applies to all scenarios */}
            <div className="max-w-4xl mx-auto px-4 mb-6">
              <div className="flex items-start gap-3">
                {section.id === "dots" && (
                  <p
                    className="text-sm text-muted-foreground leading-relaxed italic"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    Each <span className="not-italic font-semibold" style={{ color: "#a51e23" }}>red dot</span> represents
                    one estimated death per year from the UK's electricity generation.
                    Each <span className="not-italic font-semibold" style={{ color: "#237c3e" }}>green dot</span> represents
                    one life saved compared to today's energy mix.
                  </p>
                )}
                {section.id === "deaths" && (
                  <p
                    className="text-sm text-muted-foreground leading-relaxed italic"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    Organic form area is proportional to <span className="not-italic font-semibold" style={{ color: "#a51e23" }}>deaths</span> from
                    that source. Labels show each energy source and its estimated annual death toll.
                  </p>
                )}
                {section.id === "dendrogram" && (
                  <p
                    className="text-sm text-muted-foreground leading-relaxed italic"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    Circle area represents the percentage each source of electricity takes in an energy mix of ~284 TWh.{" "}
                    <span className="not-italic font-semibold" style={{ color: "#b4822e" }}>Nuclear</span> is highlighted in yellow.
                  </p>
                )}
              </div>
            </div>

            {/* SVG — fixed height container, SVG centers itself */}
            <div className="max-w-4xl mx-auto px-4">
              <InlineSvg
                key={`${section.id}-${activeId}`}
                src={svgUrl}
                alt={`${section.title} — ${scenario.label}: ${scenario.subtitle}`}
                height={height}
              />
            </div>

            {/* Scenario buttons + stats below the image */}
            <div className="max-w-4xl mx-auto px-4">
              <ScenarioButtons
                activeScenario={activeId}
                onSelect={setters[section.id]}
              />
              <ScenarioStats scenarioId={activeId} />
            </div>
          </div>
        );
      })}

      {/* Hint */}
      <p
        className="text-center text-xs text-muted-foreground"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        Switch scenarios in each section to compare
      </p>
    </div>
  );
}
