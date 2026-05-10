// ─────────────────────────────────────────────────────────────────
// Poster005Timeline.tsx — full-width reactor timeline 1953–2030.
//
// Renders as a fresh inline SVG drawn from the typed manifest. Each
// reactor is a vertical column at its print-canonical timelineColumnX.
// The y-axis runs from 1953 (top) to 2030 (bottom) with horizontal
// gridlines every decade (1960, 1970, ... , 2030 — matching the
// print).
//
// Bar style by status (per brief):
//   - retired:           solid red→green segment (construction→operating)
//                        with end-caps. Red top = constructionStart;
//                        red→green transition = commercialOperation;
//                        green bottom = shutdown.
//   - operating:         same shape, green bottom anchored to 2030
//                        (the chart's planning horizon).
//   - underConstruction: dashed navy line constructionStart→2030.
//   - cancelled:         single dot at cancellationYear (no bar).
//
// Each reactor's geometry is wrapped in a <g data-unit data-phase>
// so the cross-view hover + filter dim machinery reads it the same
// way as Poster005Map and Poster005Dendrogram.
//
// MOBILE FLAG (per brief):
//   The brief asks me to flag the mobile layout decision before
//   shipping. v1 ships the desktop layout with horizontal overflow-
//   scroll on narrow viewports — bars don't compress, so on a
//   320 px phone the timeline becomes a swipeable strip. The
//   alternatives (90° rotation; expand-on-tap reveal) are bigger
//   structural calls; recommend deciding after seeing v1 in Chrome
//   responsive mode.
// ─────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import {
  REACTORS,
  REACTOR_BY_ID,
  STATUS_COLOUR,
  type Reactor,
  type ReactorStatus,
} from '@/lib/poster005Data';
import { poster005Store } from '@/lib/poster005Store';

// Reactor column x-coords come from the manifest. Compute the chart's
// x-extent + per-year y-mapping in module scope so they're stable
// across re-renders.
const X_MIN = Math.min(...REACTORS.map((r) => r.timelineColumnX)) - 30;
const X_MAX = Math.max(...REACTORS.map((r) => r.timelineColumnX)) + 30;
const X_SPAN = X_MAX - X_MIN;
const YEAR_MIN = 1953;
const YEAR_MAX = 2030;
const Y_TOP = 30;       // SVG units of padding at top for label spacing
const Y_BOTTOM_PAD = 30;
const Y_TIMELINE_HEIGHT = 600; // chart's plot area height in SVG units
const Y_TOTAL = Y_TOP + Y_TIMELINE_HEIGHT + Y_BOTTOM_PAD;

function yAtYear(year: number): number {
  const t = (year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN);
  return Y_TOP + t * Y_TIMELINE_HEIGHT;
}

const DECADE_LABELS = [1960, 1970, 1980, 1990, 2000, 2010, 2020, 2030];

const CSS_INJECTED_KEY = '__poster005_timeline_css';

function injectStyleOnce() {
  if (typeof document === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any)[CSS_INJECTED_KEY]) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any)[CSS_INJECTED_KEY] = true;
  const style = document.createElement('style');
  style.textContent = `
    .poster005-timeline g[data-unit] {
      transition: opacity 150ms ease-out;
      cursor: pointer;
    }
    .poster005-timeline g[data-unit] .timeline-bar {
      transition: stroke-width 150ms ease-out;
    }
    .poster005-timeline g[data-unit].is-focused .timeline-bar {
      stroke-width: 2.5;
    }
    .poster005-timeline g[data-unit].is-focused circle.timeline-dot {
      r: 6;
    }
    .poster005-timeline g[data-unit].is-dimmed {
      opacity: 0.1;
    }
  `;
  document.head.appendChild(style);
}

// Render one reactor's bar/dot geometry.
function renderReactorBar(r: Reactor) {
  const x = r.timelineColumnX;
  const colour = STATUS_COLOUR[r.status];

  if (r.status === 'cancelled') {
    // Single dot at cancellationYear (fall back to constructionStart
    // if cancellation is null, but our manifest always has it for
    // cancelled rows).
    const year = r.cancellationYear ?? r.constructionStart ?? YEAR_MAX;
    const cy = yAtYear(year);
    return (
      <circle
        className="timeline-dot"
        cx={x}
        cy={cy}
        r={3.5}
        fill={colour}
        fillOpacity={0.7}
        stroke={colour}
        strokeWidth={0.5}
      />
    );
  }

  if (r.status === 'underConstruction') {
    const y0 = r.constructionStart !== null ? yAtYear(r.constructionStart) : yAtYear(YEAR_MAX);
    const y1 = r.commercialOperation !== null ? yAtYear(r.commercialOperation) : yAtYear(YEAR_MAX);
    return (
      <>
        <line
          className="timeline-bar"
          x1={x} x2={x}
          y1={y0} y2={y1}
          stroke={colour}
          strokeWidth={1.2}
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
        <line x1={x - 4} x2={x + 4} y1={y0} y2={y0} stroke={colour} strokeWidth={1} strokeLinecap="round" />
      </>
    );
  }

  // retired / operating: red segment (construction→COD), green segment
  // (COD→shutdown or 2030).
  const yc = r.constructionStart !== null ? yAtYear(r.constructionStart) : yAtYear(YEAR_MIN);
  const yg = r.commercialOperation !== null ? yAtYear(r.commercialOperation) : yc;
  const ys = r.shutdown !== null ? yAtYear(r.shutdown) : yAtYear(YEAR_MAX);
  const redColour = '#a51e23'; // matches the print's construction-bar red
  const greenColour = '#237c3e'; // print's operating green
  return (
    <>
      <line
        className="timeline-bar"
        x1={x} x2={x}
        y1={yc} y2={yg}
        stroke={redColour}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <line
        className="timeline-bar"
        x1={x} x2={x}
        y1={yg} y2={ys}
        stroke={greenColour}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      {/* End-caps */}
      <line x1={x - 4} x2={x + 4} y1={yc} y2={yc} stroke={redColour} strokeWidth={1} strokeLinecap="round" />
      <line x1={x - 4} x2={x + 4} y1={ys} y2={ys} stroke={greenColour} strokeWidth={1} strokeLinecap="round" />
    </>
  );
}

