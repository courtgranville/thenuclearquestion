// ─────────────────────────────────────────────────────────────────
// Poster005Timeline.tsx - vertical full-screen reactor timeline.
//
// Court round-3 spec:
// - Use the PRINT'S actual line + cap design, not my redrawn
//     filled rects. Each row in the print SVG is two thin vertical
//     lines (red construction, green operating) at stroke-width 0.5,
//     with horizontal cap marks at the top and bottom.
// - Year axis starts at 1960 (not 1953). Reactors with a
//     construction_start before 1960 are clipped to 1960 - matches
//     the print's editorial decision to crop pre-1960 history.
// - Larger font sizes for year labels (1953/60/70/.../2030) and
//     for the floating tooltip.
// - No status-group headers across the top - Court reads the
//     status from the colour and the legend buttons elsewhere.
// - Hover focus stays inside the plot bounds: a clip-path on the
//     SVG masks any column scaling beyond the plot rectangle.
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

const YEAR_MIN = 1960;
const YEAR_MAX = 2030;
const DECADES: number[] = [1960, 1970, 1980, 1990, 2000, 2010, 2020, 2030];

// Print stroke colours from the source SVG row groups - slightly
// different shades from STATUS_COLOUR (which mirrors the MAP fills).
// Using the exact line stroke values keeps the bars looking like
// the print verbatim.
const STROKE_CONSTRUCTION = '#a41e23';
const STROKE_OPERATING = '#247c3e';
const STROKE_UNDER_CONSTRUCTION = '#1b3967';

const AXIS_W = 76;            // left axis area (year labels) - wider for larger font
const HEADER_PAD = 26;        // padding above plot
const COL_W = 18;             // per-reactor column width
const CAP_W = 8.5;            // horizontal cap-mark width (matches print)
const GROUP_GAP = 20;         // gap between status groups
const TOP_PAD = 14;           // padding inside the plot above the first tick
const BOTTOM_PAD = 22;        // padding below the last tick
const RIGHT_PAD = 18;
const STROKE_BASE = 2.2;      // line stroke-width (print is 0.5; web needs more for legibility)
const CAP_STROKE = 1.5;       // cap-mark stroke-width

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

// Clip a year to the plot range. Used to fold pre-1960 reactor
// histories into the 1960 top edge per Court's spec.
function clipYear(year: number | null): number | null {
  if (year === null) return null;
  if (year < YEAR_MIN) return YEAR_MIN;
  if (year > YEAR_MAX) return YEAR_MAX;
  return year;
}

// ─── CSS ──────────────────────────────────────────────────────────

const CSS_INJECTED_KEY = '__poster005_timeline_css_v4';

function injectStyleOnce() {
  if (typeof document === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any)[CSS_INJECTED_KEY]) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any)[CSS_INJECTED_KEY] = true;
  const style = document.createElement('style');
  style.textContent = `
    .poster005-timeline g.col-group {
      transition: opacity 160ms ease-out;
      cursor: pointer;
      will-change: opacity;
    }
    .poster005-timeline g.col-group.is-dimmed {
      opacity: 0.06;
    }
    .poster005-timeline rect.hit-target {
      fill: transparent;
      pointer-events: all;
    }
    /* Court round-14: hover only dims, no stroke-width or radius
       changes. The focused column stays at its natural appearance
       so there's zero perceived movement when scrubbing across
       columns - everything else dims to 0.06. */
  `;
  document.head.appendChild(style);
}

// ─── Single column renderer ──────────────────────────────────────

interface ColumnProps {
  r: Reactor;
  x: number;
  plotTop: number;
  plotBottom: number;
  yearToY: (year: number) => number;
}

