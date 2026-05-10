// ─────────────────────────────────────────────────────────────────
// Poster005Dendrogram.tsx — status dendrogram with cross-view brushing.
//
// SHIPPING IN COMMIT 6 (v1):
//   - Injects the canonical dendrogram-clean SVG, which already
//     contains hubs (256 polylines per status as filled organic
//     forms), connector Béziers (98 paths fanning hub→leaf), 72 leaf
//     circles pre-sized by capacity (radii 4..24 SVG-units), and the
//     full timeline with phase-coloured bars below the leaves.
//   - Memoised InjectedDendrogram wrapper so parent re-renders don't
//     tear down the SVG.
//   - One-pass post-injection: walks every loose leaf circle at
//     y≈800.993, matches by cx ↔ Reactor.timelineColumnX, stamps
//     data-unit + data-phase attributes for cross-view linkage.
//   - CSS classes drive hover focus (.is-focused = scale 1.25,
//     .is-dimmed = opacity 0.1) on the annotated leaves.
//   - Store subscription wires the global filteredStatus +
//     hoveredReactor into the leaves' classes, mirroring the rule
//     used by Poster005Map: hover overrides filter.
//
// DEFERRED FOLLOW-UP (commit 6 v2 / a later commit):
//   - Canvas overlay rendering the four status hub forms with
//     poster-004's form-motion pipeline (buildPolylines /
//     resolveMotion / depthWeight / alpha-bucketed batch-stroking /
//     silhouette occlusion). Imports the pulse rendering primitives
//     from lib/poster004Engine.ts (PULSE_* constants + renderer —
//     refactor extraction noted in the brief).
//   - Hub physical-pulse on pointerenter (NucleusHero cursor-impulse
//     mechanic via posterMotion TUNING).
//   - Pulse-tip traversal along connector Bézier paths (hub→leaf),
//     absorbing into the leaf circles. Uses
//     poster004Engine.startCarrierFocus's pulse infrastructure
//     adapted to "carriers = statuses" without duplicating logic.
//
//   The v1 shipped here is editorially complete (the dendrogram is
//   visible, filter dim works, hover lights up the matching leaf
//   across all three views). The animation layer is an upgrade
//   rather than a blocker for visual review.
// ─────────────────────────────────────────────────────────────────

import { memo, useEffect, useRef, useState } from 'react';
import {
  REACTORS,
  REACTOR_BY_ID,
  STATUS_COLOUR,
  type ReactorStatus,
} from '@/lib/poster005Data';
import { poster005Store } from '@/lib/poster005Store';

const DENDRO_URL = '/assets/005-dendrogram-clean_336edeac.svg';

const CSS_INJECTED_KEY = '__poster005_dendro_css';

function injectStyleOnce() {
  if (typeof document === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any)[CSS_INJECTED_KEY]) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any)[CSS_INJECTED_KEY] = true;
  const style = document.createElement('style');
  style.textContent = `
    .poster005-dendro circle[data-unit] {
      transform-box: fill-box;
      transform-origin: center;
      transition: transform 120ms ease-out, opacity 150ms ease-out;
      cursor: pointer;
      will-change: transform, opacity;
    }
    .poster005-dendro circle[data-unit].is-focused {
      transform: scale(1.25);
    }
    .poster005-dendro circle[data-unit].is-dimmed {
      opacity: 0.1;
    }
    /* Timeline bars + cancellation dots in row-* groups also dim. */
    .poster005-dendro g[id^="row-"] {
      transition: opacity 150ms ease-out;
    }
    .poster005-dendro g[id^="row-"].is-dimmed {
      opacity: 0.1;
    }
  `;
  document.head.appendChild(style);
}

const InjectedDendro = memo(function InjectedDendro({ markup }: { markup: string }) {
  return <div className="w-full" dangerouslySetInnerHTML={{ __html: markup }} />;
});

// Build a lookup of timeline_column_x → reactor for fast cx-based
// leaf matching. Tolerance of 1.5 px handles Illustrator float drift.
function buildLeafMatcher() {
  const sorted = [...REACTORS].sort((a, b) => a.timelineColumnX - b.timelineColumnX);
  return (cx: number) => {
    let best: typeof REACTORS[0] | null = null;
    let bestDist = Infinity;
    for (const r of sorted) {
      const d = Math.abs(r.timelineColumnX - cx);
      if (d < bestDist) {
        bestDist = d;
        best = r;
      }
      if (r.timelineColumnX > cx + 5) break;
    }
    if (best && bestDist <= 2) return best;
    return null;
  };
}

// Phase string used in row-NN data-phase + the eventual data-phase
// stamp on leaf circles.
function statusFromPhaseAttr(phase: string | null): ReactorStatus | null {
  if (!phase) return null;
  if (phase === 'construction') return 'underConstruction';
  if (phase === 'operating') return 'operating';
  if (phase === 'retired') return 'retired';
  if (phase.startsWith('cancelled')) return 'cancelled';
  return null;
}

