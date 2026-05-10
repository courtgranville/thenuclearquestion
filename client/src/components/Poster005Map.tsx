// ─────────────────────────────────────────────────────────────────
// Poster005Map.tsx — hero UK reactor map.
//
// Mirrors Poster006Sellafield's pattern:
//   - Fetches the annotated map SVG once and injects it via a
//     React.memo()'d wrapper so parent re-renders (caused by
//     filter / hover state changes) don't tear down the SVG.
//   - Container-delegated pointerover / pointerout on the persistent
//     container; walks up to the nearest circle that carries
//     data-unit and uses its first unit name as hoveredReactor.
//   - CSS classes injected once into <head> drive .is-focused
//     (transform: scale 1.15) and .is-dimmed (opacity 0.25)
//     transitions on the loc-* circles.
//
// Filter integration: subscribes to poster005Store. Whenever
// filteredStatus or hoveredReactor changes, walks every annotated
// circle and applies / clears the is-focused / is-dimmed classes
// based on the composition rule from the brief:
//   - hover overrides filter (hovered circle stays full opacity)
//   - filter without hover: circles whose data-phase matches stay
//     full, others dim
//   - default: everything full opacity
// ─────────────────────────────────────────────────────────────────

import { memo, useEffect, useRef, useState } from 'react';
import {
  REACTORS,
  REACTOR_BY_ID,
  STATUS_COLOUR,
  STATUS_LABEL,
  type ReactorStatus,
} from '@/lib/poster005Data';
import { poster005Store } from '@/lib/poster005Store';
import Poster005StatusLegend from '@/components/Poster005StatusLegend';

const MAP_URL = '/assets/005-map-annotated_57baca8a.svg';

const CSS_INJECTED_KEY = '__poster005_map_css';

function injectStyleOnce() {
  if (typeof document === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any)[CSS_INJECTED_KEY]) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any)[CSS_INJECTED_KEY] = true;
  const style = document.createElement('style');
  // Circles in the print SVG have fill-opacity 0.55 (past) or 1.0
  // (operating). On hover/filter focus we want the circle to read as
  // unambiguously selected — bumping fill-opacity to 1.0 makes the
  // print's muted tones pop, and the 1.6× scale puts physical weight
  // behind the focus. On dim we drop ALL the way to 0.08 so the
  // filtered group reads as the sole carrier of meaning.
  style.textContent = `
    .poster005-map circle[data-unit] {
      transform-box: fill-box;
      transform-origin: center;
      transition: transform 140ms ease-out, opacity 160ms ease-out,
                  fill-opacity 160ms ease-out, stroke-width 140ms ease-out;
      cursor: pointer;
      will-change: transform, opacity, fill-opacity;
    }
    .poster005-map circle[data-unit].is-focused {
      transform: scale(1.6);
      fill-opacity: 1 !important;
      stroke-width: 1.25 !important;
    }
    .poster005-map circle[data-unit].is-filter-match {
      fill-opacity: 1 !important;
      stroke-width: 1 !important;
    }
    .poster005-map circle[data-unit].is-dimmed {
      opacity: 0.04;
    }
  `;
  document.head.appendChild(style);
}

// Memoised wrapper around the SVG injection. Without memo, React's
// dangerouslySetInnerHTML re-injects the full map on every parent
// re-render (which happens on every store update) — that tears down
// the listeners and re-runs the costly DOM build.
const InjectedMap = memo(function InjectedMap({ markup }: { markup: string }) {
  return <div className="w-full" dangerouslySetInnerHTML={{ __html: markup }} />;
});

