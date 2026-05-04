import { useState, useRef, useEffect } from "react";

/*
  POSTER 003 — Interactive Scenario Comparison
  
  3 scenarios for UK energy mix and their death tolls.
  Split into 3 separate visualisation sections:
    1. Dots — death/saved dots per scenario
    2. Deaths — organic forms sized by source's share of deaths
    3. Dendrograms — energy mix breakdown
  
  Each section has its own 3 scenario buttons below the image.
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

// SVG URLs organised by viz type then scenario
const svgUrls: Record<string, Record<string, string>> = {
  dots: {
    s1: "/manus-storage/003-S1-dots_36edbd00.svg",
    s2: "/manus-storage/003-S2-dots_e8df5455.svg",
    s3: "/manus-storage/003-S3-dots_ea3acbb0.svg",
  },
  deaths: {
    s1: "/manus-storage/003-S1-deaths_bffd3e07.svg",
    s2: "/manus-storage/003-S2-deaths_1577e2d4.svg",
    s3: "/manus-storage/003-S3-deaths_7414b63a.svg",
  },
  dendrogram: {
    s1: "/manus-storage/003-S1-dendrogram_ea791179.svg",
    s2: "/manus-storage/003-S2-dendrogram_ba0800bb.svg",
    s3: "/manus-storage/003-S3-dendrogram_d3ba9108.svg",
  },
};

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

/* ── Reusable image display with loading state ── */
function VizImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div className="relative bg-[#f5f1eb]/50 rounded-sm border border-border/30 overflow-hidden min-h-[200px]">
      {!loaded && (
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
      <img
        ref={imgRef}
        key={src}
        src={src}
        alt={alt}
        className={`w-full h-auto transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ maxHeight: "85vh" }}
        onLoad={() => setLoaded(true)}
        draggable={false}
      />
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
            style={{ color: "#a51e22", fontWeight: 600 }}
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

            {/* Full-bleed SVG image */}
            <VizImage
              src={svgUrl}
              alt={`${section.title} — ${scenario.label}: ${scenario.subtitle}`}
            />

            {/* Scenario buttons below the image */}
            <div className="max-w-4xl mx-auto px-4">
              <ScenarioButtons
                activeScenario={activeId}
                onSelect={setters[section.id]}
              />

              {/* Stats for this section's active scenario */}
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
