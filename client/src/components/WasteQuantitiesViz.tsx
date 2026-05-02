import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/*
  INTERACTIVE WASTE QUANTITIES VISUALISATION — v2 (performance optimised)
  
  Key changes from v1:
  - Constrained max-height to 500px so the whole thing is visible at once
  - Removed drop-shadow filter (extremely expensive on 2000+ path SVG)
  - Use CSS classes with will-change:opacity for GPU-composited transitions
  - Simplified transition to opacity-only (no filter)
  - Added debounce on hover to reduce rapid state changes
*/

interface WasteType {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  volume: string;
  volumePercent: string;
  radioactivity: string;
  description: string;
  blobId: string;
  titleId: string;
  dataId: string;
}

const WASTE_TYPES: WasteType[] = [
  {
    id: "vllw",
    name: "Very Low Level Waste",
    abbreviation: "VLLW",
    color: "#7d746a",
    volume: "2,610,000 m\u00B3",
    volumePercent: "58.6%",
    radioactivity: "<0.001%",
    description:
      "Includes rubble, soil, and other materials from decommissioned nuclear sites. Radioactivity is so low it poses negligible risk and can be disposed of in landfill-type facilities.",
    blobId: "vllw-blob",
    titleId: "vllw-title-text",
    dataId: "vllw-data-text",
  },
  {
    id: "llw",
    name: "Low Level Waste",
    abbreviation: "LLW",
    color: "#4b6e70",
    volume: "1,340,000 m\u00B3",
    volumePercent: "30.2%",
    radioactivity: "<0.001%",
    description:
      "Protective clothing, tools, and filters from day-to-day operations. Contains small amounts of short-lived radioactivity. Compacted and stored in near-surface repositories.",
    blobId: "llw-blob",
    titleId: "llw-title-text",
    dataId: "llw-data-text",
  },
  {
    id: "ilw",
    name: "Intermediate Level Waste",
    abbreviation: "ILW",
    color: "#1b3967",
    volume: "496,000 m\u00B3",
    volumePercent: "11.1%",
    radioactivity: "4.4%",
    description:
      "Reactor components, chemical sludges, and resins. Requires shielding during handling but not cooling. Typically encased in cement or bitumen and stored in engineered vaults.",
    blobId: "ilw-blob",
    titleId: "ilw-title-text",
    dataId: "ilw-data-text",
  },
  {
    id: "hlw",
    name: "High Level Waste",
    abbreviation: "HLW",
    color: "#a51e23",
    volume: "1,470 m\u00B3",
    volumePercent: "<0.1%",
    radioactivity: "95.6%",
    description:
      "Spent fuel and reprocessing liquors. Extremely radioactive and heat-generating. Requires deep geological disposal. Despite containing almost all the radioactivity, it occupies less than 0.1% of total waste volume.",
    blobId: "hlw-blob",
    titleId: "hlw-title-text",
    dataId: "hlw-data-text",
  },
];

const SVG_URL = "/manus-storage/waste-quantities_9d1b6de0.svg";

