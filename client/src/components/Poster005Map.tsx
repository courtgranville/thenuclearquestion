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
import { REACTOR_BY_ID, type ReactorStatus } from '@/lib/poster005Data';
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
      opacity: 0.08;
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8">
      <div
        ref={containerRef}
        className="poster005-map relative w-full mx-auto"
      >
        {svgMarkup && <InjectedMap markup={svgMarkup} />}
      </div>
      {/* Legend sits inside the map's section so map + legend read
          as a single unit. The legend drives the global filter that
          dims non-matching circles here; placing it adjacent makes
          the cause-and-effect immediate. */}
      <div className="mt-6">
        <Poster005StatusLegend />
      </div>
    </div>
  );
}
