import { useState, useEffect, useRef, useCallback } from "react";

/*
  POSTER 005 — Interactive Reactor Map + Timeline Dendrogram
  
  Layout (per wireframe): Two separate stacked sections:
  1. Map — UK reactor locations, filterable by status
  2. Dendrogram — Timeline showing reactor lifespans, filterable by status
  
  Map filtering: targets circle[fill="COLOR"] — must handle fill-opacity=".55" circles
  in zoom insets as well as fill-opacity="1" circles on the main map.
  
  Dendrogram filtering: targets BOTH:
  - circle[fill="COLOR"] for the reactor dots at the bottom
  - polyline[stroke="COLOR"] for the blob forms at the top (organic shapes)
  - Also dims the filled polylines (#ece7df) in the same parent group
*/

const MAP_URL = "/manus-storage/005-map_d6bf9e9f.svg";
const DENDROGRAM_URL = "/manus-storage/005-dendrogram-clean_336edeac.svg";

interface ReactorCategory {
  id: string;
  name: string;
  color: string;
  count: number;
  description: string;
}

// Map categories (5 statuses on the geographic map)
const mapCategories: ReactorCategory[] = [
  {
    id: "operating",
    name: "Operating",
    color: "#267c3e",
    count: 3,
    description: "Currently generating electricity for the UK grid.",
  },
  {
    id: "future",
    name: "Planned / Under Construction",
    color: "#b4822e",
    count: 3,
    description:
      "Approved or under construction — Hinkley Point C, Sizewell C, and others.",
  },
  {
    id: "paused",
    name: "Paused",
    color: "#1b3967",
    count: 1,
    description: "Construction or planning halted but not formally cancelled.",
  },
  {
    id: "past",
    name: "Decommissioned",
    color: "#7d746b",
    count: 10,
    description:
      "Shut down and in various stages of decommissioning or defuelling.",
  },
  {
    id: "abandoned",
    name: "Cancelled",
    color: "#a61e23",
    count: 2,
    description: "Formally cancelled — sites may have been repurposed.",
  },
];

// Dendrogram categories (4 statuses on the timeline)
// Blob forms use stroke colors; circles use fill colors
const dendroCategories: ReactorCategory[] = [
  {
    id: "construction",
    name: "Under Construction",
    color: "#b4822e",
    count: 2,
    description:
      "Hinkley Point C1 and C2 — dashed bars projected to target completion.",
  },
  {
    id: "operating",
    name: "Operating",
    color: "#237c3e",
    count: 9,
    description:
      "Still running — bars start at construction and run to an open arrow (no end date).",
  },
  {
    id: "retired",
    name: "Retired",
    color: "#7d746a",
    count: 36,
    description:
      "Built, operated, shut down — bars span from construction start to shutdown year.",
  },
  {
    id: "cancelled",
    name: "Cancelled",
    color: "#a51e23",
    count: 25,
    description:
      "Single dot at decision year — 14,141 MW announced and never built.",
  },
];

// Map filter: target circles by fill color
// All circles start visible. When a category is active, only matching fill circles stay full opacity.
// IMPORTANT: Many circles have fill-opacity=".55" inline. We use opacity (not fill-opacity) for dimming
// but must set it high enough that semi-transparent circles remain visible when selected.
function getMapFilterStyle(activeColor: string | null) {
  if (!activeColor) {
    // Default state: no filter, all circles visible as-is
    return ``;
  }
  // When filtering: dim non-matching circles, keep matching ones at full opacity
  return `
    circle[fill]:not([fill="none"]):not([fill="${activeColor}"]) {
      opacity: 0.1 !important;
      transition: opacity 0.3s ease-out;
    }
    circle[fill="${activeColor}"] {
      opacity: 1 !important;
      fill-opacity: 1 !important;
      transition: opacity 0.3s ease-out;
    }
  `;
}

// Dendrogram filter: target circles by fill AND polylines by stroke
// The blob forms are polylines with stroke=COLOR.
// Circle structure in the dendrogram SVG:
//   - 72 large circles (the row of dots): have opacity=".55" and fill=COLOR
//   - 25 small timeline circles: have fill-opacity="0" and stroke=COLOR (outline only)
// When filtering: boost matching large circles to opacity:1, dim non-matching to opacity:0.1
// Leave the small timeline circles (fill-opacity=0) untouched.
function getDendroFilterStyle(activeColor: string | null, allColors: string[]) {
  if (!activeColor) {
    // Default state: no filter, everything visible as-is
    return ``;
  }

  // Build rules to dim non-matching large circles (those with opacity=".55")
  const dimCircleRules = allColors
    .filter((c) => c !== activeColor)
    .map(
      (c) => `
    circle[fill="${c}"][opacity] {
      opacity: 0.1 !important;
      transition: opacity 0.3s ease-out;
    }
  `
    )
    .join("\n");

  // Build rules to dim non-matching polylines (by stroke color)
  const dimPolylineRules = allColors
    .filter((c) => c !== activeColor)
    .map(
      (c) => `
    polyline[stroke="${c}"] {
      opacity: 0.1 !important;
      transition: opacity 0.3s ease-out;
    }
  `
    )
    .join("\n");

  return `
    circle[fill="${activeColor}"][opacity] {
      opacity: 1 !important;
      transition: opacity 0.3s ease-out;
    }
    polyline[stroke="${activeColor}"] {
      opacity: 1 !important;
      transition: opacity 0.3s ease-out;
    }
    ${dimCircleRules}
    ${dimPolylineRules}
  `;
}