export default function WasteQuantitiesViz() {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [svgHTML, setSvgHTML] = useState<string | null>(null);
  const [svgReady, setSvgReady] = useState(false);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch SVG on mount
  useEffect(() => {
    let cancelled = false;
    fetch(SVG_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        setSvgHTML(text);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => { cancelled = true; };
  }, []);

  // After SVG is rendered into DOM, attach event listeners and inject optimised styles
  useEffect(() => {
    if (!svgHTML || !svgContainerRef.current) return;
    
    const container = svgContainerRef.current;
    const svgEl = container.querySelector("svg");
    if (!svgEl) return;

    // Constrain SVG size — key fix: make it viewable all at once
    svgEl.style.width = "100%";
    svgEl.style.height = "auto";
    svgEl.style.maxHeight = "65vh";
    svgEl.style.display = "block";
    svgEl.style.margin = "0 auto";
    svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Inject optimised CSS — opacity only, no filters, GPU-composited
    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = `
      g[id$="-blob"], g[id$="-title-text"], g[id$="-data-text"] {
        will-change: opacity;
        transition: opacity 0.25s ease-out;
        cursor: pointer;
      }
      g[id$="-blob"].dimmed, g[id$="-title-text"].dimmed, g[id$="-data-text"].dimmed {
        opacity: 0.15;
      }
      g[id$="-blob"].highlighted, g[id$="-title-text"].highlighted, g[id$="-data-text"].highlighted {
        opacity: 1;
      }
    `;
    svgEl.prepend(styleEl);

    // Attach listeners with debounced hover
    const cleanups: (() => void)[] = [];

    WASTE_TYPES.forEach((wt) => {
      const elements = [
        container.querySelector(`#${wt.blobId}`),
        container.querySelector(`#${wt.titleId}`),
        container.querySelector(`#${wt.dataId}`),
      ].filter(Boolean) as Element[];

      elements.forEach((el) => {
        const onEnter = () => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          setActiveType(wt.id);
        };
        const onLeave = () => {
          hoverTimeoutRef.current = setTimeout(() => setActiveType(null), 50);
        };
        const onClick = (e: Event) => {
          e.stopPropagation();
          setSelectedType((prev) => prev === wt.id ? null : wt.id);
        };

        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
        el.addEventListener("click", onClick);

        cleanups.push(() => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mouseleave", onLeave);
          el.removeEventListener("click", onClick);
        });
      });
    });

    setSvgReady(true);

    return () => {
      cleanups.forEach((fn) => fn());
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [svgHTML]);

  // Update SVG visual states using CSS classes (much faster than inline style manipulation)
  useEffect(() => {
    if (!svgReady || !svgContainerRef.current) return;
    const container = svgContainerRef.current;
    const currentHighlight = selectedType || activeType;

    WASTE_TYPES.forEach((wt) => {
      const blob = container.querySelector(`#${wt.blobId}`);
      const titleText = container.querySelector(`#${wt.titleId}`);
      const dataText = container.querySelector(`#${wt.dataId}`);

      const elements = [blob, titleText, dataText].filter(Boolean) as Element[];

      if (currentHighlight === null) {
        // Reset all
        elements.forEach((el) => {
          el.classList.remove("dimmed", "highlighted");
        });
      } else if (currentHighlight === wt.id) {
        // Highlight this one
        elements.forEach((el) => {
          el.classList.remove("dimmed");
          el.classList.add("highlighted");
        });
      } else {
        // Dim this one
        elements.forEach((el) => {
          el.classList.remove("highlighted");
          el.classList.add("dimmed");
        });
      }
    });
  }, [activeType, selectedType, svgReady]);

  const handleLegendHover = useCallback((id: string | null) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (id) {
      setActiveType(id);
    } else {
      hoverTimeoutRef.current = setTimeout(() => setActiveType(null), 50);
    }
  }, []);

  const handleLegendClick = useCallback((id: string) => {
    setSelectedType((prev) => (prev === id ? null : id));
  }, []);

  const currentInfo = WASTE_TYPES.find(
    (wt) => wt.id === (selectedType || activeType)
  );

  if (loadError) {
    return (
      <div className="w-full py-16 text-center text-muted-foreground">
        <p>Unable to load the interactive visualisation.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Legend / interactive buttons — moved above SVG for immediate access */}
      {svgReady && (
        <div className="mb-4 flex flex-wrap gap-3 justify-center">
          {WASTE_TYPES.map((wt) => (
            <button
              key={wt.id}
              onMouseEnter={() => handleLegendHover(wt.id)}
              onMouseLeave={() => handleLegendHover(null)}
              onClick={() => handleLegendClick(wt.id)}
              className={`
                px-3 py-1.5 rounded-sm text-xs tracking-wide uppercase transition-all duration-200 border
                ${
                  selectedType === wt.id
                    ? "border-current"
                    : "border-border/60 hover:border-current"
                }
              `}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: wt.color,
                backgroundColor:
                  selectedType === wt.id ? `${wt.color}10` : "transparent",
              }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: wt.color }}
              />
              {wt.abbreviation}
            </button>
          ))}
        </div>
      )}

      {/* Info panel — appears between legend and SVG */}
      <AnimatePresence mode="wait">
        {currentInfo && (
          <motion.div
            key={currentInfo.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-4 overflow-hidden"
          >
            <div
              className="p-4 rounded-sm border border-border/60"
              style={{ borderLeftColor: currentInfo.color, borderLeftWidth: 3 }}
            >
              <div className="flex items-baseline gap-3 mb-2">
                <h4
                  className="font-serif text-lg"
                  style={{ color: currentInfo.color, fontWeight: 600 }}
                >
                  {currentInfo.name} ({currentInfo.abbreviation})
                </h4>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div>
                  <p
                    className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Volume
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {currentInfo.volume}
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    % of Total
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {currentInfo.volumePercent}
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Radioactivity
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {currentInfo.radioactivity}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentInfo.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG container — constrained to fit viewport without scrolling */}
      <div className="w-full relative">
        {!svgHTML && !loadError && (
          <div className="flex items-center justify-center" style={{ minHeight: "300px" }}>
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {svgHTML && (
          <div
            ref={svgContainerRef}
            className="w-full transition-opacity duration-300 mx-auto"
            style={{ opacity: svgReady ? 1 : 0.3, maxWidth: "700px" }}
            dangerouslySetInnerHTML={{ __html: svgHTML }}
          />
        )}
      </div>

      {/* Instruction hint */}
      {svgReady && (
        <p
          className="text-center text-xs text-muted-foreground mt-4"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {selectedType
            ? "Click again to deselect"
            : "Hover or click a waste type to explore"}
        </p>
      )}
    </div>
  );
}
