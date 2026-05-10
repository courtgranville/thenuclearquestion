// Poster 005 — Timeline sub-view (v1.1 — visible scrubber, tightened viewBox).
//
// Layer 1 (zIndex 1): the print SVG via dangerouslySetInnerHTML —
//   static, never re-rendered after first mount. After mount its
//   viewBox is overridden to crop empty white space above the chart.
//
// Layer 2 (zIndex 2): a sibling overlay SVG that shares the same
//   tightened viewBox. Hosts the year-line scrubber (line + handle
//   + year label), a transparent full-width hit-rect for pointer
//   capture, and per-row state highlights driven by setAttribute on
//   the print SVG's row groups (cross-layer).
//
// All interactive elements are React-rendered (refs), not DOM-
// appended children — so they survive React's reconciliation and
// can't be wiped by dangerouslySetInnerHTML re-applying.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  loadPoster005Forms,
  yearAtY,
  yAtYear,
  reactorIsLiveAtYear,
} from '@/assets/poster005';
import { poster005Store, type Poster005State } from '@/lib/poster005Store';

const TIMELINE_URL = '/assets/005-timeline.svg';

// Tightened viewBox for the timeline — print's full viewBox is
// 0 0 1763.68 1190.55 with the chart content sitting roughly at
// y=460 → y=1100 (chart bars + outlined-text reactor labels). We
// crop to that vertical range so the chart fills the section.
const TIMELINE_VIEWBOX = { x: 0, y: 450, w: 1763.68, h: 700 } as const;

const FOCUS_DIM = 0.15;
const COUNTER_TWEEN_MS = 200;
const SCRUB_LINE_COLOR = '#0D1A1E';

