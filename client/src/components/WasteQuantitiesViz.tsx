import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/*
  INTERACTIVE WASTE QUANTITIES VISUALISATION — v5
  
  Uses EVENT DELEGATION on the container div for robust interaction.
  Direct style.opacity manipulation for guaranteed SVG compatibility.
  Double-rAF for initial SVG setup after dangerouslySetInnerHTML.
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
  blobGroupId: string;
  labelGroupId: string;
  dataGroupId: string;
  hitAreaId: string;
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
    blobGroupId: "blob-vllw",
    labelGroupId: "label-vllw",
    dataGroupId: "data-vllw",
    hitAreaId: "hit-vllw",
  },
  {
    id: "llw",
    name: "Low Level Waste",
    abbreviation: "LLW",
    color: "#1b3967",
    volume: "1,340,000 m\u00B3",
    volumePercent: "30.2%",
    radioactivity: "<0.001%",
    description:
      "Protective clothing, tools, and filters from day-to-day operations. Contains small amounts of short-lived radioactivity. Compacted and stored in near-surface repositories.",
    blobGroupId: "blob-llw",
    labelGroupId: "label-llw",
    dataGroupId: "data-llw",
    hitAreaId: "hit-llw",
  },
  {
    id: "ilw",
    name: "Intermediate Level Waste",
    abbreviation: "ILW",
    color: "#4b6e70",
    volume: "496,000 m\u00B3",
    volumePercent: "11.1%",
    radioactivity: "4.4%",
    description:
      "Reactor components, chemical sludges, and resins. Requires shielding during handling but not cooling. Typically encased in cement or bitumen and stored in engineered vaults.",
    blobGroupId: "blob-ilw",
    labelGroupId: "label-ilw",
    dataGroupId: "data-ilw",
    hitAreaId: "hit-ilw",
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
    blobGroupId: "blob-hlw",
    labelGroupId: "label-hlw",
    dataGroupId: "data-hlw",
    hitAreaId: "hit-hlw",
  },
];

// Map from hit-area/label/data element IDs to waste type IDs
const ID_TO_WASTE_TYPE: Record<string, string> = {};
WASTE_TYPES.forEach((wt) => {
  ID_TO_WASTE_TYPE[wt.hitAreaId] = wt.id;
  ID_TO_WASTE_TYPE[wt.labelGroupId] = wt.id;
  ID_TO_WASTE_TYPE[wt.dataGroupId] = wt.id;
  ID_TO_WASTE_TYPE[wt.blobGroupId] = wt.id;
});

const SVG_URL = "/manus-storage/006-waste-quantities-v4_ea671e2f.svg";

// Helper: walk up the DOM from an element to find the nearest ancestor with a known ID
function findWasteTypeFromElement(el: Element | null): string | null {
  let current = el;
  while (current) {
    const id = current.getAttribute("id") || current.id;
    if (id && ID_TO_WASTE_TYPE[id]) {
      return ID_TO_WASTE_TYPE[id];
    }
    current = current.parentElement;
  }
  return null;
}

export default function WasteQuantitiesViz() {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [svgHTML, setSvgHTML] = useState<string | null>(null);
  const [svgReady, setSvgReady] = useState(false);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, []);

  // After SVG is injected, apply styles via double-rAF
  useEffect(() => {
    if (!svgHTML || !svgContainerRef.current) return;
    let cancelled = false;

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled || !svgContainerRef.current) return;
        const container = svgContainerRef.current;
        const svgEl = container.querySelector("svg");
        if (!svgEl) return;

        // Make SVG responsive
        svgEl.style.width = "100%";
        svgEl.style.height = "auto";
        svgEl.style.maxHeight = "70vh";
        svgEl.style.display = "block";
        svgEl.style.margin = "0 auto";
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

        // Set transition on all interactive groups
        WASTE_TYPES.forEach((wt) => {
          [wt.blobGroupId, wt.labelGroupId, wt.dataGroupId].forEach((gid) => {
            const el = container.querySelector(`#${gid}`) as SVGElement | null;
            if (el) {
              el.style.transition = "opacity 0.3s ease";
            }
          });
        });

        setSvgReady(true);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [svgHTML]);

  // EVENT DELEGATION: handle mouseover/mouseout/click on the container div
  // This is much more robust than attaching to individual SVG elements
  const handleMouseOver = useCallback(
    (e: React.MouseEvent) => {
      if (selectedType) return; // Don't change hover when something is selected
      const wasteId = findWasteTypeFromElement(e.target as Element);
      setActiveType(wasteId);
    },
    [selectedType]
  );

  const handleMouseOut = useCallback(
    (e: React.MouseEvent) => {
      if (selectedType) return;
      // Only clear if we're leaving the SVG area entirely
      const related = e.relatedTarget as Element | null;
      if (related && svgContainerRef.current?.contains(related)) {
        // Still inside the container — check if the new target is a waste element
        const wasteId = findWasteTypeFromElement(related);
        setActiveType(wasteId);
      } else {
        setActiveType(null);
      }
    },
    [selectedType]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const wasteId = findWasteTypeFromElement(e.target as Element);
      if (wasteId) {
        e.stopPropagation();
        setSelectedType((prev) => (prev === wasteId ? null : wasteId));
      } else {
        // Clicked on empty space — deselect
        setSelectedType(null);
      }
    },
    []
  );

  // Apply opacity changes whenever activeType or selectedType changes
  useEffect(() => {
    if (!svgContainerRef.current) return;
    const container = svgContainerRef.current;
    const currentHighlight = selectedType || activeType;

    WASTE_TYPES.forEach((wt) => {
      [wt.blobGroupId, wt.labelGroupId, wt.dataGroupId].forEach((gid) => {
        const el = container.querySelector(`#${gid}`) as SVGElement | null;
        if (!el) return;

        if (currentHighlight === null) {
          el.style.opacity = "";
        } else if (currentHighlight === wt.id) {
          el.style.opacity = "1";
        } else {
          el.style.opacity = "0.12";
        }
      });
    });
  }, [activeType, selectedType]);

  const handleLegendHover = useCallback(
    (id: string | null) => {
      if (!selectedType) setActiveType(id);
    },
    [selectedType]
  );

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
    <div className="w-full max-w-4xl mx-auto">
      {/* Legend buttons */}
      {svgReady && (
        <div className="mb-5 flex flex-wrap gap-3 justify-center">
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
                    ? "border-current shadow-sm"
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

      {/* Info panel */}
      <AnimatePresence mode="wait">
        {currentInfo && (
          <motion.div
            key={currentInfo.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mb-5"
          >
            <div
              className="p-4 rounded-sm border border-border/60 bg-card"
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
              <div className="grid grid-cols-3 gap-4 mb-3">
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

      {/* SVG container with event delegation */}
      <div className="w-full relative" style={{ cursor: "default" }}>
        {!svgHTML && !loadError && (
          <div
            className="flex items-center justify-center"
            style={{ minHeight: "300px" }}
          >
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {svgHTML && (
          <div
            ref={svgContainerRef}
            className="w-full"
            style={{ opacity: svgReady ? 1 : 0.3, cursor: "crosshair" }}
            dangerouslySetInnerHTML={{ __html: svgHTML }}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            onClick={handleClick}
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
            ? "Click anywhere or the button again to deselect"
            : "Hover over the shapes or click a waste type to explore"}
        </p>
      )}
    </div>
  );
}
