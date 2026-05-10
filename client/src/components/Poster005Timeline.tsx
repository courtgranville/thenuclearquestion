// ─────────────────────────────────────────────────────────────────
// Poster005Timeline.tsx — vertical full-screen reactor timeline.
//
// REORIENTATION: Court asked for the data-driven functionality I
// built in the previous round, but transposed so years travel
// top→bottom and the chart fills the full desktop screen.
//
// Layout (transposed from the prior horizontal version):
//
//   ┌─────────────────────────────────────────────────────────────┐
//   │ ◯ Under Construction (2) │ ◯ Operating (9) │ ◯ Retired (36) │ ◯ Cancelled (25) │
//   │  ─────────────────────────────────────────────────────────  │
//   │ 1953 ┤ █  █  █  █  ...  █  █  █  █  █  █  █  █  █  █  █  █  │
//   │      │ ░  ░  █  █       █  █  █  █  █  █  █  █  █  █  █  █  │
//   │ 1960 ┤ ░  ░  █  █       █  █  █  █  █  █  █  █  █  █  █  █  │
//   │      │ ░  ░  ░  ░       ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  │
//   │ 1970 ┤              ╳   ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  ░  │
//   │      │                                                      │
//   │ ...  ┤                                                      │
//   │ 2030 ┤   █  █  █                                             │
//   └─────────────────────────────────────────────────────────────┘
//
// One column per reactor, ordered: under-construction → operating →
// retired → cancelled (matches the print's editorial order).
//
// Within each status block, columns are sorted by the same chronology
// as the horizontal version (constructionStart for retired/under-
// construction, commercialOperation for operating, cancellationYear
// desc for cancelled).
//
// Per-column segments are drawn TOP→BOTTOM as the year increases:
//   - retired:           red strip (start→grid), green strip (grid→shutdown)
//   - operating:         red strip (start→grid), green strip (grid→2030)
//   - underConstruction: anchor square at start, dashed navy line to 2030
//   - cancelled:         red strip (start→cancel year), red dot at cancel year
//
// Year axis on the left edge (1953 at top, 2030 at bottom), decade
// labels at 1953/1960/1970/.../2030 with full-width faint gridlines.
//
// Status group headers run across the top, positioned over their
// column range with a status-coloured underline.
//
// Hover / filter wiring identical to the previous version:
//   - container-delegated pointerover / pointerout on column groups
//   - hover sets poster005Store.hoveredReactor; cross-view brushing
//     into map + dendrogram works automatically
//   - tooltip floats near cursor (status-coloured left border)
//   - filter dim subscribes to filteredStatus
//   - animations: opacity + transform: scale only (GPU-composited,
//     no layout reflow, no jitter)
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

const AXIS_W = 60;           // left axis area (year labels)
const HEADER_H = 64;          // top headers (status group labels)
const COL_W = 18;             // per-reactor column width
const BAR_W = 6;              // visible bar width within the column
const GROUP_GAP = 18;         // gap between status groups
const TOP_PAD = 12;           // padding inside the plot above the first tick
const BOTTOM_PAD = 18;        // padding below the last tick
const RIGHT_PAD = 18;

const STATUS_ORDER: ReactorStatus[] = [
  'underConstruction',
  'operating',
  'retired',
  'cancelled',
];

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
  return [...list].sort((a, b) => {
    const aY = a.cancellationYear ?? 0;
    const bY = b.cancellationYear ?? 0;
    if (aY !== bY) return bY - aY;
    return a.name.localeCompare(b.name);
  });
}

// ─── CSS ──────────────────────────────────────────────────────────

const CSS_INJECTED_KEY = '__poster005_timeline_css_v3';

function injectStyleOnce() {
  if (typeof document === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any)[CSS_INJECTED_KEY]) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any)[CSS_INJECTED_KEY] = true;
  const style = document.createElement('style');
  style.textContent = `
    .poster005-timeline g.col-group {
      transform-box: fill-box;
      transform-origin: center;
      transition: transform 130ms ease-out, opacity 160ms ease-out;
      cursor: pointer;
      will-change: transform, opacity;
    }
    .poster005-timeline g.col-group.is-focused {
      transform: scale(1.18);
    }
    .poster005-timeline g.col-group.is-dimmed {
      opacity: 0.06;
    }
    .poster005-timeline g.status-header.is-dimmed {
      opacity: 0.18;
    }
    .poster005-timeline rect.hit-target {
      fill: transparent;
      pointer-events: all;
    }
  `;
  document.head.appendChild(style);
}

// ─── Single column renderer ──────────────────────────────────────

interface ColumnProps {
  r: Reactor;
  x: number;                    // x of the column centreline
  plotTop: number;              // y of the first tick (YEAR_MIN)
  plotBottom: number;           // y of the last tick (YEAR_MAX)
  yearToY: (year: number) => number;
}