export function Poster005Timeline() {
  const data = useMemo(() => loadPoster005Forms(), []);
  const [svgText, setSvgText] = useState<string | null>(null);

  // DOM refs
  const containerRef = useRef<HTMLDivElement>(null);
  const printSvgRef = useRef<SVGSVGElement | null>(null);
  const scrubLineRef = useRef<SVGLineElement | null>(null);
  const scrubHandleRef = useRef<SVGCircleElement | null>(null);
  const scrubLabelRef = useRef<SVGTextElement | null>(null);
  const counterOpRef = useRef<HTMLSpanElement | null>(null);
  const counterUcRef = useRef<HTMLSpanElement | null>(null);
  const counterCaRef = useRef<HTMLSpanElement | null>(null);

  // Compute reactor column extent for the scrubber line.
  const xExtent = useMemo(() => {
    let xL = Infinity, xR = -Infinity;
    for (const r of data.reactors) {
      if (r.timeline_column_x < xL) xL = r.timeline_column_x;
      if (r.timeline_column_x > xR) xR = r.timeline_column_x;
    }
    return { xL: xL - 28, xR: xR + 70 }; // pad for handle on right
  }, [data]);

  // Initial year position for SSR-safe first paint.
  const initialY = yAtYear(data.timeline, poster005Store.getCurrent().year);

  // Fetch print SVG once.
  useEffect(() => {
    let cancelled = false;
    fetch(TIMELINE_URL)
      .then((r) => r.text())
      .then((t) => { if (!cancelled) setSvgText(t); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // After print SVG mounts, capture its element ref and tighten viewBox.
  useEffect(() => {
    if (!svgText || !containerRef.current) return;
    const svg = containerRef.current.querySelector('svg.p005-timeline-print') as SVGSVGElement | null;
    if (!svg) return;
    printSvgRef.current = svg;
    svg.setAttribute('viewBox', `${TIMELINE_VIEWBOX.x} ${TIMELINE_VIEWBOX.y} ${TIMELINE_VIEWBOX.w} ${TIMELINE_VIEWBOX.h}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }, [svgText]);

  // Subscribe to store updates and apply imperative DOM changes.
  useEffect(() => {
    function apply(state: Poster005State) {
      const { year, focusStatus } = state;

      // 1. Move scrubber.
      const sy = yAtYear(data.timeline, year);
      if (scrubLineRef.current) {
        scrubLineRef.current.setAttribute('y1', String(sy));
        scrubLineRef.current.setAttribute('y2', String(sy));
      }
      if (scrubHandleRef.current) {
        scrubHandleRef.current.setAttribute('cy', String(sy));
      }
      if (scrubLabelRef.current) {
        scrubLabelRef.current.setAttribute('y', String(sy + 1));
        scrubLabelRef.current.textContent = String(Math.round(year));
      }

      // 2. Per-row opacity overrides on the print SVG's row groups.
      const printSvg = printSvgRef.current;
      let opCount = 0, ucCount = 0, caCount = 0;
      if (printSvg) {
        for (const r of data.reactors) {
          const grp = printSvg.querySelector(`g#${r.id}`) as SVGGElement | null;
          if (!grp) continue;
          const isLive = reactorIsLiveAtYear(r, year);
          let opacity = 1;
          if (focusStatus && r.status !== focusStatus) {
            opacity = FOCUS_DIM;
          } else if (r.status === 'cancelled') {
            if (r.cancellation_year !== null && year < r.cancellation_year) {
              opacity = 0.08;
            } else if (r.cancellation_year !== null && Math.abs(year - r.cancellation_year) < 0.4) {
              opacity = 1;
            } else {
              opacity = 0.55;
            }
          } else {
            opacity = isLive ? 1 : 0.18;
          }
          grp.setAttribute('opacity', String(opacity));
          // Counters
          if (r.status === 'operating' && isLive) opCount++;
          if (r.status === 'retired' && isLive) opCount++;
          if (r.status === 'construction' && isLive) ucCount++;
          if (r.status === 'cancelled' && r.cancellation_year !== null && r.cancellation_year <= year) caCount++;
        }
      }
      tweenCounter(counterOpRef.current, opCount);
      tweenCounter(counterUcRef.current, ucCount);
      tweenCounter(counterCaRef.current, caCount);
    }

    apply(poster005Store.getCurrent());
    const unsub = poster005Store.subscribe(apply);
    return () => { unsub(); };
  }, [svgText, data]);

  // Pointer-capture handlers attached to the overlay SVG.
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    poster005Store.setYear(clientYToYear(e.clientY, e.currentTarget, data));
  };
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    poster005Store.setYear(clientYToYear(e.clientY, e.currentTarget, data));
  };
  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const cur = poster005Store.getCurrent().year;
    const dy = e.deltaY > 0 ? 1 : -1;
    poster005Store.setYear(
      Math.max(data.timeline.x_min_year, Math.min(data.timeline.x_max_year, cur + dy)),
    );
  };

  const vb = TIMELINE_VIEWBOX;

  return (
    <div className="w-full">
      <p
        className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-3"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        Reactor Timeline 1953–2030
      </p>
      <div
        ref={containerRef}
        className="relative bg-[#f5f1eb]/50 rounded-sm border border-border/30 overflow-hidden"
        style={{ minHeight: 560 }}
      >
        {/* Counter overlay top-right */}
        <div
          className="absolute top-3 right-4 text-right pointer-events-none select-none"
          style={{ fontFamily: "'Playfair', Georgia, serif", lineHeight: 1.5, fontSize: 14, zIndex: 10 }}
        >
          <div style={{ color: '#217B3D' }}>
            <span ref={counterOpRef}>0</span> operating
          </div>
          <div style={{ color: '#B5822E' }}>
            <span ref={counterUcRef}>0</span> under construction
          </div>
          <div style={{ color: '#A51E22' }}>
            <span ref={counterCaRef}>0</span> cancelled to date
          </div>
        </div>

        {/* Layer 1 — print SVG (static) */}
        <div
          className="absolute inset-0 [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{
            __html: svgText
              ? svgText.replace(
                  /<svg([^>]*)>/,
                  '<svg$1 class="p005-timeline-print" style="display:block">',
                )
              : '',
          }}
        />

        {/* Layer 2 — interactive overlay SVG */}
        <svg
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full touch-none"
          style={{ cursor: 'row-resize', zIndex: 5 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          {/* Transparent hit-rect — captures pointer events across
              the entire overlay area (SVG hit-detection by default
              doesn't fire on empty regions). */}
          <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="rgba(0,0,0,0)" />

          {/* Year-line scrubber */}
          <g pointerEvents="none">
            <line
              ref={scrubLineRef}
              x1={xExtent.xL}
              x2={xExtent.xR}
              y1={initialY}
              y2={initialY}
              stroke={SCRUB_LINE_COLOR}
              strokeWidth="1.5"
              opacity="0.95"
            />
            <circle
              ref={scrubHandleRef}
              cx={xExtent.xR}
              cy={initialY}
              r="6"
              fill="#ECE7DF"
              stroke={SCRUB_LINE_COLOR}
              strokeWidth="1.5"
            />
            <text
              ref={scrubLabelRef}
              x={xExtent.xR + 12}
              y={initialY + 1}
              fontFamily="Playfair, Georgia, serif"
              fontSize="14"
              fontWeight="500"
              fill={SCRUB_LINE_COLOR}
              dominantBaseline="middle"
            >
              {Math.round(poster005Store.getCurrent().year)}
            </text>
          </g>
        </svg>
      </div>
      <p
        className="text-xs text-muted-foreground mt-2 text-center"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        Drag vertically to scrub year · scroll to step ±1 year · arrow keys when focused
      </p>
    </div>
  );
}

// Map a clientY pointer coord to a year via the SVG's viewBox.
function clientYToYear(clientY: number, svg: SVGSVGElement, data: ReturnType<typeof loadPoster005Forms>): number {
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const fy = (clientY - rect.top) / rect.height;
  const svgY = vb.y + fy * vb.height;
  const year = yearAtY(data.timeline, svgY);
  return Math.max(data.timeline.x_min_year, Math.min(data.timeline.x_max_year, year));
}

function tweenCounter(target: HTMLSpanElement | null, to: number) {
  if (!target) return;
  const fromText = target.textContent ?? '0';
  const from = parseInt(fromText, 10);
  if (Number.isNaN(from) || from === to) {
    target.textContent = String(to);
    return;
  }
  const start = performance.now();
  function step(now: number) {
    const t = Math.min(1, (now - start) / COUNTER_TWEEN_MS);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = Math.round(from + (to - from) * eased);
    target!.textContent = String(v);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

