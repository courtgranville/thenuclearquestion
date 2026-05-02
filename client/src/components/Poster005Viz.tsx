import { useState, useEffect, useRef, useCallback } from "react";

/*
  POSTER 005 — Interactive Reactor Map
  
  The map SVG already has semantic group IDs:
  - uk-outline: UK coastline outline
  - main-map-dots: contains 5 sub-groups:
    - layer-main-past (#7d746b stone) - 10 circles
    - layer-main-abandoned (#a61e23 red) - 2 circles
    - layer-main-paused (#1b3967 blue) - 1 circle
    - layer-main-future (#b4822e gold) - 3 circles
    - layer-main-operating (#267c3e green) - 3 circles
  
  Interaction: Click legend buttons to filter reactor types.
  CSS class toggling for smooth transitions.
*/

const MAP_URL = "/manus-storage/005-map_d6bf9e9f.svg";
const DENDROGRAM_URL = "/manus-storage/005-dendrogram_85466d19.svg";

interface ReactorCategory {
  id: string;
  groupId: string;
  name: string;
  color: string;
  count: number;
  description: string;
}

const categories: ReactorCategory[] = [
  {
    id: "operating",
    groupId: "layer-main-operating",
    name: "Operating",
    color: "#267c3e",
    count: 3,
    description: "Currently generating electricity for the UK grid.",
  },
  {
    id: "future",
    groupId: "layer-main-future",
    name: "Planned / Under Construction",
    color: "#b4822e",
    count: 3,
    description:
      "Approved or under construction — Hinkley Point C, Sizewell C, and others.",
  },
  {
    id: "paused",
    groupId: "layer-main-paused",
    name: "Paused",
    color: "#1b3967",
    count: 1,
    description: "Construction or planning halted but not formally cancelled.",
  },
  {
    id: "past",
    groupId: "layer-main-past",
    name: "Decommissioned",
    color: "#7d746b",
    count: 10,
    description:
      "Shut down and in various stages of decommissioning or defuelling.",
  },
  {
    id: "abandoned",
    groupId: "layer-main-abandoned",
    name: "Cancelled",
    color: "#a61e23",
    count: 2,
    description: "Formally cancelled — sites may have been repurposed.",
  },
];

const MAP_STYLE = `
  .map-layer {
    transition: opacity 0.25s ease-out;
    will-change: opacity;
  }
  .map-dimmed .map-layer {
    opacity: 0.06;
  }
  .map-dimmed .map-active {
    opacity: 1;
  }
  .map-dimmed .map-base {
    opacity: 0.3;
  }
`;

const vizTabs = [
  { id: "map", label: "Reactor Map" },
  { id: "dendrogram", label: "Timeline" },
] as const;

type VizTab = (typeof vizTabs)[number]["id"];

export default function Poster005Viz() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeViz, setActiveViz] = useState<VizTab>("map");
  const [svgContent, setSvgContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dendroLoaded, setDendroLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch and inject SVG
  useEffect(() => {
    if (activeViz !== "map") return;
    setLoading(true);
    fetch(MAP_URL)
      .then((r) => r.text())
      .then((text) => {
        setSvgContent(text);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeViz]);

  // Apply CSS classes when SVG is loaded and category changes
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    // Inject style element if not already present
    if (!svg.querySelector("style.map-style")) {
      const style = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "style"
      );
      style.setAttribute("class", "map-style");
      style.textContent = MAP_STYLE;
      svg.insertBefore(style, svg.firstChild);

      // Add class to all layer groups
      categories.forEach((cat) => {
        const group = svg.getElementById(cat.groupId);
        if (group) group.classList.add("map-layer");
      });

      // Mark the UK outline as base (always partially visible)
      const outline = svg.getElementById("uk-outline");
      if (outline) {
        outline.classList.add("map-layer", "map-base");
      }
    }

    // Toggle dimmed state
    if (activeCategory) {
      svg.classList.add("map-dimmed");
      // Remove active from all, add to selected
      categories.forEach((cat) => {
        const group = svg.getElementById(cat.groupId);
        if (group) {
          group.classList.toggle("map-active", cat.id === activeCategory);
        }
      });
    } else {
      svg.classList.remove("map-dimmed");
      categories.forEach((cat) => {
        const group = svg.getElementById(cat.groupId);
        if (group) group.classList.remove("map-active");
      });
    }
  }, [activeCategory, svgContent]);

  const handleCategoryClick = useCallback(
    (id: string) => {
      setActiveCategory((prev) => (prev === id ? null : id));
    },
    []
  );

  const activeInfo = categories.find((c) => c.id === activeCategory);

  return (
    <div className="w-full">
      {/* Viz type tabs */}
      <div className="flex gap-1 mb-5 border-b border-border/50 pb-px">
        {vizTabs.map((vt) => (
          <button
            key={vt.id}
            onClick={() => {
              setActiveViz(vt.id);
              setActiveCategory(null);
            }}
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

      {activeViz === "map" ? (
        <>
          {/* Legend buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`
                    inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs
                    transition-all duration-200 cursor-pointer
                    ${
                      isActive
                        ? "border-current bg-current/5"
                        : activeCategory
                          ? "border-border/40 text-muted-foreground/50"
                          : "border-border text-muted-foreground hover:text-foreground"
                    }
                  `}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: isActive ? cat.color : undefined,
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                  <span className="opacity-60">({cat.count})</span>
                </button>
              );
            })}
          </div>

          {/* Info panel */}
          {activeInfo && (
            <div
              className="mb-4 px-4 py-3 rounded-sm border-l-2 bg-muted/30"
              style={{ borderLeftColor: activeInfo.color }}
            >
              <p
                className="text-sm font-medium mb-1"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  color: activeInfo.color,
                }}
              >
                {activeInfo.name} — {activeInfo.count} site
                {activeInfo.count !== 1 ? "s" : ""}
              </p>
              <p
                className="text-xs text-muted-foreground"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {activeInfo.description}
              </p>
            </div>
          )}

          {/* Map SVG */}
          <div className="relative bg-[#f5f1eb]/50 rounded-sm border border-border/30 overflow-hidden min-h-[400px]">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground/60 rounded-full animate-spin" />
                  <span
                    className="text-xs text-muted-foreground"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Loading map...
                  </span>
                </div>
              </div>
            )}
            <div
              ref={containerRef}
              className="w-full [&>svg]:w-full [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>

          {!activeCategory && !loading && (
            <p
              className="text-center text-xs text-muted-foreground mt-3"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Tap a category above to filter reactor sites
            </p>
          )}
          {activeCategory && (
            <p
              className="text-center text-xs text-muted-foreground mt-3"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Tap again to deselect
            </p>
          )}
        </>
      ) : (
        /* Dendrogram - static display */
        <div className="relative bg-[#f5f1eb]/50 rounded-sm border border-border/30 overflow-hidden overflow-x-auto min-h-[300px]">
          {!dendroLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground/60 rounded-full animate-spin" />
                <span
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Loading timeline...
                </span>
              </div>
            </div>
          )}
          <img
            src={DENDROGRAM_URL}
            alt="UK Nuclear Reactor Timeline Dendrogram"
            className={`w-full h-auto transition-opacity duration-300 ${dendroLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setDendroLoaded(true)}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
