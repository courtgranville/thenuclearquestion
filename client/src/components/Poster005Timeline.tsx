// Poster 005 — Timeline sub-view.
//
// Static layer: client/public/assets/005-timeline.svg, fetched and
// inlined so the interactive layer can read the row groups via DOM
// refs and override their opacity attribute per-frame.
//
// Interactive layer:
//   - Year-line scrubber (horizontal SVG line; lower y = later year).
//   - Per-row state highlights driven by reactorIsLiveAtYear().
//   - Cancelled-ring flashes on cancellation year, fades when passed.
//   - Counter overlay (top-right): operating / under-construction /
//     cancelled-to-date counts, animated 200 ms ease-out per change.
//
// Pattern: poster003Store-style pub/sub + RAF + refs. The React tree
// renders once on mount; subscriptions update DOM imperatively.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  loadPoster005Forms,
  yearAtY,
  yAtYear,
  reactorIsLiveAtYear,
  type Reactor,
} from '@/assets/poster005';
import { poster005Store, type Poster005State } from '@/lib/poster005Store';

const TIMELINE_URL = '/assets/005-timeline.svg';
const SCRUB_FOCUS_DIM = 0.15;        // non-focused-status row opacity when status-focus is active
const COUNTER_TWEEN_MS = 200;
const SCRUB_LINE_COLOR = '#0D1A1E';
const SCRUB_HANDLE_BG = '#ECE7DF';

interface TimelineDoc {
  raw: string;
  reactors: Reactor[];
  yMin: number;     // y-coord at year x_min_year
  yMax: number;     // y-coord at year x_max_year
  xLeft: number;    // leftmost reactor column
  xRight: number;   // rightmost reactor column
}

