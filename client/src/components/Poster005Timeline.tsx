// ─────────────────────────────────────────────────────────────────
// Poster005Timeline.tsx — full-width reactor timeline 1953–2030.
//
// REWRITE per Court's Round 1 brief, structural fix 1:
// inject the same canonical 005-dendrogram-clean_336edeac.svg that
// Poster005Dendrogram uses, but crop the viewBox to ONLY the timeline
// strip (y ≈ 820..1005). That strip contains:
//
//   - 8 horizontal gridlines (y=835.316..993.758)
//   - decade year labels on both edges (1960..2030, y=837.982..997.088)
//   - 72 row-* groups each carrying data-unit + data-phase, with
//     red/green vertical bars for retired/operating, dashed navy for
//     under-construction, and a single dot for cancelled
//
// All of that geometry is the print verbatim; no re-derivation.
//
// Hover/filter wiring: the row-* groups already carry data-unit and
// data-phase. Container-delegated pointerover/out finds the row
// ancestor and updates poster005Store.hoveredReactor. CSS classes
// drive opacity (dim) and transform: scale (focus) — both GPU-
// composited, no layout reflow, no jitter (the previous from-manifest
// implementation changed stroke-width on hover which triggered
// repaints).
//
// Year labels: source font-size is 10, which becomes hard to read at
// the cropped strip's effective height. Post-injection bumps every
// year-label <text> to font-size 16. No re-derivation.
//
// Tooltip (Court report #6): a small floating popover near the cursor
// with reactor name, status label, and capacity. Style mirrors
// Poster006Sellafield's hover callout — cream card, status-coloured
// left border, small Playfair.
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

const DENDRO_URL = '/assets/005-dendrogram-clean_336edeac.svg';

const CSS_INJECTED_KEY = '__poster005_timeline_css';

function injectStyleOnce() {
  if (typeof document === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any)[CSS_INJECTED_KEY]) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any)[CSS_INJECTED_KEY] = true;
  const style = document.createElement('style');
  style.textContent = `
    .poster005-timeline g[id^="row-"] {
      transform-box: fill-box;
      transform-origin: center;
      transition: transform 120ms ease-out, opacity 150ms ease-out;
      cursor: pointer;
      will-change: transform, opacity;
    }
    .poster005-timeline g[id^="row-"].is-focused {
      transform: scale(1.05);
    }
    .poster005-timeline g[id^="row-"].is-dimmed {
      opacity: 0.1;
    }
  `;
  document.head.appendChild(style);
}

const InjectedTimeline = memo(function InjectedTimeline({ markup }: { markup: string }) {
  return <div className="w-full" dangerouslySetInnerHTML={{ __html: markup }} />;
});

export default function Poster005Timeline() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  // Tooltip state — purely local; cross-view hover panel is the
  // separate Poster005ReactorDetail component.
  const [tooltip, setTooltip] = useState<{
    reactorId: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => { injectStyleOnce(); }, []);

  // Fetch the source SVG once. Crop viewBox to the timeline strip
  // and bump year-label font-size.
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
          // y-bounds inside the source (measured 2026-05-11):
          //   gridlines:    y = 835.316 .. 993.758
          //   year labels:  y = 837.982 .. 997.088 (Georgia, font-size 10)
          //   row bars top: y = 835.316
          //   row bars bot: y = 983.160
          // viewBox starts at y=820 for headroom above the top gridline /
          // 1960 label baseline and ends at y=1005 to clear the 2030
          // label descender.
          svg.setAttribute('viewBox', '0 820 1694.98 185');
          svg.setAttribute('width', '100%');
          svg.removeAttribute('height');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          svg.setAttribute('style', 'display:block;width:100%;height:auto;');

          // Bump year-label font-size for legibility at full-width scale.
          // The decade labels are <text font-size="10"> elements with
          // 4-digit content; leave non-year text alone.
          const yearLabels = svg.querySelectorAll('text');
          yearLabels.forEach((t) => {
            const inner = (t.textContent ?? '').trim();
            if (/^\d{4}$/.test(inner)) {
              t.setAttribute('font-size', '16');
              t.setAttribute('opacity', '0.8');
            }
          });
        }
        setSvgMarkup(new XMLSerializer().serializeToString(svg ?? doc.documentElement));
      }
    };
    xhr.send();
    return () => { cancelled = true; };
  }, []);

  // Container-delegated hover. Finds the nearest row-* group ancestor
  // and uses its rowId → REACTOR_BY_ID lookup.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const findRow = (el: Element | null): SVGGElement | null => {
      let cur: Element | null = el;
      while (cur && cur !== container) {
        if (cur instanceof SVGGElement && /^row-\d+$/.test(cur.id)) return cur;
        cur = cur.parentElement;
      }
      return null;
    };

    const onOver = (e: PointerEvent) => {
      const g = findRow(e.target as Element);
      if (!g) return;
      const r = REACTORS.find((x) => x.rowId === g.id);
      if (!r) return;
      poster005Store.setHoveredReactor(r.id);
      // Position the tooltip near the cursor inside the container.
      const rect = container.getBoundingClientRect();
      setTooltip({ reactorId: r.id, x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const onMove = (e: PointerEvent) => {
      // Only update tooltip position if a tooltip is open and we're
      // still over a row.
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

    container.addEventListener('pointerover', onOver, { passive: true });
    container.addEventListener('pointermove', onMove, { passive: true });
    container.addEventListener('pointerout', onOut, { passive: true });
    return () => {
      container.removeEventListener('pointerover', onOver);
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerout', onOut);
    };
  }, []);

  // Apply focus/dim classes from store state.
  useEffect(() => {
    if (!svgMarkup) return;
    const container = containerRef.current;
    if (!container) return;

    const apply = (filteredStatus: ReactorStatus | null, hoveredId: string | null) => {
      const hoveredR = hoveredId ? REACTOR_BY_ID[hoveredId] : null;
      const rows = container.querySelectorAll<SVGGElement>('g[id^="row-"]');
      rows.forEach((g) => {
        const rowId = g.id;
        const r = REACTORS.find((x) => x.rowId === rowId);
        if (!r) return;
        const matchesHover = hoveredR ? r.id === hoveredR.id : false;
        const matchesFilter = filteredStatus === null || r.status === filteredStatus;
        const isFocused = matchesHover;
        const isDimmed = hoveredR ? !matchesHover : (filteredStatus !== null && !matchesFilter);
        g.classList.toggle('is-focused', isFocused);
        g.classList.toggle('is-dimmed', isDimmed);
      });
    };

    const initial = poster005Store.getCurrent();
    apply(initial.filteredStatus, initial.hoveredReactor);
    return poster005Store.subscribe((s) => apply(s.filteredStatus, s.hoveredReactor));
  }, [svgMarkup]);

  const tooltipReactor = tooltip ? REACTOR_BY_ID[tooltip.reactorId] : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8">
      <div
        ref={containerRef}
        className="poster005-timeline relative w-full mx-auto"
        style={{ minHeight: 200 }}
      >
        {svgMarkup && <InjectedTimeline markup={svgMarkup} />}

        {tooltip && tooltipReactor && (
          <div
            className="absolute z-20 pointer-events-none p-3 rounded-sm border bg-card shadow-md"
            style={{
              borderColor: 'rgba(13,26,30,0.18)',
              borderLeftColor: STATUS_COLOUR[tooltipReactor.status],
              borderLeftWidth: 3,
              // Offset so the tooltip doesn't sit directly under the
              // cursor — flips to the left if near the right edge.
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
              {tooltipReactor.capacityMw ? `${tooltipReactor.capacityMw.toLocaleString()} MW` : '— MW'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