const Column = memo(function Column({ r, x, plotTop, plotBottom, yearToY }: ColumnProps) {
  const segments: React.ReactNode[] = [];

  if (r.status === 'retired' || r.status === 'operating') {
    // Clip the construction start year to YEAR_MIN so pre-1960
    // reactors land at the top edge (Court's spec).
    const s = clipYear(r.constructionStart);
    const g = clipYear(r.commercialOperation);
    const e = clipYear(r.status === 'retired' ? r.shutdown : YEAR_MAX);
    const constructionVisible = s !== null && g !== null && s < g;
    const operatingVisible = g !== null && e !== null && g < e;
    if (constructionVisible) {
      const y0 = yearToY(s!);
      const y1 = yearToY(g!);
      segments.push(
        <line key="con-line" className="bar-line"
          x1={x} y1={y0} x2={x} y2={y1}
          stroke={STROKE_CONSTRUCTION}
          strokeWidth={STROKE_BASE}
          strokeLinecap="round" />,
      );
      // Top cap matches the visible top phase (red here).
      segments.push(
        <line key="con-cap" className="cap-line"
          x1={x - CAP_W / 2} y1={y0} x2={x + CAP_W / 2} y2={y0}
          stroke={STROKE_CONSTRUCTION}
          strokeWidth={CAP_STROKE}
          strokeLinecap="round" />,
      );
    }
    if (operatingVisible) {
      const y0 = yearToY(g!);
      const y1 = yearToY(e!);
      segments.push(
        <line key="op-line" className="bar-line"
          x1={x} y1={y0} x2={x} y2={y1}
          stroke={STROKE_OPERATING}
          strokeWidth={STROKE_BASE}
          strokeLinecap="round" />,
      );
      // Bottom cap (green) at shutdown / horizon.
      segments.push(
        <line key="op-cap-bottom" className="cap-line"
          x1={x - CAP_W / 2} y1={y1} x2={x + CAP_W / 2} y2={y1}
          stroke={STROKE_OPERATING}
          strokeWidth={CAP_STROKE}
          strokeLinecap="round" />,
      );
      // Top cap - only if the construction phase clipped out
      // entirely (so the visible top of the bar is the start of
      // the operating phase). Court round-15: 'some of the timeline
      // lines are missing their starting cap lines.' Pre-1960
      // reactors had construction + grid both before 1960, both
      // clipped to 1960 → no top cap rendered. Now they get a
      // green cap matching the visible top phase.
      if (!constructionVisible) {
        segments.push(
          <line key="op-cap-top" className="cap-line"
            x1={x - CAP_W / 2} y1={y0} x2={x + CAP_W / 2} y2={y0}
            stroke={STROKE_OPERATING}
            strokeWidth={CAP_STROKE}
            strokeLinecap="round" />,
        );
      }
    }
  } else if (r.status === 'underConstruction') {
    const s = clipYear(r.constructionStart);
    const e = clipYear(r.commercialOperation ?? YEAR_MAX);
    if (s !== null && e !== null && s < e) {
      const y0 = yearToY(s);
      const y1 = yearToY(e);
      // Dashed projection - matches the print's convention for
      // under-construction reactors (Court round-13).
      segments.push(
        <line key="uc-line" className="bar-line"
          x1={x} y1={y0} x2={x} y2={y1}
          stroke={STROKE_UNDER_CONSTRUCTION}
          strokeWidth={STROKE_BASE}
          strokeLinecap="butt"
          strokeDasharray="4 3" />,
      );
      segments.push(
        <line key="uc-cap" className="cap-line"
          x1={x - CAP_W / 2} y1={y0} x2={x + CAP_W / 2} y2={y0}
          stroke={STROKE_UNDER_CONSTRUCTION}
          strokeWidth={CAP_STROKE}
          strokeLinecap="round" />,
      );
    }
  } else if (r.status === 'cancelled') {
    const cy = r.cancellationYear;
    if (cy !== null) {
      const yc = yearToY(clipYear(cy)!);
      const s = clipYear(r.constructionStart);
      if (s !== null && s < cy) {
        const y0 = yearToY(s);
        segments.push(
          <line key="cancel-line" className="bar-line"
            x1={x} y1={y0} x2={x} y2={yc}
            stroke={STROKE_CONSTRUCTION}
            strokeWidth={STROKE_BASE}
            strokeOpacity={0.65}
            strokeLinecap="round" />,
        );
      }
      // Cancelled dot - GREY HOLLOW circle, matching the print.
      // (My earlier red-filled dot didn't match Court's design.)
      segments.push(
        <circle key="cancel-dot" className="cancel-dot"
          cx={x} cy={yc} r={4.5}
          fill="none"
          stroke={STATUS_COLOUR.retired}
          strokeWidth={1.4} />,
      );
    }
  }

  // Tight hit-target: hugs the actual ink instead of the full
  // column × plot height. Computed from the visible y-range only.
  let hitY0 = plotBottom;
  let hitY1 = plotTop;
  if (r.status === 'retired' || r.status === 'operating') {
    const s = clipYear(r.constructionStart);
    const e = clipYear(r.status === 'retired' ? r.shutdown : YEAR_MAX);
    if (s !== null) hitY0 = Math.min(hitY0, yearToY(s));
    if (e !== null) hitY1 = Math.max(hitY1, yearToY(e));
  } else if (r.status === 'underConstruction') {
    const s = clipYear(r.constructionStart);
    const e = clipYear(r.commercialOperation ?? YEAR_MAX);
    if (s !== null) hitY0 = Math.min(hitY0, yearToY(s));
    if (e !== null) hitY1 = Math.max(hitY1, yearToY(e));
  } else if (r.status === 'cancelled') {
    const cy = r.cancellationYear;
    const s = clipYear(r.constructionStart);
    if (cy !== null) {
      if (s !== null && s < cy) {
        hitY0 = Math.min(hitY0, yearToY(s));
      } else {
        // Dot only - give the hit-target a small symmetric padding
        // around the dot rather than zero-height.
        hitY0 = yearToY(clipYear(cy)!) - 7;
      }
      hitY1 = Math.max(hitY1, yearToY(clipYear(cy)!) + 7);
    }
  }
  // Safety: never zero-height.
  if (hitY1 <= hitY0) {
    const mid = (hitY0 + hitY1) / 2;
    hitY0 = mid - 6;
    hitY1 = mid + 6;
  }
  const HIT_W = 12;
  const hitTarget = (
    <rect key="hit" className="hit-target"
      x={x - HIT_W / 2} y={hitY0}
      width={HIT_W} height={hitY1 - hitY0} />
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

  const totalH = useMemo(() => {
    if (typeof window === 'undefined') return 900;
    return Math.max(720, Math.round(window.innerHeight * 0.92));
  }, []);

  const plotTop = HEADER_PAD + TOP_PAD;
  const plotBottom = totalH - BOTTOM_PAD;
  const plotH = plotBottom - plotTop;

  function yearToY(year: number): number {
    return plotTop + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * plotH;
  }

  const layout = useMemo(() => {
    const groups: {
      status: ReactorStatus;
      reactors: Reactor[];
      xStart: number;
      xEnd: number;
    }[] = [];
    let xCursor = AXIS_W;
    for (const status of STATUS_ORDER) {
      const list = sortWithin(status, REACTORS.filter((r) => r.status === status));
      const groupW = list.length * COL_W;
      const xStart = xCursor + COL_W / 2;
      const xEnd = xCursor + groupW - COL_W / 2;
      groups.push({ status, reactors: list, xStart, xEnd });
      xCursor += groupW + GROUP_GAP;
    }
    const usedW = xCursor - GROUP_GAP + RIGHT_PAD;
    return { groups, usedW };
  }, []);

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
    };
    const initial = poster005Store.getCurrent();
    apply(initial.filteredStatus, initial.hoveredReactor);
    return poster005Store.subscribe((s) => apply(s.filteredStatus, s.hoveredReactor));
  }, [layout]);

  const tooltipReactor = tooltip ? REACTOR_BY_ID[tooltip.id] : null;
  const svgW = Math.max(width, layout.usedW);

  return (
    <div className="w-full">
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
              {/* Decade gridlines */}
              <g aria-hidden>
                {DECADES.map((y) => {
                  const yPos = yearToY(y);
                  return (
                    <line
                      key={y}
                      x1={AXIS_W - 6}
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

              {/* Year axis labels - bigger font per Court's brief */}
              <g aria-hidden>
                {DECADES.map((y) => {
                  const yPos = yearToY(y);
                  return (
                    <g key={y} transform={`translate(${AXIS_W - 12},${yPos})`}>
                      <line
                        x1={0}
                        y1={0}
                        x2={6}
                        y2={0}
                        stroke="#0d1a1e"
                        strokeOpacity={0.6}
                        strokeWidth={1}
                      />
                      <text
                        x={-6}
                        y={5}
                        fontSize={18}
                        textAnchor="end"
                        style={{
                          fontFamily: "'Playfair', Georgia, serif",
                          fontWeight: 500,
                        }}
                        fill="rgba(13,26,30,0.85)"
                      >
                        {y}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Columns. No status headers along the top - Court asked
                  for them removed (legend reads the status colour). */}
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

          {/* Floating tooltip - bigger text per Court's brief */}
          {tooltip && tooltipReactor && (
            <div
              className="absolute z-20 pointer-events-none p-4 rounded-sm border bg-card shadow-md"
              style={{
                borderColor: 'rgba(13,26,30,0.18)',
                borderLeftColor: STATUS_COLOUR[tooltipReactor.status],
                borderLeftWidth: 3,
                left:
                  tooltip.x > (containerRef.current?.clientWidth ?? 0) - 280
                    ? tooltip.x - 260
                    : tooltip.x + 18,
                top: tooltip.y + 14,
                minWidth: 230,
                maxWidth: 280,
              }}
            >
              <p
                className="font-serif text-lg leading-tight"
                style={{ color: STATUS_COLOUR[tooltipReactor.status], fontWeight: 600 }}
              >
                {tooltipReactor.name}
              </p>
              <p
                className="text-sm uppercase tracking-[0.1em] text-muted-foreground mt-1"
                style={{ fontFamily: "'Playfair', Georgia, serif" }}
              >
                {STATUS_LABEL[tooltipReactor.status]}
              </p>
              <p
                className="text-sm text-foreground mt-2 tabular-nums"
                style={{ fontFamily: "'Playfair', Georgia, serif" }}
              >
                {tooltipReactor.capacityMw
                  ? `${tooltipReactor.capacityMw.toLocaleString()} MW`
                  : ' - MW'}
                {tooltipReactor.status === 'retired' &&
                tooltipReactor.commercialOperation &&
                tooltipReactor.shutdown
                  ? ` · ${tooltipReactor.commercialOperation} - ${tooltipReactor.shutdown}`
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