// Compact hover pill — sits between the map and the legend, fed by
// poster005Store.hoveredReactor (which any of the three views can
// set). Court's brief: name, status, and capacity, surfaced near the
// legend so the colour-code reading happens in one glance.
function MapHoverPill() {
  const [hoveredId, setHoveredId] = useState(poster005Store.getCurrent().hoveredReactor);
  useEffect(() => {
    return poster005Store.subscribe((s) => setHoveredId(s.hoveredReactor));
  }, []);
  const r = hoveredId ? REACTOR_BY_ID[hoveredId] : null;
  const colour = r ? STATUS_COLOUR[r.status] : 'rgba(13,26,30,0.4)';

  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 mt-3 min-h-[40px] flex items-center justify-center"
      aria-live="polite"
    >
      {!r && (
        <p
          className="text-sm italic text-muted-foreground text-center"
          style={{ fontFamily: "'Playfair', Georgia, serif" }}
        >
          Hover any reactor for its name, capacity, and status.
        </p>
      )}
      {r && (
        <div
          className="flex items-baseline gap-x-4 gap-y-1 flex-wrap justify-center px-4 py-2 rounded-sm border bg-card"
          style={{
            borderColor: 'rgba(13,26,30,0.16)',
            borderLeftColor: colour,
            borderLeftWidth: 3,
          }}
        >
          <span
            className="font-serif text-base sm:text-lg leading-tight"
            style={{ color: colour, fontWeight: 600 }}
          >
            {r.name}
          </span>
          <span
            className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
            style={{ fontFamily: "'Playfair', Georgia, serif" }}
          >
            {STATUS_LABEL[r.status]}
          </span>
          <span
            className="text-sm tabular-nums text-foreground"
            style={{ fontFamily: "'Playfair', Georgia, serif" }}
          >
            {r.capacityMw ? `${r.capacityMw.toLocaleString()} MW` : '— MW'}
          </span>
        </div>
      )}
    </div>
  );
}

