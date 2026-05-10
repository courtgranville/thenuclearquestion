// Poster 005 — Map sub-view (v1.1 — overlay SVG, year-sync, cluster expansion).
//
// Layer 1: print map SVG via dangerouslySetInnerHTML (static).
// Layer 2: overlay SVG with cluster hit-circles as JSX (refs).
//
// Subscriptions:
//   - focusStatus  → bulk-dim non-matching circles via injected style
//   - focusSite    → cluster hover preview / click-lock
//   - year         → bulk-dim each status's circles by fraction-live-at-year

import { useEffect, useMemo, useRef, useState } from 'react';
import { loadPoster005Forms, reactorIsLiveAtYear, type ReactorStatus } from '@/assets/poster005';
import { poster005Store, type Poster005State } from '@/lib/poster005Store';

const MAP_URL = '/assets/005-map_d6bf9e9f.svg';

// Tightened viewBox. Print is 0 0 1694.98 1330.76; content sits in
// roughly 0 0 1240 1230 (UK outline + 3 cluster callouts).
const MAP_VIEWBOX = { x: 0, y: 0, w: 1694.98, h: 1330.76 } as const;

const FOCUS_DIM = 0.20;
const CLUSTER_REST_DIM = 0.30;
const CLUSTER_HOVER_DIM = 0.55;
const SELLAFIELD_ANNOTATION = "Britain's largest reactor concentration — 7 reactors, 0 operating.";

// Print fill colours used for reactor circles, keyed by ReactorStatus.
const STATUS_FILL: Record<ReactorStatus, string> = {
  construction: '#b4822e',
  operating:    '#267c3e',
  retired:      '#7d746b',
  cancelled:    '#a61e23',
};

// Map cluster IDs (from clipPath defs) to a human-readable name we
// display in the annotation overlay.
const CLUSTER_NAME: Record<string, string> = {
  clippath:    'Sellafield / Moorside',
  'clippath-1': 'Sizewell',
  'clippath-2': 'Wylfa',
};

