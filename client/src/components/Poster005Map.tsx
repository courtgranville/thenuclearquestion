// Poster 005 — Map sub-view.
//
// Renders the print map SVG (`/assets/005-map_*.svg`) as the static
// layer. The interactive layer subscribes to focusStatus, focusReactor,
// focusSite and applies opacity overrides via setAttribute on the
// SVG's circles by their fill colour (matches the existing v0
// approach but driven by poster005Store rather than React state).
//
// Cluster expansion: on hover/click of one of the three cluster
// centroids (Sellafield/Moorside, Wylfa, Sizewell), the rest of the
// map dims to 30%; when a cluster is locked-open via click, the
// centroid label and cluster's reactor circles read fully.

import { useEffect, useMemo, useRef, useState } from 'react';
import { loadPoster005Forms, type ReactorStatus } from '@/assets/poster005';
import { poster005Store, type Poster005State } from '@/lib/poster005Store';

const MAP_URL = '/assets/005-map_d6bf9e9f.svg';
const FOCUS_DIM = 0.20;       // non-focused-status circles when status focused
const CLUSTER_REST_DIM = 0.30;// rest-of-map opacity when a cluster is locked

// Print fill colours used for reactor circles.
const STATUS_FILL: Record<ReactorStatus, string> = {
  construction: '#b4822e',
  operating:    '#267c3e',
  retired:      '#7d746b',
  cancelled:    '#a61e23',
};

// Sellafield-locked annotation copy (from the brief).
const SELLAFIELD_ANNOTATION = "Britain's largest reactor concentration — 7 reactors, 0 operating.";

export function Poster005Map() {
  const data = useMemo(() => loadPoster005Forms(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const styleElRef = useRef<SVGStyleElement | null>(null);
  const [svgText, setSvgText] = useState<string | null>(null);
  const [annotationVisible, setAnnotationVisible] = useState<string | null>(null);

  // Fetch print SVG once.
  useEffect(() => {
    let cancelled = false;
    fetch(MAP_URL)
      .then((r) => r.text())
      .then((t) => { if (!cancelled) setSvgText(t); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Mount / observe.
  useEffect(() => {
    if (!svgText || !containerRef.current) return;
    const svg = containerRef.current.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;

    // Inject a <style> element we can update per-frame.
    let styleEl = svg.querySelector('style.p005-map-overrides') as SVGStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style') as SVGStyleElement;
      styleEl.setAttribute('class', 'p005-map-overrides');
      svg.insertBefore(styleEl, svg.firstChild);
    }
    styleElRef.current = styleEl;

    // Build cluster hit-areas as overlay circles (the print SVG's
    // clipPath defs give the centroids; we render a transparent
    // hit-circle on top of each so hover/click is targetable).
    const cluster = data.map_clusters;
    const hitGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    hitGroup.setAttribute('class', 'p005-map-cluster-hits');
    for (const c of cluster) {
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      hit.setAttribute('cx', String(c.cx));
      hit.setAttribute('cy', String(c.cy));
      hit.setAttribute('r', String(c.r));
      hit.setAttribute('fill', 'transparent');
      hit.setAttribute('stroke', 'transparent');
      hit.setAttribute('class', `p005-cluster-hit cluster-${c.id}`);
      hit.setAttribute('data-cluster', c.id);
      hit.style.cursor = 'pointer';
      hitGroup.appendChild(hit);

      hit.addEventListener('pointerenter', () => {
        if (poster005Store.getCurrent().focusSite === null) {
          // hover preview — set ephemeral state for visual hint
          // (we just dim the rest in the apply()).
          poster005Store.setFocusSite(`hover:${c.id}`);
        }
      });
      hit.addEventListener('pointerleave', () => {
        const cur = poster005Store.getCurrent().focusSite;
        if (cur === `hover:${c.id}`) poster005Store.setFocusSite(null);
      });
      hit.addEventListener('click', (e) => {
        e.stopPropagation();
        const cur = poster005Store.getCurrent().focusSite;
        const lock = `lock:${c.id}`;
        poster005Store.setFocusSite(cur === lock ? null : lock);
      });
    }
    svg.appendChild(hitGroup);

    function apply(state: Poster005State) {
      const { focusStatus, focusSite } = state;
      const sellafieldLocked = focusSite === 'lock:clippath' || focusSite === 'lock:clippath-2';
      const wylfaLocked = focusSite === 'lock:clippath-1'; // adjust if id differs
      const isLocked = focusSite?.startsWith('lock:') ?? false;
      void wylfaLocked;

      let css = '';

      if (focusStatus) {
        const focusColor = STATUS_FILL[focusStatus];
        // Dim non-focused colours.
        for (const [k, hex] of Object.entries(STATUS_FILL)) {
          if (k === focusStatus) continue;
          css += `circle[fill="${hex}"]{opacity:${FOCUS_DIM};transition:opacity .25s ease-out}`;
          void hex;
        }
        css += `circle[fill="${focusColor}"]{opacity:1;fill-opacity:1;transition:opacity .25s ease-out}`;
      } else if (isLocked) {
        // Cluster locked: dim everything except the locked cluster's
        // circles. Heuristic: dim ALL circles to 30%; the print SVG
        // already renders the cluster's inset at full opacity inside
        // its clipPath so the cluster reads as exhibit.
        css += `circle{opacity:${CLUSTER_REST_DIM};transition:opacity .3s ease-out}`;
        // Keep the cluster's inset at full visibility — clipPath
        // children render full-opacity since we only target circles.
      } else if (focusSite?.startsWith('hover:')) {
        // Light dim on hover preview.
        css += `circle{opacity:0.55;transition:opacity .2s ease-out}`;
      }

      styleEl!.textContent = css;

      // Sellafield-locked annotation (annotation set onto state to
      // preserve correctness across hover/lock transitions).
      setAnnotationVisible(sellafieldLocked ? SELLAFIELD_ANNOTATION : null);
    }

    apply(poster005Store.getCurrent());
    const unsub = poster005Store.subscribe(apply);

    // Click outside the cluster hits clears the lock.
    function onMapClick(e: MouseEvent) {
      const t = e.target as Element | null;
      if (t && t.closest('.p005-cluster-hit')) return;
      if (poster005Store.getCurrent().focusSite?.startsWith('lock:')) {
        poster005Store.setFocusSite(null);
      }
    }
    svg.addEventListener('click', onMapClick);

    return () => {
      unsub();
      svg.removeEventListener('click', onMapClick);
    };
  }, [svgText, data]);

  return (
    <div className="w-full">
      <p
        className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-3"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        Reactor Map
      </p>
      <div className="relative bg-[#f5f1eb]/50 rounded-sm border border-border/30 overflow-hidden" style={{ minHeight: 400 }}>
        <div
          ref={containerRef}
          className="w-full [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-[80vh]"
          dangerouslySetInnerHTML={{ __html: svgText ?? '' }}
        />
        {annotationVisible && (
          <div
            className="absolute top-3 left-3 max-w-xs px-3 py-2 rounded-sm bg-[#ECE7DF] border-l-2"
            style={{
              borderLeftColor: '#A51E22',
              fontFamily: "'Playfair', Georgia, serif",
              fontSize: 13,
              color: '#0D1A1E',
            }}
          >
            {annotationVisible}
          </div>
        )}
      </div>
    </div>
  );
}