export default function Poster005Dendrogram() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  useEffect(() => { injectStyleOnce(); }, []);

  // Fetch the source SVG once.
  useEffect(() => {
    let cancelled = false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', DENDRO_URL, true);
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
          // Crop the source viewBox to the dendrogram region only.
          // y-bounds inside the source:
          //   status labels (outlined paths):  y ≈ 313..324
          //   hubs (256 polylines per status): y =  344..467
          //   connectors (Bézier paths):       y =  422..594
          //   leaf circles (loose):            y =  800.993 ± r
          //   timeline bars + gridlines:       y =  835..993  ← excluded
          // Starting at y=305 leaves a sliver of headroom above the
          // labels so descenders aren't clipped at full-width scale.
          svg.setAttribute('viewBox', '0 305 1694.98 520');
        }
        setSvgMarkup(new XMLSerializer().serializeToString(svg ?? doc.documentElement));
      }
    };
    xhr.send();
    return () => { cancelled = true; };
  }, []);

  // Post-injection: stamp data-unit / data-phase on every leaf circle.
  // Leaves are loose circles at y≈800.993 (constant across all 72;
  // print baseline). cx matches Reactor.timelineColumnX.
  useEffect(() => {
    if (!svgMarkup) return;
    const container = containerRef.current;
    if (!container) return;
    const matcher = buildLeafMatcher();

    const allCircles = container.querySelectorAll<SVGCircleElement>('svg circle');
    let stamped = 0;
    allCircles.forEach((c) => {
      const cy = parseFloat(c.getAttribute('cy') ?? '0');
      // Leaf y is 800.993 in source; tolerance for float drift.
      if (Math.abs(cy - 800.993) > 0.5) return;
      // Don't stamp if it's inside a row-* group (cancelled rows have
      // their own data-unit-bearing parent group).
      if (c.closest('g[id^="row-"]')) return;
      const cx = parseFloat(c.getAttribute('cx') ?? '0');
      const reactor = matcher(cx);
      if (!reactor) return;
      c.setAttribute('data-unit', reactor.id);
      c.setAttribute('data-phase', reactor.status);
      stamped++;
    });
    if (import.meta.env.DEV) {
      console.debug(`[Poster005Dendrogram] stamped ${stamped} leaf circles`);
    }
  }, [svgMarkup]);

  // Container-delegated hover handlers.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const findTarget = (el: Element | null): SVGElement | null => {
      let cur: Element | null = el;
      while (cur && cur !== container) {
        // Leaf circle with data-unit, OR a row-* group (its inner
        // circle / lines).
        if (cur instanceof SVGCircleElement && cur.getAttribute('data-unit')) return cur;
        if (cur instanceof SVGGElement && /^row-\d+$/.test(cur.id ?? '')) return cur;
        cur = cur.parentElement;
      }
      return null;
    };

    const idFromTarget = (el: SVGElement | null): string | null => {
      if (!el) return null;
      if (el instanceof SVGCircleElement) return el.getAttribute('data-unit');
      if (el instanceof SVGGElement) {
        // Look up by row id → REACTORS[].rowId
        const rowId = el.id;
        const r = REACTORS.find((x) => x.rowId === rowId);
        return r?.id ?? null;
      }
      return null;
    };

    const onOver = (e: PointerEvent) => {
      const t = findTarget(e.target as Element);
      const id = idFromTarget(t);
      if (id) poster005Store.setHoveredReactor(id);
    };
    const onOut = (e: PointerEvent) => {
      const t = findTarget(e.target as Element);
      if (!t) return;
      const next = findTarget(e.relatedTarget as Element);
      if (next && next !== t) return;
      poster005Store.setHoveredReactor(null);
    };

    container.addEventListener('pointerover', onOver, { passive: true });
    container.addEventListener('pointerout', onOut, { passive: true });
    return () => {
      container.removeEventListener('pointerover', onOver);
      container.removeEventListener('pointerout', onOut);
    };
  }, []);

  // Store subscription → apply dim / focus classes.
  useEffect(() => {
    if (!svgMarkup) return;
    const container = containerRef.current;
    if (!container) return;

    const apply = (filteredStatus: ReactorStatus | null, hoveredId: string | null) => {
      const hoveredR = hoveredId ? REACTOR_BY_ID[hoveredId] : null;

      const leaves = container.querySelectorAll<SVGCircleElement>('circle[data-unit]');
      leaves.forEach((c) => {
        const unitId = c.getAttribute('data-unit') ?? '';
        const r = REACTOR_BY_ID[unitId];
        if (!r) return;
        // Per-unit identity only (no site-level fallback). Cross-view
        // brushing across map / dendrogram / timeline runs on the
        // exact data-unit string.
        const matchesHover = hoveredR ? r.id === hoveredR.id : false;
        const matchesFilter = filteredStatus === null || r.status === filteredStatus;
        const isFocused = matchesHover;
        const isDimmed = hoveredR ? !matchesHover : (filteredStatus !== null && !matchesFilter);
        c.classList.toggle('is-focused', isFocused);
        c.classList.toggle('is-dimmed', isDimmed);
      });

      // Row groups (timeline bars + cancellation markers): same dim
      // rule but no focus state (timeline bars aren't focusable).
      const rows = container.querySelectorAll<SVGGElement>('g[id^="row-"]');
      rows.forEach((g) => {
        const rowId = g.id;
        const r = REACTORS.find((x) => x.rowId === rowId);
        if (!r) return;
        const matchesHover = hoveredR ? r.id === hoveredR.id : false;
        const matchesFilter = filteredStatus === null || r.status === filteredStatus;
        const isDimmed = hoveredR ? !matchesHover : (filteredStatus !== null && !matchesFilter);
        g.classList.toggle('is-dimmed', isDimmed);
      });
    };

    const initial = poster005Store.getCurrent();
    apply(initial.filteredStatus, initial.hoveredReactor);
    return poster005Store.subscribe((s) => apply(s.filteredStatus, s.hoveredReactor));
  }, [svgMarkup]);

  // Note status colours for any consumers of the legend tokens.
  void STATUS_COLOUR;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8">
      <div ref={containerRef} className="poster005-dendro relative w-full mx-auto">
        {svgMarkup && <InjectedDendro markup={svgMarkup} />}
      </div>
    </div>
  );
}