export default function Poster005Map() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  useEffect(() => { injectStyleOnce(); }, []);

  // Fetch once. We don't tighten the viewBox here — the source map
  // has been laid out with its inset zoom circles in deliberate
  // positions; cropping would clip them.
  useEffect(() => {
    let cancelled = false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', MAP_URL, true);
    xhr.responseType = 'text';
    xhr.onload = () => {
      if (cancelled) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xhr.responseText, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (svg) {
          // Crop the viewBox so the actual ink is visually centred
          // both horizontally and vertically. The rendered ink's
          // centre of mass sits at x≈802 (two left insets + UK
          // body + one right inset) and y≈650 (most map area lives
          // in y=400..900). Geometric SVG centring would leave
          // empty space above the UK; this viewBox centres on the
          // ink midpoint instead.
          //   x: midpoint 132 + 1340/2 = 802  (matches ink centre)
          //   y: midpoint 125 + 1050/2 = 650  (matches ink centre)
          svg.setAttribute('viewBox', '132 125 1340 1050');

          // Stamp any unstamped reactor circles by proximity to a
          // known reactor's project map position. The build-time
          // annotation script (scripts/annotate-poster-005-map.mjs)
          // matches by name + status group but misses circles in
          // duplicate / decorative layers — those would otherwise
          // not respond to hover. Walk all small circles and stamp
          // by nearest reactor within a tolerance.
          const annotated = new Set<SVGCircleElement>();
          svg.querySelectorAll<SVGCircleElement>('circle').forEach((c) => {
            if (c.getAttribute('data-unit')) {
              annotated.add(c);
              return;
            }
            const r = parseFloat(c.getAttribute('r') ?? '0');
            if (r < 3 || r > 15) return; // skip tiny dots + the big inset outlines
            const cx = parseFloat(c.getAttribute('cx') ?? '0');
            const cy = parseFloat(c.getAttribute('cy') ?? '0');
            // Find the closest reactor by mapX/mapY.
            let best: typeof REACTORS[0] | null = null;
            let bestD = Infinity;
            for (const rr of REACTORS) {
              if (rr.mapX === null || rr.mapY === null) continue;
              const d = Math.hypot(rr.mapX - cx, rr.mapY - cy);
              if (d < bestD) { bestD = d; best = rr; }
            }
            // Tolerance: 14 SVG units. Above this we assume the
            // circle is decorative rather than a project marker.
            if (best && bestD < 14) {
              // Collect every unit name that shares this project
              // (mapX/mapY are project-level, so multi-unit sites
              // are represented by one circle in the print).
              const units = REACTORS
                .filter((r2) =>
                  r2.mapX !== null && r2.mapY !== null &&
                  Math.abs(r2.mapX - best!.mapX!) < 1 &&
                  Math.abs(r2.mapY - best!.mapY!) < 1)
                .map((r2) => r2.id);
              c.setAttribute('data-unit', units.join(','));
              c.setAttribute('data-phase', best.status);
              annotated.add(c);
            }
          });
          svg.setAttribute('width', '100%');
          svg.removeAttribute('height');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          svg.setAttribute('style', 'display:block;width:100%;height:auto;');
        }
        setSvgMarkup(new XMLSerializer().serializeToString(svg ?? doc.documentElement));
      }
    };
    xhr.send();
    return () => { cancelled = true; };
  }, []);

  // Hover handlers — delegated to the container. pointerover/out
  // bubble (unlike enter/leave), so a single listener on the
  // container handles every circle.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const firstUnitName = (raw: string | null): string | null => {
      if (!raw) return null;
      const first = raw.split(',')[0]?.trim();
      return first && REACTOR_BY_ID[first] ? first : null;
    };

    const findUnitTarget = (el: Element | null): SVGCircleElement | null => {
      let cur: Element | null = el;
      while (cur && cur !== container) {
        if (cur instanceof SVGCircleElement && cur.getAttribute('data-unit')) {
          return cur;
        }
        cur = cur.parentElement;
      }
      return null;
    };

    const onOver = (e: PointerEvent) => {
      const c = findUnitTarget(e.target as Element);
      if (!c) return;
      const id = firstUnitName(c.getAttribute('data-unit'));
      if (id) poster005Store.setHoveredReactor(id);
    };
    const onOut = (e: PointerEvent) => {
      const c = findUnitTarget(e.target as Element);
      if (!c) return;
      const next = findUnitTarget(e.relatedTarget as Element);
      if (next && next !== c) return;
      poster005Store.setHoveredReactor(null);
    };

    container.addEventListener('pointerover', onOver, { passive: true });
    container.addEventListener('pointerout', onOut, { passive: true });
    return () => {
      container.removeEventListener('pointerover', onOver);
      container.removeEventListener('pointerout', onOut);
    };
  }, []);

  // Subscribe to the store and reflect filteredStatus + hoveredReactor
  // onto the annotated circles via class toggles. This runs whenever
  // store state changes.
  useEffect(() => {
    if (!svgMarkup) return;
    const container = containerRef.current;
    if (!container) return;

    const applyState = (filteredStatus: ReactorStatus | null, hoveredId: string | null) => {
      const hoveredR = hoveredId ? REACTOR_BY_ID[hoveredId] : null;
      const circles = container.querySelectorAll<SVGCircleElement>('circle[data-unit]');
      circles.forEach((c) => {
        const units = (c.getAttribute('data-unit') ?? '').split(',').map((s) => s.trim());
        const phase = c.getAttribute('data-phase');
        // data-unit identity only. The previous site-level OR fallback
        // lit up the Hinkley Point Future circle when a Hinkley Point
        // retired unit was hovered, which is the bug.
        const matchesHovered = hoveredR ? units.includes(hoveredR.id) : false;
        const matchesFilter = filteredStatus === null || phase === filteredStatus;
        // Composition:
        //   - hover overrides filter (hovered circle is focused; rest dim)
        //   - filter without hover: matching circles pop via
        //     is-filter-match (fill-opacity 1 / stroke 1); non-matching
        //     dim heavily
        //   - default: everything at print's native fill-opacity
        const isFocused = matchesHovered;
        const isFilterMatch =
          hoveredR === null && filteredStatus !== null && matchesFilter;
        const isDimmed = hoveredR
          ? !matchesHovered
          : (filteredStatus !== null && !matchesFilter);
        c.classList.toggle('is-focused', isFocused);
        c.classList.toggle('is-filter-match', isFilterMatch);
        c.classList.toggle('is-dimmed', isDimmed);
      });
    };

    const initial = poster005Store.getCurrent();
    applyState(initial.filteredStatus, initial.hoveredReactor);
    return poster005Store.subscribe((s) =>
      applyState(s.filteredStatus, s.hoveredReactor),
    );
  }, [svgMarkup]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
      <div
        ref={containerRef}
        className="poster005-map relative w-full mx-auto"
      >
        {svgMarkup && <InjectedMap markup={svgMarkup} />}
      </div>
      {/* Hover pill: between the map and the legend, surfaces name /
          status / capacity for whichever reactor is currently hovered
          on the map (or anywhere else — the same store backs the
          dendrogram and timeline). Reserves a fixed-height row so the
          legend doesn't jump up and down on hover. */}
      <MapHoverPill />
      {/* Legend sits inside the map's section so map + legend read
          as a single unit. The legend drives the global filter that
          dims non-matching circles here; placing it adjacent makes
          the cause-and-effect immediate. */}
      <div className="mt-2">
        <Poster005StatusLegend />
      </div>
    </div>
  );
}
