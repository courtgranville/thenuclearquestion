// ─────────────────────────────────────────────────────────────────
// Poster005Timeline.tsx — data-driven full-width reactor timeline.
//
// REBUILD: the previous implementation injected a cropped strip of
// the canonical dendrogram SVG. Court rejected that approach — it
// was effectively a screenshot, not interactive. This rewrite draws
// the timeline as a real SVG visualisation from the typed REACTORS
// manifest, with a proper time axis, decade gridlines, status
// sub-groupings, and per-bar hover interactivity.
//
// Layout (per the print's editorial structure):
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ UNDER CONSTRUCTION ─────────────────────────────────  2 bars │
//   │   ░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← Hinkley C1
//   │   ░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← Hinkley C2
//   │                                                              │
//   │ OPERATING ─────────────────────────────────────────  9 bars │
//   │   ▓▓▓▓▓▓██████████████████████████████████████████░░░░░░░░░  │  ← Heysham B1
//   │   ...                                                        │
//   │                                                              │
//   │ RETIRED ─────────────────────────────────────────── 36 bars │
//   │   ▓▓██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← Calder Hall 1
//   │   ...                                                        │
//   │                                                              │
//   │ CANCELLED ───────────────────────────────────────── 25 bars │
//   │   ▓▓▓▓▓▓▓▓░  (red dashed run, ending in cancellation dot)    │
//   │   ...                                                        │
//   │                                                              │
//   │ 1953    1960    1970    1980    1990    2000    2010    2030 │
//   └──────────────────────────────────────────────────────────────┘
//
// Bar segments per status:
//   - retired:           red construction strip (start → grid),
//                        green operating strip (grid → shutdown)
//   - operating:         red construction strip (start → grid),
//                        green operating strip (grid → 2030 horizon)
//   - underConstruction: dashed navy projection strip (start → 2030)
//   - cancelled:         red construction strip ending in a
//                        cancellation dot at the cancellation year
//
// Sort order WITHIN each status group: by year — chronological by
// first event (constructionStart for retired/operating/cancelled,
// or shutdown for visual sense within retired). This makes the
// random-looking ordering of the source print legible.
//
// Interactivity:
//   - container-delegated pointerover / pointerout on the row groups
//   - hover sets poster005Store.hoveredReactor; cross-view brushing
//     lights the same unit in the map + dendrogram
//   - tooltip floats near cursor (status-coloured left border, name,
//     status label, capacity)
//   - filter dim subscribes to filteredStatus; non-matching groups
//     and their rows drop opacity
//   - focus/dim animations use ONLY opacity and transform: scale —
//     no stroke-width changes, no r changes, no layout reflow
// ─────────────────────────────────────────────────────────────────

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  REACTORS,
  REACTOR_BY_ID,
  STATUS_COLOUR,
  STATUS_LABEL,
  type Reactor,
  type ReactorStatus,
} from '@/lib/poster005Data';
import { poster005Store } from '@/lib/poster005Store';

// ─── Layout constants ─────────────────────────────────────────────

const YEAR_MIN = 1953;
const YEAR_MAX = 2030;
const DECADES: number[] = [1953, 1960, 1970, 1980, 1990, 2000, 2010, 2020, 2030];

const ROW_H = 14;                  // vertical pitch per reactor row
const ROW_BAR_H = 5;               // bar thickness
const GROUP_TITLE_H = 30;          // height reserved for each status group header
const GROUP_GAP = 28;              // gap between status groups
const AXIS_H = 36;                 // bottom axis area
const LEFT_PAD = 8;                // padding inside the SVG before bars
const RIGHT_PAD = 8;
const TOP_PAD = 0;

// Bar geometry derived from year via this mapping (computed at render).
function yearToX(year: number, plotWidth: number): number {
  return ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * plotWidth;
}

// ─── Ordering ─────────────────────────────────────────────────────

const STATUS_ORDER: ReactorStatus[] = [
  'underConstruction',
  'operating',
  'retired',
  'cancelled',
];