export function Poster005Map() {
  const data = useMemo(() => loadPoster005Forms(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const printSvgRef = useRef<SVGSVGElement | null>(null);
  const styleElRef = useRef<SVGStyleElement | null>(null);
  const [svgText, setSvgText] = useState<string | null>(null);
  const [annotationText, setAnnotationText] = useState<string | null>(null);

  // Fetch print SVG.
  useEffect(() => {
    let cancelled = false;
    fetch(MAP_URL)
      .then((r) => r.text())
      .then((t) => { if (!cancelled) setSvgText(t); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // After mount, capture print SVG ref + inject style element.
  useEffect(() => {
    if (!svgText || !containerRef.current) return;
    const svg = containerRef.current.querySelector('svg.p005-map-print') as SVGSVGElement | null;
    if (!svg) return;
    printSvgRef.current = svg;
    svg.setAttribute('viewBox', `${MAP_VIEWBOX.x} ${MAP_VIEWBOX.y} ${MAP_VIEWBOX.w} ${MAP_VIEWBOX.h}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    let style = svg.querySelector('style.p005-map-overrides') as SVGStyleElement | null;
    if (!style) {
      style = document.createElementNS('http://www.w3.org/2000/svg', 'style') as SVGStyleElement;
      style.setAttribute('class', 'p005-map-overrides');
      svg.insertBefore(style, svg.firstChild);
    }
    styleElRef.current = style;
  }, [svgText]);

  // Subscribe to store + apply imperative style overrides.
  useEffect(() => {
    function apply(state: Poster005State) {
      const { focusStatus, focusSite, year } = state;
      const styleEl = styleElRef.current;
      if (!styleEl) return;

      // 1. Compute fraction-live per status at the scrub year.
      const liveFrac: Record<ReactorStatus, number> = {
        construction: 1, operating: 1, retired: 1, cancelled: 1,
      };
      for (const status of Object.keys(liveFrac) as ReactorStatus[]) {
        const sReactors = data.reactors.filter((r) => r.status === status);
        if (sReactors.length === 0) continue;
        if (status === 'cancelled') {
          // Cancelled reactors visible from cancellation year onward.
          const visible = sReactors.filter(
            (r) => r.cancellation_year !== null && year >= r.cancellation_year,
          ).length;
          liveFrac.cancelled = visible / sReactors.length;
        } else {
          const live = sReactors.filter((r) => reactorIsLiveAtYear(r, year)).length;
          liveFrac[status] = live / sReactors.length;
        }
      }

      // 2. Compose CSS.
      let css = '';

      if (focusStatus) {
        // Status focus: full opacity for matching color, dim others.
        for (const [k, hex] of Object.entries(STATUS_FILL) as [ReactorStatus, string][]) {
          if (k === focusStatus) {
            css += `circle[fill="${hex}"]{opacity:${(0.4 + 0.6 * liveFrac[k]).toFixed(2)};fill-opacity:1;transition:opacity .25s ease-out}`;
          } else {
            css += `circle[fill="${hex}"]{opacity:${FOCUS_DIM};transition:opacity .25s ease-out}`;
          }
        }
      } else if (focusSite?.startsWith('lock:')) {
        // Cluster locked — dim everything to 30%, the locked
        // cluster's clipPath inset reads as exhibit through its
        // own internal opacity.
        css += `circle{opacity:${CLUSTER_REST_DIM};transition:opacity .3s ease-out}`;
      } else if (focusSite?.startsWith('hover:')) {
        css += `circle{opacity:${CLUSTER_HOVER_DIM};transition:opacity .25s ease-out}`;
      } else {
        // Default: bulk-dim by year liveness fraction per status.
        for (const [k, hex] of Object.entries(STATUS_FILL) as [ReactorStatus, string][]) {
          const op = (0.25 + 0.75 * liveFrac[k]).toFixed(2);
          css += `circle[fill="${hex}"]{opacity:${op};transition:opacity .25s ease-out}`;
        }
      }
      styleEl.textContent = css;

      // 3. Cluster annotation.
      if (focusSite?.startsWith('lock:clippath')) {
        const cid = focusSite.slice('lock:'.length);
        if (cid === 'clippath') {
          setAnnotationText(SELLAFIELD_ANNOTATION);
        } else if (cid === 'clippath-1' || cid === 'clippath-2') {
          const name = CLUSTER_NAME[cid] ?? cid;
          setAnnotationText(name);
        } else {
          setAnnotationText(null);
        }
      } else {
        setAnnotationText(null);
      }
    }

    apply(poster005Store.getCurrent());
    const unsub = poster005Store.subscribe(apply);
    return () => { unsub(); };
  }, [svgText, data]);

  // Cluster hit handlers.
  const onClusterEnter = (id: string) => () => {
    if (poster005Store.getCurrent().focusSite === null) {
      poster005Store.setFocusSite(`hover:${id}`);
    }
  };
  const onClusterLeave = (id: string) => () => {
    if (poster005Store.getCurrent().focusSite === `hover:${id}`) {
      poster005Store.setFocusSite(null);
    }
  };
  const onClusterClick = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const cur = poster005Store.getCurrent().focusSite;
    const lock = `lock:${id}`;
    poster005Store.setFocusSite(cur === lock ? null : lock);
  };

  // Click empty overlay area clears any cluster lock.
  const onOverlayClick = () => {
    if (poster005Store.getCurrent().focusSite?.startsWith('lock:')) {
      poster005Store.setFocusSite(null);
    }
  };

  const vb = MAP_VIEWBOX;
  const clusters = data.map_clusters;

  return (
    <div className="w-full">
      <p
        className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-3"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        Reactor Map
      </p>
      <div
        ref={containerRef}
        className="relative bg-[#f5f1eb]/50 rounded-sm border border-border/30 overflow-hidden"
        style={{ minHeight: 600 }}
      >
        {/* Layer 1 — print SVG */}
        <div
          className="absolute inset-0 [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{
            __html: svgText
              ? svgText.replace(
                  /<svg([^>]*)>/,
                  '<svg$1 class="p005-map-print" style="display:block">',
                )
              : '',
          }}
        />

        {/* Layer 2 — interactive overlay (cluster hit-circles) */}
        <svg
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 5 }}
          onClick={onOverlayClick}
        >
          {clusters.map((c) => {
            const isLocked = poster005Store.getCurrent().focusSite === `lock:${c.id}`;
            return (
              <g key={c.id}>
                <circle
                  cx={c.cx}
                  cy={c.cy}
                  r={c.r}
                  fill="rgba(0,0,0,0)"
                  stroke="rgba(13,26,30,0.0)"
                  strokeWidth="1.5"
                  style={{ cursor: 'pointer' }}
                  onPointerEnter={onClusterEnter(c.id)}
                  onPointerLeave={onClusterLeave(c.id)}
                  onClick={onClusterClick(c.id)}
                  data-cluster-id={c.id}
                />
                {/* Visible hover ring (only when not yet locked).
                    A persistent thin ring marks the three callouts so
                    users discover them; on hover/lock it brightens. */}
                <circle
                  cx={c.cx}
                  cy={c.cy}
                  r={c.r}
                  fill="none"
                  stroke="#0D1A1E"
                  strokeWidth={isLocked ? '2.4' : '0.6'}
                  strokeDasharray={isLocked ? 'none' : '4 3'}
                  opacity={isLocked ? 0.85 : 0.30}
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </svg>

        {/* Cluster-locked annotation */}
        {annotationText && (
          <div
            className="absolute top-3 left-3 max-w-xs px-3 py-2 rounded-sm bg-[#ECE7DF] border-l-2 pointer-events-none"
            style={{
              borderLeftColor: '#A51E22',
              fontFamily: "'Playfair', Georgia, serif",
              fontSize: 13,
              color: '#0D1A1E',
              zIndex: 10,
            }}
          >
            {annotationText}
          </div>
        )}
      </div>
      <p
        className="text-xs text-muted-foreground mt-2 text-center"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        Click any of the three dotted callouts to inspect the cluster · click outside or press Escape to close
      </p>
    </div>
  );
}