const Column = memo(function Column({ r, x, plotTop, plotBottom, yearToY }: ColumnProps) {
  const redColour = STATUS_COLOUR.cancelled;       // construction strip
  const greenColour = STATUS_COLOUR.operating;     // operating strip
  const navyColour = STATUS_COLOUR.underConstruction;
  const barLeft = x - BAR_W / 2;

  const segments: React.ReactNode[] = [];

  if (r.status === 'retired' || r.status === 'operating') {
    const s = r.constructionStart;
    const g = r.commercialOperation;
    const e = r.status === 'retired' ? r.shutdown : YEAR_MAX;
    if (s !== null && g !== null) {
      const y0 = yearToY(s);
      const y1 = yearToY(g);
      segments.push(
        <rect
          key="construction"
          x={barLeft}
          y={y0}
          width={BAR_W}
          height={Math.max(1, y1 - y0)}
          fill={redColour}
          fillOpacity={0.85}
        />,
      );
    }
    if (g !== null && e !== null) {
      const y0 = yearToY(g);
      const y1 = yearToY(e);
      segments.push(
        <rect
          key="operating"
          x={barLeft}
          y={y0}
          width={BAR_W}
          height={Math.max(1, y1 - y0)}
          fill={greenColour}
          fillOpacity={r.status === 'operating' ? 1 : 0.85}
        />,
      );
    }
  } else if (r.status === 'underConstruction') {
    const s = r.constructionStart;
    if (s !== null) {
      const y0 = yearToY(s);
      const y1 = yearToY(YEAR_MAX);
      segments.push(
        <line
          key="projection"
          x1={x}
          y1={y0}
          x2={x}
          y2={y1}
          stroke={navyColour}
          strokeWidth={2.5}
          strokeDasharray="5,3"
        />,
      );
      segments.push(
        <rect
          key="anchor"
          x={barLeft}
          y={y0 - 3}
          width={BAR_W}
          height={6}
          fill={navyColour}
        />,
      );
    }
  } else if (r.status === 'cancelled') {
    const cancelYear = r.cancellationYear;
    if (cancelYear !== null) {
      const yc = yearToY(cancelYear);
      const s = r.constructionStart;
      if (s !== null) {
        const y0 = yearToY(s);
        segments.push(
          <rect
            key="cancel-strip"
            x={barLeft}
            y={y0}
            width={BAR_W}
            height={Math.max(1, yc - y0)}
            fill={redColour}
            fillOpacity={0.75}
          />,
        );
      }
      segments.push(
        <circle
          key="cancel-dot"
          cx={x}
          cy={yc}
          r={4}
          fill={redColour}
        />,
      );
    }
  }

  // Invisible hit-target spanning the full column height so the bar
  // is hoverable along the entire year axis.
  const hitTarget = (
    <rect
      key="hit"
      className="hit-target"
      x={x - COL_W / 2}
      y={plotTop}
      width={COL_W}
      height={plotBottom - plotTop}
    />
  );

  return (
    <g className="col-group" data-unit={r.id} data-status={r.status}>
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

  // Height: target 92vh on desktop so the chart "takes up the space
  // of a full desktop screen" per Court's brief, with a floor so it
  // doesn't collapse on short viewports.
  const totalH = useMemo(() => {
    if (typeof window === 'undefined') return 900;
    return Math.max(720, Math.round(window.innerHeight * 0.92));
  }, []);

  const plotTop = HEADER_H + TOP_PAD;
  const plotBottom = totalH - BOTTOM_PAD;
  const plotH = plotBottom - plotTop;

  function yearToY(year: number): number {
    return plotTop + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * plotH;
  }

  // Lay out columns. One x per reactor, status groups separated by
  // GROUP_GAP. Group headers span the x-range covered by their
  // columns.
  const layout = useMemo(() => {
    const groups: {
      status: ReactorStatus;
      reactors: Reactor[];
      xStart: number;      // leftmost column centre
      xEnd: number;        // rightmost column centre
      headerCx: number;    // centre x for the header label
    }[] = [];
    let xCursor = AXIS_W;
    for (const status of STATUS_ORDER) {
      const list = sortWithin(status, REACTORS.filter((r) => r.status === status));
      const groupW = list.length * COL_W;
      const xStart = xCursor + COL_W / 2;
      const xEnd = xCursor + groupW - COL_W / 2;
      const headerCx = (xStart + xEnd) / 2;
      groups.push({ status, reactors: list, xStart, xEnd, headerCx });
      xCursor += groupW + GROUP_GAP;
    }
    const usedW = xCursor - GROUP_GAP + RIGHT_PAD;
    return { groups, usedW };
  }, []);

  // Hover wiring.
  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const findCol = (el: Element | null): SVGGElement | null => {
      let cur: Element | null = el;
      while (cur && cur !== svg) {
        if (cur instanceof SVGGElement && cur.classList.contains('col-group')) {
          return cur;
        }
        cur = cur.parentElement;
      }
      return null;
    };

    const onOver = (e: PointerEvent) => {
      const g = findCol(e.target as Element);
      if (!g) return;
      const id = g.getAttribute('data-unit');
      if (!id) return;
      poster005Store.setHoveredReactor(id);
      const rect = container.getBoundingClientRect();
      setTooltip({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const onMove = (e: PointerEvent) => {
      const g = findCol(e.target as Element);
      if (!g) return;
      const rect = container.getBoundingClientRect();
      setTooltip((prev) =>
        prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : prev,
      );
    };
    const onOut = (e: PointerEvent) => {
      const g = findCol(e.target as Element);
      if (!g) return;
      const next = findCol(e.relatedTarget as Element);
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

  // Store subscription.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const apply = (filteredStatus: ReactorStatus | null, hoveredId: string | null) => {
      const hoveredR = hoveredId ? REACTOR_BY_ID[hoveredId] : null;
      const cols = svg.querySelectorAll<SVGGElement>('g.col-group');
      cols.forEach((g) => {
        const id = g.getAttribute('data-unit') ?? '';
        const status = g.getAttribute('data-status') as ReactorStatus | null;
        const matchesHover = hoveredR ? hoveredR.id === id : false;
        const matchesFilter = filteredStatus === null || status === filteredStatus;
        const isFocused = matchesHover;
        const isDimmed = hoveredR ? !matchesHover : (filteredStatus !== null && !matchesFilter);
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
  }, [layout]);

  const tooltipReactor = tooltip ? REACTOR_BY_ID[tooltip.id] : null;

  // Total width needed: layout.usedW for content + RIGHT_PAD already
  // included. If the container is wider than that, the SVG scales
  // up nicely; if narrower, the SVG scrolls horizontally inside its
  // wrapper (rare on desktop).
  const svgW = Math.max(width, layout.usedW);

  return (
    <div className="w-full">
      {/* Sit OUTSIDE the standard max-w-7xl so the chart can hit
          full desktop width — Court's brief asks for "the space of a
          full desktop screen". Cap at 1600px so it doesn't get silly
          on ultra-wide monitors. */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8">
        <div
          ref={containerRef}
          className="poster005-timeline relative w-full overflow-x-auto"
          style={{ minHeight: 200 }}
        >
          {width > 0 && (
            <svg
              ref={svgRef}
              width={svgW}
              height={totalH}
              viewBox={`0 0 ${svgW} ${totalH}`}
              preserveAspectRatio="xMinYMin meet"
              style={{ display: 'block' }}
            >
              {/* Decade gridlines (horizontal, faint) */}
              <g aria-hidden>
                {DECADES.map((y) => {
                  const yPos = yearToY(y);
                  return (
                    <line
                      key={y}
                      x1={AXIS_W - 4}
                      y1={yPos}
                      x2={svgW - RIGHT_PAD}
                      y2={yPos}
                      stroke="#0d1a1e"
                      strokeOpacity={0.08}
                      strokeWidth={1}
                    />
                  );
                })}
              </g>

              {/* Year axis labels */}
              <g aria-hidden>
                {DECADES.map((y) => {
                  const yPos = yearToY(y);
                  return (
                    <g key={y} transform={`translate(${AXIS_W - 8},${yPos})`}>
                      <line
                        x1={0}
                        y1={0}
                        x2={4}
                        y2={0}
                        stroke="#0d1a1e"
                        strokeOpacity={0.6}
                        strokeWidth={1}
                      />
                      <text
                        x={-4}
                        y={4}
                        fontSize={13}
                        textAnchor="end"
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

              {/* Status group headers */}
              {layout.groups.map(({ status, reactors, xStart, xEnd, headerCx }) => {
                const colour = STATUS_COLOUR[status];
                return (
                  <g
                    key={status}
                    className="status-header"
                    data-status={status}
                    transform={`translate(0,${HEADER_H - 20})`}
                  >
                    <text
                      x={headerCx}
                      y={0}
                      fontSize={12}
                      letterSpacing={1.5}
                      textAnchor="middle"
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
                      x={headerCx}
                      y={14}
                      fontSize={11}
                      textAnchor="middle"
                      style={{
                        fontFamily: "'Playfair', Georgia, serif",
                        fontStyle: 'italic',
                      }}
                      fill="rgba(13,26,30,0.55)"
                    >
                      {reactors.length} {reactors.length === 1 ? 'reactor' : 'reactors'}
                    </text>
                    {/* Status-coloured rule under the header spanning
                        the group's column range. */}
                    <line
                      x1={xStart - COL_W / 2}
                      y1={18}
                      x2={xEnd + COL_W / 2}
                      y2={18}
                      stroke={colour}
                      strokeOpacity={0.32}
                      strokeWidth={1}
                    />
                  </g>
                );
              })}

              {/* Columns per status group */}
              {layout.groups.map(({ status, reactors, xStart }) => (
                <g key={status}>
                  {reactors.map((r, i) => (
                    <Column
                      key={r.id}
                      r={r}
                      x={xStart + i * COL_W}
                      plotTop={plotTop}
                      plotBottom={plotBottom}
                      yearToY={yearToY}
                    />
                  ))}
                </g>
              ))}
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
                  tooltip.x > (containerRef.current?.clientWidth ?? 0) - 240
                    ? tooltip.x - 220
                    : tooltip.x + 16,
                top: tooltip.y + 12,
                minWidth: 200,
                maxWidth: 240,
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
    </div>
  );
}
