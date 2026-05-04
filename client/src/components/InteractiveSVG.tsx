import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/*
  INTERACTIVE SVG COMPONENT — v7
  
  Architecture:
  - Click/tap only (no hover) for mobile-first smoothness
  - Scoped HTML <style> tag (not inside SVG) for dynamic CSS rules
  - Targets SVG elements by their existing IDs
  - GPU-accelerated opacity transitions
  - XMLHttpRequest for reliable SVG fetching (bypasses debug-collector wrapper)
  - Generic: works with any SVG that has ID'd groups
  - Full-bleed: no max-width constraint — parent controls width
  - Legend defaults to bottom position
*/

export interface RegionInfo {
  label: string;
  value: string;
}

export interface Region {
  id: string;
  groupIds: string[]; // SVG group IDs that belong to this region
  name: string;
  color: string;
  description?: string;
  info?: RegionInfo[]; // Key-value pairs to display
}

interface InteractiveSVGProps {
  svgUrl: string;
  regions: Region[];
  className?: string;
  legendPosition?: "top" | "bottom";
  maxHeight?: string;
}

// Unique ID counter for scoping CSS
let instanceCounter = 0;

export default function InteractiveSVG({
  svgUrl,
  regions,
  className = "",
  legendPosition = "bottom",
  maxHeight = "80vh",
}: InteractiveSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHTML, setSvgHTML] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [scopeId] = useState(() => `isvg-${++instanceCounter}`);

  // Build a lookup from group ID → region ID
  const groupToRegion = useMemo(() => {
    const map: Record<string, string> = {};
    regions.forEach((r) => {
      r.groupIds.forEach((gid) => {
        map[gid] = r.id;
      });
    });
    return map;
  }, [regions]);

  // All group IDs across all regions
  const allGroupIds = useMemo(() => {
    return regions.flatMap((r) => r.groupIds);
  }, [regions]);

  // Build the scoped CSS string for the current selection state
  const dynamicCSS = useMemo(() => {
    if (allGroupIds.length === 0) return "";
    // Scope all selectors to our container using the scopeId
    const scope = `#${scopeId}`;
    const selectors = allGroupIds.map((gid) => `${scope} #${CSS.escape(gid)}`);

    let css = `${selectors.join(", ")} { transition: opacity 0.25s ease-out; will-change: opacity; }\n`;

    if (selected) {
      // Dim all groups
      css += `${selectors.join(", ")} { opacity: 0.08; }\n`;
      // Highlight selected region's groups
      const activeRegion = regions.find((r) => r.id === selected);
      if (activeRegion) {
        const activeSelectors = activeRegion.groupIds.map(
          (gid) => `${scope} #${CSS.escape(gid)}`
        );
        css += `${activeSelectors.join(", ")} { opacity: 1 !important; }\n`;
      }
    }
    return css;
  }, [selected, allGroupIds, regions, scopeId]);

  // Fetch SVG with retry using XMLHttpRequest
  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    const maxRetries = 5;

    const doFetch = () => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", svgUrl, true);
      xhr.responseType = "text";
      xhr.onload = () => {
        if (cancelled) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          setSvgHTML(xhr.responseText);
        } else if (retries < maxRetries) {
          retries++;
          setTimeout(doFetch, 300 * retries);
        } else {
          setLoadError(true);
        }
      };
      xhr.onerror = () => {
        if (cancelled) return;
        if (retries < maxRetries) {
          retries++;
          setTimeout(doFetch, 300 * retries);
        } else {
          setLoadError(true);
        }
      };
      xhr.send();
    };

    doFetch();
    return () => {
      cancelled = true;
    };
  }, [svgUrl]);

  // After SVG is injected, make it responsive and mark ready
  useEffect(() => {
    if (!svgHTML || !containerRef.current) return;
    const container = containerRef.current;

    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        const svgEl = container.querySelector("svg");
        if (!svgEl) return;

        svgEl.style.width = "100%";
        svgEl.style.height = "auto";
        svgEl.style.maxHeight = maxHeight;
        svgEl.style.display = "block";
        svgEl.style.margin = "0 auto";
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

        if (!ready) setReady(true);
      });
      (container as any).__raf2 = raf2;
    });

    return () => {
      cancelAnimationFrame(raf1);
      if ((container as any).__raf2) {
        cancelAnimationFrame((container as any).__raf2);
      }
    };
  }, [svgHTML, maxHeight, ready]);

  // Click handler using event delegation
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      let current = e.target as Element | null;
      while (current && current !== containerRef.current) {
        const id = current.getAttribute("id");
        if (id && groupToRegion[id]) {
          const regionId = groupToRegion[id];
          setSelected((prev) => (prev === regionId ? null : regionId));
          return;
        }
        current = current.parentElement;
      }
      // Clicked empty space → deselect
      setSelected(null);
    },
    [groupToRegion]
  );

  const handleLegendClick = useCallback((id: string) => {
    setSelected((prev) => (prev === id ? null : id));
  }, []);

  const selectedRegion = regions.find((r) => r.id === selected);

  if (loadError) {
    return (
      <div className="w-full py-12 text-center text-muted-foreground text-sm">
        Unable to load the interactive visualisation.
      </div>
    );
  }

  const legend = (
    <div className="flex flex-wrap gap-2 justify-center">
      {regions.map((r) => (
        <button
          key={r.id}
          onClick={() => handleLegendClick(r.id)}
          className={`
            px-3 py-1.5 rounded-sm text-xs tracking-wide uppercase
            transition-all duration-200 border cursor-pointer
            active:scale-95
            ${
              selected === r.id
                ? "border-current shadow-sm"
                : "border-border/50 hover:border-current"
            }
          `}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            color: r.color,
            backgroundColor:
              selected === r.id ? `${r.color}12` : "transparent",
          }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
            style={{ backgroundColor: r.color }}
          />
          {r.name}
        </button>
      ))}
    </div>
  );

  const infoPanel = selectedRegion && (
    <div
      className="overflow-hidden transition-all duration-300 ease-out"
      style={{
        maxHeight: selectedRegion ? "400px" : "0",
        opacity: selectedRegion ? 1 : 0,
      }}
    >
      <div
        className="p-4 rounded-sm border border-border/60 bg-card max-w-2xl mx-auto"
        style={{
          borderLeftColor: selectedRegion.color,
          borderLeftWidth: 3,
        }}
      >
        <h4
          className="font-serif text-base mb-2"
          style={{ color: selectedRegion.color, fontWeight: 600 }}
        >
          {selectedRegion.name}
        </h4>
        {selectedRegion.info && selectedRegion.info.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {selectedRegion.info.map((item, i) => (
              <div key={i}>
                <p
                  className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {item.label}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}
        {selectedRegion.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {selectedRegion.description}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className={`w-full ${className}`}>
      {/* Scoped dynamic CSS — lives in the HTML DOM, not inside the SVG */}
      <style dangerouslySetInnerHTML={{ __html: dynamicCSS }} />

      {/* Legend top (if specified) */}
      {ready && legendPosition === "top" && (
        <div className="mb-4">{legend}</div>
      )}
      {ready && legendPosition === "top" && infoPanel && (
        <div className="mb-4">{infoPanel}</div>
      )}

      {/* SVG container */}
      <div className="w-full relative">
        {!svgHTML && !loadError && (
          <div
            className="flex items-center justify-center"
            style={{ minHeight: "200px" }}
          >
            <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {svgHTML && (
          <div
            id={scopeId}
            ref={containerRef}
            className="w-full"
            style={{
              opacity: ready ? 1 : 0.3,
              transition: "opacity 0.3s ease",
              cursor: "pointer",
            }}
            dangerouslySetInnerHTML={{ __html: svgHTML }}
            onClick={handleClick}
          />
        )}
      </div>

      {/* Legend bottom */}
      {ready && legendPosition === "bottom" && (
        <div className="mt-4">{legend}</div>
      )}
      {ready && legendPosition === "bottom" && infoPanel && (
        <div className="mt-4">{infoPanel}</div>
      )}

      {/* Hint */}
      {ready && (
        <p
          className="text-center text-xs text-muted-foreground mt-3"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {selected
            ? "Tap again or tap elsewhere to deselect"
            : "Tap a region or button to explore"}
        </p>
      )}
    </div>
  );
}
