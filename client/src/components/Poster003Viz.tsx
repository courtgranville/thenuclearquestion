import { useState, useRef, useEffect } from "react";

/*
  POSTER 003 — Interactive Scenario Comparison
  
  3 scenarios for UK energy mix and their death tolls.
  Each scenario has 3 visualisation types: dots, deaths, dendrogram.
  
  Interaction: Click tabs to switch between scenarios and viz types.
  SVGs are displayed as static images (no hover interaction within SVGs).
  The tab switching IS the interaction.
*/

interface ScenarioData {
  id: string;
  label: string;
  subtitle: string;
  deaths: number;
  livesSaved: number | null;
  description: string;
  svgs: {
    dots: string;
    deaths: string;
    dendrogram: string;
  };
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
    svgs: {
      dots: "/manus-storage/003-S1-dots_36edbd00.svg",
      deaths: "/manus-storage/003-S1-deaths_bffd3e07.svg",
      dendrogram: "/manus-storage/003-S1-dendrogram_ea791179.svg",
    },
  },
  {
    id: "s2",
    label: "Scenario 2",
    subtitle: "Moderate Nuclear",
    deaths: 297,
    livesSaved: 401,
    description:
      "A moderate expansion of nuclear power alongside renewables reduces estimated deaths to 297 per year — saving 401 lives annually compared to today's mix.",
    svgs: {
      dots: "/manus-storage/003-S2-dots_e8df5455.svg",
      deaths: "/manus-storage/003-S2-deaths_1577e2d4.svg",
      dendrogram: "/manus-storage/003-S2-dendrogram_ba0800bb.svg",
    },
  },
  {
    id: "s3",
    label: "Scenario 3",
    subtitle: "Full Nuclear + Renewables",
    deaths: 9,
    livesSaved: 690,
    description:
      "A full transition to nuclear and renewables reduces estimated deaths to just 9 per year — saving 690 lives annually. The red dots almost disappear.",
    svgs: {
      dots: "/manus-storage/003-S3-dots_ea3acbb0.svg",
      deaths: "/manus-storage/003-S3-deaths_7414b63a.svg",
      dendrogram: "/manus-storage/003-S3-dendrogram_d3ba9108.svg",
    },
  },
];

const vizTypes = [
  { id: "dots", label: "Death Toll" },
  { id: "deaths", label: "By Source" },
  { id: "dendrogram", label: "Breakdown" },
] as const;

type VizType = (typeof vizTypes)[number]["id"];

export default function Poster003Viz() {
  const [activeScenario, setActiveScenario] = useState("s1");
  const [activeViz, setActiveViz] = useState<VizType>("dots");
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const scenario = scenarios.find((s) => s.id === activeScenario)!;
  const svgUrl = scenario.svgs[activeViz];

  // Reset loaded state when switching
  useEffect(() => {
    setImgLoaded(false);
  }, [activeScenario, activeViz]);

  return (
    <div className="w-full">
      {/* Scenario tabs */}
      <div className="flex gap-3 mb-5">
        {scenarios.map((s) => {
          const isActive = activeScenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveScenario(s.id)}
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

      {/* Scenario description + stats */}
      <div className="mb-5">
        <p
          className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-3"
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

      {/* Viz type tabs */}
      <div className="flex gap-1 mb-4 border-b border-border/50 pb-px">
        {vizTypes.map((vt) => (
          <button
            key={vt.id}
            onClick={() => setActiveViz(vt.id)}
            className={`
              px-4 py-2 text-xs tracking-[0.1em] uppercase transition-all duration-200
              border-b-2 -mb-px cursor-pointer
              ${
                activeViz === vt.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground/70"
              }
            `}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {vt.label}
          </button>
        ))}
      </div>

      {/* SVG display */}
      <div className="relative bg-[#f5f1eb]/50 rounded-sm border border-border/30 overflow-hidden min-h-[300px]">
        {/* Loading placeholder */}
        {!imgLoaded && (
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
          key={svgUrl}
          src={svgUrl}
          alt={`${scenario.label} — ${vizTypes.find((v) => v.id === activeViz)?.label}`}
          className={`
            w-full h-auto transition-opacity duration-300
            ${imgLoaded ? "opacity-100" : "opacity-0"}
          `}
          onLoad={() => setImgLoaded(true)}
          draggable={false}
        />
      </div>
    </div>
  );
}