// Ordering within each group. Optimised for the editorial reading
// experience: older first for retired (Calder Hall 1 leads), oldest
// in service first for operating (Heysham A leads), planned-soonest
// first for under-construction, cancelled-recent-first for cancelled.
function sortWithin(status: ReactorStatus, list: Reactor[]): Reactor[] {
  if (status === 'retired') {
    return [...list].sort((a, b) => {
      const aS = a.constructionStart ?? 9999;
      const bS = b.constructionStart ?? 9999;
      if (aS !== bS) return aS - bS;
      return a.name.localeCompare(b.name);
    });
  }
  if (status === 'operating') {
    return [...list].sort((a, b) => {
      const aC = a.commercialOperation ?? 9999;
      const bC = b.commercialOperation ?? 9999;
      if (aC !== bC) return aC - bC;
      return a.name.localeCompare(b.name);
    });
  }
  if (status === 'underConstruction') {
    return [...list].sort((a, b) => {
      const aS = a.constructionStart ?? 9999;
      const bS = b.constructionStart ?? 9999;
      if (aS !== bS) return aS - bS;
      return a.name.localeCompare(b.name);
    });
  }
  // cancelled: most-recently-cancelled first (matches print's
  // top-of-list emphasis on the new wave of cancellations)
  return [...list].sort((a, b) => {
    const aY = a.cancellationYear ?? 0;
    const bY = b.cancellationYear ?? 0;
    if (aY !== bY) return bY - aY;
    return a.name.localeCompare(b.name);
  });
}

// ─── CSS ──────────────────────────────────────────────────────────

const CSS_INJECTED_KEY = '__poster005_timeline_css_v2';

function injectStyleOnce() {
  if (typeof document === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any)[CSS_INJECTED_KEY]) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any)[CSS_INJECTED_KEY] = true;
  const style = document.createElement('style');
  // GPU-composited only: opacity for dim, transform: scale for focus.
  // Stroke and r never change on hover — that's what produced jitter
  // in the earlier implementation. transform-box: fill-box centres
  // the scale on the bar's own bounding box.
  style.textContent = `
    .poster005-timeline g.row-group {
      transform-box: fill-box;
      transform-origin: center;
      transition: transform 130ms ease-out, opacity 160ms ease-out;
      cursor: pointer;
      will-change: transform, opacity;
    }
    .poster005-timeline g.row-group.is-focused {
      transform: scale(1.06);
    }
    .poster005-timeline g.row-group.is-dimmed {
      opacity: 0.12;
    }
    .poster005-timeline .status-header.is-dimmed {
      opacity: 0.18;
    }
    .poster005-timeline rect.hit-target {
      fill: transparent;
      pointer-events: all;
    }
  `;
  document.head.appendChild(style);
}

// ─── Single row renderer ──────────────────────────────────────────

interface RowProps {
  r: Reactor;
  y: number;
  plotWidth: number;
}