export function Poster005Timeline() {
  const data = useMemo(() => loadPoster005Forms(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const scrubLineRef = useRef<SVGGElement | null>(null);
  const counterRefs = useRef<{ op?: HTMLSpanElement; uc?: HTMLSpanElement; ca?: HTMLSpanElement }>({});
  const [svgText, setSvgText] = useState<string | null>(null);
  const [doc, setDoc] = useState<TimelineDoc | null>(null);

  // Fetch the print SVG once. Rendered via dangerouslySetInnerHTML
  // so we can read row groups via DOM refs.
  useEffect(() => {
    let cancelled = false;
    fetch(TIMELINE_URL)
      .then((r) => r.text())
      .then((t) => { if (!cancelled) setSvgText(t); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Once the SVG is mounted, capture DOM refs and document geometry.
  useEffect(() => {
    if (!svgText || !containerRef.current) return;
    const svg = containerRef.current.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;
    svgRef.current = svg;

    const m = data.timeline.y_to_year_mapping;
    const yMin = yAtYear(data.timeline, data.timeline.x_min_year);
    const yMax = yAtYear(data.timeline, data.timeline.x_max_year);

    let xLeft = Infinity, xRight = -Infinity;
    for (const r of data.reactors) {
      if (r.timeline_column_x < xLeft) xLeft = r.timeline_column_x;
      if (r.timeline_column_x > xRight) xRight = r.timeline_column_x;
    }
    setDoc({ raw: svgText, reactors: data.reactors, yMin, yMax, xLeft, xRight });

    // Mount the year-line scrubber as a child of the SVG so it
    // shares the SVG's viewBox transform.
    const scrubGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    scrubGroup.setAttribute('class', 'p005-timeline-scrub');
    scrubGroup.setAttribute('pointer-events', 'none');
    const scrubLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    scrubLine.setAttribute('x1', String(xLeft - 24));
    scrubLine.setAttribute('x2', String(xRight + 24));
    scrubLine.setAttribute('stroke', SCRUB_LINE_COLOR);
    scrubLine.setAttribute('stroke-width', '0.8');
    scrubLine.setAttribute('opacity', '0.85');
    scrubGroup.appendChild(scrubLine);
    const scrubHandle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    scrubHandle.setAttribute('cx', String(xRight + 24));
    scrubHandle.setAttribute('r', '4.5');
    scrubHandle.setAttribute('fill', SCRUB_HANDLE_BG);
    scrubHandle.setAttribute('stroke', SCRUB_LINE_COLOR);
    scrubHandle.setAttribute('stroke-width', '1.2');
    scrubGroup.appendChild(scrubHandle);
    const scrubLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    scrubLabel.setAttribute('x', String(xRight + 32));
    scrubLabel.setAttribute('font-family', 'Playfair, Georgia, serif');
    scrubLabel.setAttribute('font-size', '11');
    scrubLabel.setAttribute('fill', SCRUB_LINE_COLOR);
    scrubLabel.setAttribute('dominant-baseline', 'middle');
    scrubGroup.appendChild(scrubLabel);
    svg.appendChild(scrubGroup);
    scrubLineRef.current = scrubGroup;
    void m;
  }, [svgText, data]);

  // Subscribe to store and apply imperative updates.
  useEffect(() => {
    if (!doc || !svgRef.current || !scrubLineRef.current) return;

    const svg = svgRef.current;
    const scrubGroup = scrubLineRef.current;
    const scrubLine  = scrubGroup.querySelector('line')!;
    const scrubHandle = scrubGroup.querySelector('circle')!;
    const scrubLabel = scrubGroup.querySelector('text')!;

    function apply(state: Poster005State) {
      const { year, focusStatus } = state;
      // 1. Move scrub-line.
      const sy = yAtYear(data.timeline, year);
      scrubLine.setAttribute('y1', String(sy));
      scrubLine.setAttribute('y2', String(sy));
      scrubHandle.setAttribute('cy', String(sy));
      scrubLabel.setAttribute('y', String(sy));
      scrubLabel.textContent = String(Math.round(year));

      // 2. Apply per-row opacity overrides.
      let opCount = 0, ucCount = 0, caCount = 0;
      for (const r of doc!.reactors) {
        const grp = svg.querySelector(`g#${r.id}`) as SVGGElement | null;
        if (!grp) continue;
        const isLive = reactorIsLiveAtYear(r, year);
        // Cancelled rings: visible from cancellation year onward,
        // grey when scrubbed past, flash exactly at cancellation_year.
        let opacity = 1;
        if (focusStatus && r.status !== focusStatus) {
          opacity = SCRUB_FOCUS_DIM;
        } else if (r.status === 'cancelled') {
          if (r.cancellation_year !== null && year < r.cancellation_year) {
            opacity = 0.08; // not yet cancelled at this scrub year
          } else if (r.cancellation_year !== null && Math.abs(year - r.cancellation_year) < 0.4) {
            opacity = 1;    // flash on year of cancellation
          } else {
            opacity = 0.55; // dim grey ring after passed
          }
        } else if (r.status === 'operating' || r.status === 'retired' || r.status === 'construction') {
          opacity = isLive ? 1 : 0.18;
        }
        grp.setAttribute('opacity', String(opacity));

        // Counter accounting at scrub year.
        if (r.status === 'operating' && isLive) opCount++;
        if (r.status === 'retired' && isLive) opCount++; // operating-at-year means still running
        if (r.status === 'construction' && isLive) ucCount++;
        if (r.status === 'cancelled' && r.cancellation_year !== null && r.cancellation_year <= year) caCount++;
      }
      // Tween counters.
      tweenCounter(counterRefs.current.op, opCount);
      tweenCounter(counterRefs.current.uc, ucCount);
      tweenCounter(counterRefs.current.ca, caCount);
    }

    // Initial render with current state.
    apply(poster005Store.getCurrent());
    const unsub = poster005Store.subscribe(apply);
    return () => { unsub(); };
  }, [doc, data]);

  // Pointer / wheel / keyboard: drive scrub.
  useEffect(() => {
    if (!doc || !svgRef.current) return;
    const svg = svgRef.current;

    function clientYToYear(clientY: number): number {
      // SVG viewBox y → year.
      const rect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const fy = (clientY - rect.top) / rect.height;
      const svgY = vb.y + fy * vb.height;
      const year = yearAtY(data.timeline, svgY);
      return Math.max(data.timeline.x_min_year, Math.min(data.timeline.x_max_year, year));
    }

    let dragging = false;
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      poster005Store.setYear(clientYToYear(e.clientY));
    }
    function onPointerDown(e: PointerEvent) {
      dragging = true;
      svg.setPointerCapture(e.pointerId);
      poster005Store.setYear(clientYToYear(e.clientY));
    }
    function onPointerUp() { dragging = false; }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const cur = poster005Store.getCurrent().year;
      const dy = e.deltaY > 0 ? 1 : -1;
      poster005Store.setYear(Math.max(data.timeline.x_min_year, Math.min(data.timeline.x_max_year, cur + dy)));
    }

    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointerleave', onPointerUp);
    svg.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('pointerleave', onPointerUp);
      svg.removeEventListener('wheel', onWheel);
    };
  }, [doc, data]);

  return (
    <div className="w-full">
      <p
        className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-3"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        Reactor Timeline 1953–2030
      </p>
      <div className="relative bg-[#f5f1eb]/50 rounded-sm border border-border/30 overflow-hidden" style={{ minHeight: 360 }}>
        {/* Counter overlay top-right */}
        <div
          className="absolute top-3 right-3 text-right pointer-events-none select-none"
          style={{ fontFamily: "'Playfair', Georgia, serif", lineHeight: 1.4, fontSize: 14 }}
        >
          <div style={{ color: '#217B3D' }}>
            <span ref={(el) => { counterRefs.current.op = el ?? undefined; }}>0</span> operating
          </div>
          <div style={{ color: '#B5822E' }}>
            <span ref={(el) => { counterRefs.current.uc = el ?? undefined; }}>0</span> under construction
          </div>
          <div style={{ color: '#A51E22' }}>
            <span ref={(el) => { counterRefs.current.ca = el ?? undefined; }}>0</span> cancelled to date
          </div>
        </div>
        <div
          ref={containerRef}
          className="w-full [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-[80vh] cursor-row-resize touch-none"
          dangerouslySetInnerHTML={{ __html: svgText ?? '' }}
        />
      </div>
    </div>
  );
}

// Animate a counter element from its current display number to `to`.
// 200 ms ease-out, integer-rounded each frame.
function tweenCounter(el: HTMLSpanElement | undefined, to: number) {
  if (!el) return;
  const target = el;
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
    target.textContent = String(v);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