export default function Poster005Timeline() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { injectStyleOnce(); }, []);

  // Hover + filter dim subscription. Walks every g[data-unit] and
  // applies focus/dim classes per the composition rule (hover
  // overrides filter; site-level brushing as on the other views).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const apply = (filteredStatus: ReactorStatus | null, hoveredId: string | null) => {
      const hoveredR = hoveredId ? REACTOR_BY_ID[hoveredId] : null;
      const groups = container.querySelectorAll<SVGGElement>('g[data-unit]');
      groups.forEach((g) => {
        const id = g.getAttribute('data-unit') ?? '';
        const r = REACTOR_BY_ID[id];
        if (!r) return;
        // Per-unit identity only. See Poster005Map for the bug
        // this replaces.
        const matchesHover = hoveredR ? r.id === hoveredR.id : false;
        const matchesFilter = filteredStatus === null || r.status === filteredStatus;
        const isFocused = !!matchesHover;
        const isDimmed = hoveredR ? !matchesHover : (filteredStatus !== null && !matchesFilter);
        g.classList.toggle('is-focused', isFocused);
        g.classList.toggle('is-dimmed', isDimmed);
      });
    };

    const initial = poster005Store.getCurrent();
    apply(initial.filteredStatus, initial.hoveredReactor);
    return poster005Store.subscribe((s) => apply(s.filteredStatus, s.hoveredReactor));
  }, []);

  // Container-delegated hover.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const findUnit = (el: Element | null): SVGGElement | null => {
      let cur: Element | null = el;
      while (cur && cur !== container) {
        if (cur instanceof SVGGElement && cur.getAttribute('data-unit')) return cur;
        cur = cur.parentElement;
      }
      return null;
    };
    const onOver = (e: PointerEvent) => {
      const g = findUnit(e.target as Element);
      if (!g) return;
      const id = g.getAttribute('data-unit');
      if (id) poster005Store.setHoveredReactor(id);
    };
    const onOut = (e: PointerEvent) => {
      const g = findUnit(e.target as Element);
      if (!g) return;
      const next = findUnit(e.relatedTarget as Element);
      if (next && next !== g) return;
      poster005Store.setHoveredReactor(null);
    };
    container.addEventListener('pointerover', onOver, { passive: true });
    container.addEventListener('pointerout', onOut, { passive: true });
    return () => {
      container.removeEventListener('pointerover', onOver);
      container.removeEventListener('pointerout', onOut);
    };
  }, []);

  const viewBox = `${X_MIN} 0 ${X_SPAN} ${Y_TOTAL}`;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8">
      <div
        ref={containerRef}
        className="poster005-timeline w-full overflow-x-auto"
        style={{ minHeight: 360 }}
      >
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            minWidth: 800,
            maxHeight: '60vh',
          }}
          aria-label="Reactor timeline 1953 to 2030"
        >
          {/* Decade gridlines + year labels */}
          {DECADE_LABELS.map((yr) => {
            const y = yAtYear(yr);
            return (
              <g key={yr}>
                <line
                  x1={X_MIN}
                  x2={X_MAX}
                  y1={y}
                  y2={y}
                  stroke="#7d746a"
                  strokeOpacity={0.25}
                  strokeWidth={0.4}
                />
                <text
                  x={X_MIN + 8}
                  y={y - 3}
                  fontSize="9"
                  fill="#0d1a1e"
                  opacity={0.55}
                  style={{ fontFamily: "'Playfair', Georgia, serif" }}
                >
                  {yr}
                </text>
                <text
                  x={X_MAX - 8}
                  y={y - 3}
                  fontSize="9"
                  fill="#0d1a1e"
                  opacity={0.55}
                  textAnchor="end"
                  style={{ fontFamily: "'Playfair', Georgia, serif" }}
                >
                  {yr}
                </text>
              </g>
            );
          })}

          {/* Per-reactor bars */}
          {REACTORS.map((r) => (
            <g key={r.id} data-unit={r.id} data-phase={r.status}>
              {renderReactorBar(r)}
              {/* Generous invisible hit-target for thin bars */}
              <rect
                x={r.timelineColumnX - 8}
                y={Y_TOP}
                width={16}
                height={Y_TIMELINE_HEIGHT}
                fill="transparent"
                pointerEvents="all"
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