const Row = memo(function Row({ r, y, plotWidth }: RowProps) {
  const colour = STATUS_COLOUR[r.status];
  const redColour = STATUS_COLOUR.cancelled;       // construction strip
  const greenColour = STATUS_COLOUR.operating;     // operating strip
  const navyColour = STATUS_COLOUR.underConstruction; // dashed projection
  const barTop = y - ROW_BAR_H / 2;

  const segments: React.ReactNode[] = [];

  if (r.status === 'retired' || r.status === 'operating') {
    const s = r.constructionStart;
    const g = r.commercialOperation;
    const e = r.status === 'retired' ? r.shutdown : YEAR_MAX;
    if (s !== null && g !== null) {
      const x0 = yearToX(s, plotWidth);
      const x1 = yearToX(g, plotWidth);
      segments.push(
        <rect
          key="construction"
          x={x0}
          y={barTop}
          width={Math.max(1, x1 - x0)}
          height={ROW_BAR_H}
          fill={redColour}
          fillOpacity={0.85}
        />,
      );
    }
    if (g !== null && e !== null) {
      const x0 = yearToX(g, plotWidth);
      const x1 = yearToX(e, plotWidth);
      segments.push(
        <rect
          key="operating"
          x={x0}
          y={barTop}
          width={Math.max(1, x1 - x0)}
          height={ROW_BAR_H}
          fill={greenColour}
          fillOpacity={r.status === 'operating' ? 1 : 0.85}
        />,
      );
    }
  } else if (r.status === 'underConstruction') {
    const s = r.constructionStart;
    if (s !== null) {
      const x0 = yearToX(s, plotWidth);
      const x1 = yearToX(YEAR_MAX, plotWidth);
      segments.push(
        <line
          key="projection"
          x1={x0}
          y1={y}
          x2={x1}
          y2={y}
          stroke={navyColour}
          strokeWidth={2}
          strokeDasharray="5,3"
        />,
      );
      // small filled square at construction start to anchor the eye
      segments.push(
        <rect
          key="anchor"
          x={x0 - 2}
          y={y - 3}
          width={4}
          height={6}
          fill={navyColour}
        />,
      );
    }
  } else if (r.status === 'cancelled') {
    // Cancellation rows are visualised as a short construction
    // strip ending in a cancellation dot. Most cancelled reactors
    // never broke ground — their constructionStart is null. Use the
    // cancellation year alone as a dot, or if there's a project-
    // start year (some had paper studies / preliminary works), draw
    // a thin red strip from start → cancellation.
    const cancelYear = r.cancellationYear;
    if (cancelYear !== null) {
      const xc = yearToX(cancelYear, plotWidth);
      const s = r.constructionStart;
      if (s !== null) {
        const x0 = yearToX(s, plotWidth);
        segments.push(
          <rect
            key="cancel-strip"
            x={x0}
            y={barTop}
            width={Math.max(1, xc - x0)}
            height={ROW_BAR_H}
            fill={redColour}
            fillOpacity={0.75}
          />,
        );
      }
      // Cancellation dot — solid red, 4px radius
      segments.push(
        <circle
          key="cancel-dot"
          cx={xc}
          cy={y}
          r={4}
          fill={redColour}
        />,
      );
    }
  }

  // Invisible hit-target spanning the full row width so thin bars
  // are still hoverable.
  const hitTarget = (
    <rect
      key="hit"
      className="hit-target"
      x={0}
      y={y - ROW_H / 2}
      width={plotWidth}
      height={ROW_H}
    />
  );

  // Tiny label at the left margin — only renders for hover focus
  // via CSS; we leave it always-rendered and let the row's hover
  // state surface the floating tooltip rather than crowding the
  // SVG with permanent text.
  void colour;

  return (
    <g className="row-group" data-unit={r.id} data-status={r.status}>
      {segments}
      {hitTarget}
    </g>
  );
});

// ─── Component ────────────────────────────────────────────────────