/* ─── Shared Legend Component ─── */
function CategoryLegend({
  categories,
  activeCategory,
  onCategoryClick,
}: {
  categories: ReactorCategory[];
  activeCategory: string | null;
  onCategoryClick: (id: string) => void;
}) {
  const activeInfo = categories.find((c) => c.id === activeCategory);

  return (
    <div className="space-y-3">
      {/* Legend buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryClick(cat.id)}
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
          className="max-w-2xl mx-auto px-4 py-3 rounded-sm border-l-2 bg-muted/30"
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

      {!activeCategory && (
        <p
          className="text-center text-xs text-muted-foreground"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Tap a category to filter
        </p>
      )}
      {activeCategory && (
        <p
          className="text-center text-xs text-muted-foreground"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Tap again to deselect
        </p>
      )}
    </div>
  );
}

/* ─── Map Interactive Section ─── */
function MapSection() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(MAP_URL)
      .then((r) => r.text())
      .then((text) => {
        setSvgContent(text);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Apply fill-color-based filtering via injected <style>
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    const activeCat = mapCategories.find((c) => c.id === activeCategory);
    const activeColor = activeCat ? activeCat.color : null;

    let styleEl = svg.querySelector(
      "style.interactive-style"
    ) as SVGStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "style"
      );
      styleEl.setAttribute("class", "interactive-style");
      svg.insertBefore(styleEl, svg.firstChild);
    }
    styleEl.textContent = getMapFilterStyle(activeColor);
  }, [activeCategory, svgContent]);

  const handleCategoryClick = useCallback((id: string) => {
    setActiveCategory((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="w-full">
      <p
        className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        Reactor Map
      </p>

      <div
        className="relative bg-[#f5f1eb]/50 rounded-sm border border-border/30 overflow-hidden"
        style={{ minHeight: "400px" }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground/60 rounded-full animate-spin" />
              <span
                className="text-xs text-muted-foreground"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Loading...
              </span>
            </div>
          </div>
        )}
        <div
          ref={containerRef}
          className="w-full [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-[85vh]"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>

      <div className="mt-4">
        <CategoryLegend
          categories={mapCategories}
          activeCategory={activeCategory}
          onCategoryClick={handleCategoryClick}
        />
      </div>
    </div>
  );
}

/* ─── Dendrogram Interactive Section ─── */
function DendrogramSection() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const allDendroColors = dendroCategories.map((c) => c.color);

  useEffect(() => {
    setLoading(true);
    fetch(DENDROGRAM_URL)
      .then((r) => r.text())
      .then((text) => {
        setSvgContent(text);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Apply filtering via injected <style> — targets circles AND polylines
  useEffect(() => {
    if (!containerRef.current || !svgContent) return;
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    const activeCat = dendroCategories.find((c) => c.id === activeCategory);
    const activeColor = activeCat ? activeCat.color : null;

    let styleEl = svg.querySelector(
      "style.interactive-style"
    ) as SVGStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "style"
      );
      styleEl.setAttribute("class", "interactive-style");
      svg.insertBefore(styleEl, svg.firstChild);
    }
    styleEl.textContent = getDendroFilterStyle(activeColor, allDendroColors);
  }, [activeCategory, svgContent, allDendroColors]);

  const handleCategoryClick = useCallback((id: string) => {
    setActiveCategory((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="w-full">
      <p
        className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        Status Dendrogram & Timeline
      </p>

      <div
        className="relative bg-[#f5f1eb]/50 rounded-sm border border-border/30 overflow-hidden"
        style={{ minHeight: "300px" }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground/60 rounded-full animate-spin" />
              <span
                className="text-xs text-muted-foreground"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Loading...
              </span>
            </div>
          </div>
        )}
        <div
          ref={containerRef}
          className="w-full [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-[85vh]"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>

      <div className="mt-4">
        <CategoryLegend
          categories={dendroCategories}
          activeCategory={activeCategory}
          onCategoryClick={handleCategoryClick}
        />
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function Poster005Viz() {
  return (
    <div className="w-full space-y-12">
      {/* Section 1: Reactor Map */}
      <MapSection />

      {/* Section 2: Timeline Dendrogram */}
      <DendrogramSection />
    </div>
  );
}
