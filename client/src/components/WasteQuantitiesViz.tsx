import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/*
  INTERACTIVE WASTE QUANTITIES VISUALISATION
  
  Strategy: Fetch SVG text, store in state, render via dangerouslySetInnerHTML
  on a stable wrapper div. Then use a ref + useEffect to attach event listeners
  to the injected SVG groups. The key is that we never change the innerHTML
  after the initial render — React won't try to reconcile it.
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
  
  // Store state in refs so event listeners always have current values
  const activeRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);

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

  // After SVG is rendered into DOM, attach event listeners
  useEffect(() => {
    if (!svgHTML || !svgContainerRef.current) return;
    
    const container = svgContainerRef.current;
    const svgEl = container.querySelector("svg");
    if (!svgEl) return;

    // Make SVG responsive
    svgEl.style.width = "100%";
    svgEl.style.height = "auto";
    svgEl.style.maxHeight = "75vh";
    svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Inject transition styles
    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = `
      g[id] { transition: opacity 0.35s ease, filter 0.35s ease; }
      g[id$="-blob"], g[id$="-title-text"], g[id$="-data-text"] { cursor: pointer; }
    `;
    svgEl.prepend(styleEl);

    // Attach listeners
    const cleanups: (() => void)[] = [];

    WASTE_TYPES.forEach((wt) => {
      const elements = [
        container.querySelector(`#${wt.blobId}`),
        container.querySelector(`#${wt.titleId}`),
        container.querySelector(`#${wt.dataId}`),
      ].filter(Boolean) as Element[];

      elements.forEach((el) => {
        const onEnter = () => setActiveType(wt.id);
        const onLeave = () => setActiveType(null);
        const onClick = () => setSelectedType((prev) => prev === wt.id ? null : wt.id);

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
    };
  }, [svgHTML]);

  // Update SVG visual states when active/selected changes
  useEffect(() => {
    if (!svgReady || !svgContainerRef.current) return;
    const container = svgContainerRef.current;
    const currentHighlight = selectedType || activeType;

    WASTE_TYPES.forEach((wt) => {
      const blob = container.querySelector(`#${wt.blobId}`) as SVGElement | null;
      const titleText = container.querySelector(`#${wt.titleId}`) as SVGElement | null;
      const dataText = container.querySelector(`#${wt.dataId}`) as SVGElement | null;

      if (!blob) return;

      if (currentHighlight === null) {
        blob.style.opacity = "1";
        blob.style.filter = "none";
        if (titleText) titleText.style.opacity = wt.id === "vllw" ? "0.4" : "1";
        if (dataText) dataText.style.opacity = "1";
      } else if (currentHighlight === wt.id) {
        blob.style.opacity = "1";
        blob.style.filter = `drop-shadow(0 0 12px ${wt.color}50)`;
        if (titleText) titleText.style.opacity = "1";
        if (dataText) dataText.style.opacity = "1";
      } else {
        blob.style.opacity = "0.2";
        blob.style.filter = "none";
        if (titleText) titleText.style.opacity = "0.15";
        if (dataText) dataText.style.opacity = "0.15";
      }
    });
  }, [activeType, selectedType, svgReady]);

  const handleLegendHover = useCallback((id: string | null) => {
    setActiveType(id);
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
      {/* Info panel */}
      <AnimatePresence mode="wait">
        {currentInfo && (
          <motion.div
            key={currentInfo.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mb-6 p-5 rounded-sm border border-border/60"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG container - uses dangerouslySetInnerHTML for stable DOM */}
      <div className="w-full relative" style={{ minHeight: "400px" }}>
        {!svgHTML && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {svgHTML && (
          <div
            ref={svgContainerRef}
            className="w-full transition-opacity duration-500"
            style={{ opacity: svgReady ? 1 : 0.3 }}
            dangerouslySetInnerHTML={{ __html: svgHTML }}
          />
        )}
      </div>

      {/* Legend / interactive buttons */}
      {svgReady && (
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
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

      {/* Instruction hint */}
      {svgReady && (
        <p
          className="text-center text-xs text-muted-foreground mt-3"
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