export default function Poster005Timeline() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState<number>(1200);
  const [tooltip, setTooltip] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => { injectStyleOnce(); }, []);

  // Measure container width once + on resize. We don't bother with
  // viewBox auto-fit because the geometry is laid out in CSS-pixel
  // space and the y-axis grows with reactor count.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setWidth(Math.round(r.width));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Group reactors by status; sort within each group; compute y for each.
  const layout = useMemo(() => {
    const plotWidth = Math.max(0, width - LEFT_PAD - RIGHT_PAD);
    const groups: {
      status: ReactorStatus;
      yStart: number;     // y of the group's header text
      yFirstRow: number;  // y of the first reactor's centreline
      reactors: Reactor[];
    }[] = [];

    let yCursor = TOP_PAD;
    for (const status of STATUS_ORDER) {
      const list = sortWithin(status, REACTORS.filter((r) => r.status === status));
      const yStart = yCursor;
      const yFirstRow = yStart + GROUP_TITLE_H + ROW_H / 2;
      groups.push({ status, yStart, yFirstRow, reactors: list });
      yCursor = yStart + GROUP_TITLE_H + list.length * ROW_H + GROUP_GAP;
    }

    const totalH = yCursor - GROUP_GAP + AXIS_H;
    return { plotWidth, groups, totalH };
  }, [width]);

  // Hover wiring — container-delegated pointer events.
  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const findRow = (el: Element | null): SVGGElement | null => {
      let cur: Element | null = el;
      while (cur && cur !== svg) {
        if (cur instanceof SVGGElement && cur.classList.contains('row-group')) {
          return cur;
        }
        cur = cur.parentElement;
      }
      return null;
    };

    const onOver = (e: PointerEvent) => {
      const g = findRow(e.target as Element);
      if (!g) return;
      const id = g.getAttribute('data-unit');
      if (!id) return;
      poster005Store.setHoveredReactor(id);
      const rect = container.getBoundingClientRect();
      setTooltip({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const onMove = (e: PointerEvent) => {
      const g = findRow(e.target as Element);
      if (!g) return;
      const rect = container.getBoundingClientRect();
      setTooltip((prev) =>
        prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : prev,
      );
    };
    const onOut = (e: PointerEvent) => {
      const g = findRow(e.target as Element);
      if (!g) return;
      const next = findRow(e.relatedTarget as Element);
      if (next && next !== g) return;
      poster005Store.setHoveredReactor(null);
      setTooltip(null);
    };

    svg.addEventListener('pointerover', onOver as EventListener, { passive: true });
    svg.addEventListener('pointermove', onMove as EventListener, { passive: true });
    svg.addEventListener('pointerout', onOut as EventListener, { passive: true });
    return () => {
      svg.removeEventListener('pointerover', onOver as EventListener);
      svg.removeEventListener('pointermove', onMove as EventListener);
      svg.removeEventListener('pointerout', onOut as EventListener);
    };
  }, []);

  // Store subscription — apply is-focused / is-dimmed classes.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const apply = (filteredStatus: ReactorStatus | null, hoveredId: string | null) => {
      const hoveredR = hoveredId ? REACTOR_BY_ID[hoveredId] : null;
      const rows = svg.querySelectorAll<SVGGElement>('g.row-group');
      rows.forEach((g) => {
        const id = g.getAttribute('data-unit') ?? '';
        const status = g.getAttribute('data-status') as ReactorStatus | null;
        const matchesHover = hoveredR ? hoveredR.id === id : false;
        const matchesFilter = filteredStatus === null || status === filteredStatus;
        const isFocused = matchesHover;
        const isDimmed = hoveredR
          ? !matchesHover
          : (filteredStatus !== null && !matchesFilter);
        g.classList.toggle('is-focused', isFocused);
        g.classList.toggle('is-dimmed', isDimmed);
      });

      const headers = svg.querySelectorAll<SVGGElement>('g.status-header');
      headers.forEach((h) => {
        const status = h.getAttribute('data-status') as ReactorStatus | null;
        const isDimmed = filteredStatus !== null && status !== filteredStatus;
        h.classList.toggle('is-dimmed', isDimmed);
      });
    };

    const initial = poster005Store.getCurrent();
    apply(initial.filteredStatus, initial.hoveredReactor);
    return poster005Store.subscribe((s) => apply(s.filteredStatus, s.hoveredReactor));
  }, [layout.totalH]);

  const tooltipReactor = tooltip ? REACTOR_BY_ID[tooltip.id] : null;
  const plotWidth = layout.plotWidth;
  const totalH = layout.totalH;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8">
      <div
        ref={containerRef}
        className="poster005-timeline relative w-full"
        style={{ minHeight: 200 }}
      >
        {width > 0 && (
          <svg
            ref={svgRef}
            width={width}
            height={totalH}
            viewBox={`0 0 ${width} ${totalH}`}
            preserveAspectRatio="xMinYMin meet"
            style={{ display: 'block' }}
          >
            {/* Gridlines: faint verticals at each decade */}
            <g aria-hidden>
              {DECADES.map((y) => {
                const x = LEFT_PAD + yearToX(y, plotWidth);
                return (
                  <line
                    key={y}
                    x1={x}
                    y1={TOP_PAD}
                    x2={x}
                    y2={totalH - AXIS_H + 4}
                    stroke="#0d1a1e"
                    strokeOpacity={0.08}
                    strokeWidth={1}
                  />
                );
              })}
            </g>

            {/* Status groups */}
            {layout.groups.map(({ status, yStart, yFirstRow, reactors }) => {
              const colour = STATUS_COLOUR[status];
              return (
                <g key={status} transform={`translate(${LEFT_PAD},0)`}>
                  {/* Status header — eyebrow label + count + capacity */}
                  <g
                    className="status-header"
                    data-status={status}
                    transform={`translate(0,${yStart + 14})`}
                  >
                    <circle cx={5} cy={0} r={4} fill={colour} />
                    <text
                      x={16}
                      y={4}
                      fontSize={12}
                      letterSpacing={1.5}
                      style={{
                        fontFamily: "'Playfair', Georgia, serif",
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                      fill={colour}
                    >
                      {STATUS_LABEL[status]}
                    </text>
                    <text
                      x={16 + STATUS_LABEL[status].length * 7 + 12}
                      y={4}
                      fontSize={11}
                      style={{
                        fontFamily: "'Playfair', Georgia, serif",
                        fontStyle: 'italic',
                      }}
                      fill="rgba(13,26,30,0.55)"
                    >
                      {reactors.length} {reactors.length === 1 ? 'reactor' : 'reactors'}
                    </text>
                    {/* Thin rule under the header for editorial separation */}
                    <line
                      x1={0}
                      y1={14}
                      x2={plotWidth}
                      y2={14}
                      stroke={colour}
                      strokeOpacity={0.25}
                      strokeWidth={0.75}
                    />
                  </g>

                  {/* Row group */}
                  {reactors.map((r, i) => (
                    <Row
                      key={r.id}
                      r={r}
                      y={yFirstRow + i * ROW_H}
                      plotWidth={plotWidth}
                    />
                  ))}
                </g>
              );
            })}

            {/* Bottom axis: decade ticks + labels */}
            <g transform={`translate(${LEFT_PAD},${totalH - AXIS_H + 8})`}>
              <line
                x1={0}
                y1={0}
                x2={plotWidth}
                y2={0}
                stroke="#0d1a1e"
                strokeOpacity={0.4}
                strokeWidth={1}
              />
              {DECADES.map((y) => {
                const x = yearToX(y, plotWidth);
                return (
                  <g key={y} transform={`translate(${x},0)`}>
                    <line
                      x1={0}
                      y1={0}
                      x2={0}
                      y2={5}
                      stroke="#0d1a1e"
                      strokeOpacity={0.6}
                      strokeWidth={1}
                    />
                    <text
                      x={0}
                      y={20}
                      fontSize={13}
                      textAnchor="middle"
                      style={{
                        fontFamily: "'Playfair', Georgia, serif",
                        fontWeight: 500,
                      }}
                      fill="rgba(13,26,30,0.78)"
                    >
                      {y}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Floating tooltip */}
        {tooltip && tooltipReactor && (
          <div
            className="absolute z-20 pointer-events-none p-3 rounded-sm border bg-card shadow-md"
            style={{
              borderColor: 'rgba(13,26,30,0.18)',
              borderLeftColor: STATUS_COLOUR[tooltipReactor.status],
              borderLeftWidth: 3,
              left:
                tooltip.x > (containerRef.current?.clientWidth ?? 0) - 220
                  ? tooltip.x - 200
                  : tooltip.x + 16,
              top: tooltip.y + 12,
              minWidth: 180,
              maxWidth: 220,
            }}
          >
            <p
              className="font-serif text-sm leading-tight"
              style={{ color: STATUS_COLOUR[tooltipReactor.status], fontWeight: 600 }}
            >
              {tooltipReactor.name}
            </p>
            <p
              className="text-xs uppercase tracking-[0.1em] text-muted-foreground mt-0.5"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              {STATUS_LABEL[tooltipReactor.status]}
            </p>
            <p
              className="text-xs text-foreground mt-1 tabular-nums"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              {tooltipReactor.capacityMw
                ? `${tooltipReactor.capacityMw.toLocaleString()} MW`
                : '— MW'}
              {tooltipReactor.status === 'retired' &&
                tooltipReactor.commercialOperation &&
                tooltipReactor.shutdown
                ? ` · ${tooltipReactor.commercialOperation}–${tooltipReactor.shutdown}`
                : null}
              {tooltipReactor.status === 'operating' && tooltipReactor.commercialOperation
                ? ` · since ${tooltipReactor.commercialOperation}`
                : null}
              {tooltipReactor.status === 'cancelled' && tooltipReactor.cancellationYear
                ? ` · cancelled ${tooltipReactor.cancellationYear}`
                : null}
              {tooltipReactor.status === 'underConstruction' && tooltipReactor.commercialOperation
                ? ` · target ${tooltipReactor.commercialOperation}`
                : null}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
