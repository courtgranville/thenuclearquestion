// ─────────────────────────────────────────────────────────────────
// Poster005Dendrogram.tsx — status dendrogram with canvas hub forms
// + pulse cascade.
//
// Architecture:
//
//   ┌─────────────────────────────────────────────────────────────┐
//   │ Container (relative)                                        │
//   │  ┌───────────────────────────────────────────────────────┐  │
//   │  │ <canvas>  ← hub forms (motion pipeline + pulses)      │  │
//   │  └───────────────────────────────────────────────────────┘  │
//   │  ┌───────────────────────────────────────────────────────┐  │
//   │  │ Injected SVG (hub polylines stripped):                │  │
//   │  │  - status labels                                      │  │
//   │  │  - connector Béziers (hub→leaf)                       │  │
//   │  │  - leaf circles (stamped with data-unit)              │  │
//   │  │  - timeline strip                                     │  │
//   │  └───────────────────────────────────────────────────────┘  │
//   └─────────────────────────────────────────────────────────────┘
//
// The canvas and the SVG share the same viewBox (after cropping) and
// the same on-screen rect, so SVG-unit coordinates draw natively to
// canvas pixels via a single transform matrix.
//
// Hub forms: 4 status blobs at y≈340–470, each composed of 256
// polylines. Rendered via the poster-001 motion pipeline:
// alpha-bucketed batch stroking, depth-weighted flow displacement,
// silhouette occlusion via outline lines (path === null vs Path2D).
//
// Pulse cascade: pointerenter on a hub region fires a chain of
// pulses, one per leaf circle of that status. Each pulse traverses
// a cubic-Bézier path from hub anchor → leaf, drawn frame-by-frame
// with the poster-004 pulse rendering primitives (warm-yellow glow,
// white-hot core, bright bulge). Pulses launch at staggered times
// so they fan out and absorb into their respective leaves at
// approximately the same moment.
//
// Hub physical pulse: on hover the hub form briefly scales 1.0 →
// 1.08 → 1.0 over ~360ms (poster 004's HUB_PHYSICAL_PULSE_MS).
// Implemented as a scalar applied to the canvas transform around
// the hub centroid before drawing that hub's polylines.
//
// Hover wiring:
//   - leaf circles: cross-view brushing into poster005Store
//   - hub regions: pointerenter on the canvas tests bbox containment
//     and fires the cascade
//
// CSS classes drive leaf focus / dim (transform: scale + opacity).
// ─────────────────────────────────────────────────────────────────

import { memo, useEffect, useRef, useState } from 'react';
import {
  REACTORS,
  REACTOR_BY_ID,
  STATUS_COLOUR,
  STATUS_LABEL,
  STATUS_TOTALS,
  type ReactorStatus,
} from '@/lib/poster005Data';
import { poster005Store } from '@/lib/poster005Store';
import { HUBS, HUB_BY_STATUS, LEAVES_BY_STATUS, TUNING } from '@/lib/poster005Hubs';
import {
  PULSE_BULGE_COLOR,
  PULSE_BULGE_HALF_LEN,
  PULSE_BULGE_WIDTH,
  PULSE_CORE_COLOR,
  PULSE_CORE_RADIUS,
  PULSE_GLOW_COLOR,
  PULSE_GLOW_EDGE_COLOR,
  PULSE_GLOW_MID_COLOR,
  PULSE_GLOW_RADIUS,
  HUB_PHYSICAL_PULSE_MS,
  HUB_PULSE_PEAK_SCALE,
  PULSE_TRAVEL_SPEED_PX_PER_MS,
} from '@/lib/poster004Engine';

const DENDRO_URL = '/assets/005-dendrogram-clean_336edeac.svg';

// The dendrogram SVG's full viewBox is 1694.98 × 1330.76 (Illustrator
// default). After cropping we use:
//   x: 0 → 1694.98
//   y: 305 → 825      (height = 520)
const VIEW_X = 0;
const VIEW_Y = 305;
const VIEW_W = 1694.98;
const VIEW_H = 520;

// Hub-region clip — used by the canvas to know where it's drawing.
// Hubs sit at y≈340-470 in the source SVG; leaves at y≈800.993.
// We let the canvas cover the full cropped viewBox so leaf-bound
// pulse trails are continuous.

// Hub centroids resolve straight from HUBS[i].centroid. The hub's
// approximate radius for hit-testing is bbox half-extent.

const CSS_INJECTED_KEY = '__poster005_dendro_css_v2';

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
      transition: transform 140ms ease-out, opacity 160ms ease-out;
      cursor: pointer;
      will-change: transform, opacity;
    }
    .poster005-dendro circle[data-unit].is-focused {
      transform: scale(1.35);
    }
    .poster005-dendro circle[data-unit].is-dimmed {
      opacity: 0.12;
    }
    .poster005-dendro g[id^="row-"] {
      transition: opacity 160ms ease-out;
    }
    .poster005-dendro g[id^="row-"].is-dimmed {
      opacity: 0.12;
    }
    /* Hub canvas hover area — invisible rect inside the SVG layer
       wouldn't be needed if pointer events on canvas worked across
       layers; we use a sibling overlay div for hub hit-testing. */
  `;
  document.head.appendChild(style);
}

const InjectedDendro = memo(function InjectedDendro({ markup }: { markup: string }) {
  return (
    <div
      className="w-full"
      dangerouslySetInnerHTML={{ __html: markup }}
      style={{ pointerEvents: 'auto' }}
    />
  );
});

// ─── Pulse cascade ────────────────────────────────────────────────

interface Pulse {
  // Cubic Bézier control points from origin (hub anchor) to dest (leaf)
  ox: number; oy: number;
  c1x: number; c1y: number;
  c2x: number; c2y: number;
  dx: number; dy: number;
  // Travel time, computed from straight-line distance
  travelMs: number;
  startedAt: number;
  reactorId: string;
  colour: string;
}

interface HubPulseFx {
  status: ReactorStatus;
  startedAt: number;
}

function cubicPoint(
  t: number,
  ox: number, oy: number,
  c1x: number, c1y: number,
  c2x: number, c2y: number,
  dx: number, dy: number,
): { x: number; y: number; tx: number; ty: number } {
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;
  const x = b0 * ox + b1 * c1x + b2 * c2x + b3 * dx;
  const y = b0 * oy + b1 * c1y + b2 * c2y + b3 * dy;
  // Tangent = derivative
  const d0 = 3 * u * u;
  const d1 = 6 * u * t;
  const d2 = 3 * t * t;
  const tx = d0 * (c1x - ox) + d1 * (c2x - c1x) + d2 * (dx - c2x);
  const ty = d0 * (c1y - oy) + d1 * (c2y - c1y) + d2 * (dy - c2y);
  return { x, y, tx, ty };
}

function buildPulsesForHub(status: ReactorStatus, now: number, hubColour: string): Pulse[] {
  const hub = HUB_BY_STATUS[status];
  const leaves = LEAVES_BY_STATUS[status];
  if (!hub || !leaves.length) return [];
  const [hx, hyTop] = hub.anchor;
  // Use the hub's bottom-of-bbox as the pulse origin so the pulse
  // visibly emerges from the hub form rather than its centroid.
  const hy = Math.max(hyTop, hub.bbox.maxY);

  const pulses: Pulse[] = [];
  // Stagger pulses so they fan out — first pulse at t=0, last at t=180ms.
  const STAGGER_TOTAL_MS = 220;
  const n = leaves.length;
  leaves.forEach((leaf, i) => {
    const stagger = n > 1 ? (i / (n - 1)) * STAGGER_TOTAL_MS : 0;
    // Curve: pull control points so the pulse arcs gracefully out.
    // c1 is just below the hub anchor (pushed sideways toward the leaf),
    // c2 is just above the leaf (pushed back toward the hub centre).
    const midX = (hx + leaf.x) * 0.5;
    const sideX = midX + (leaf.x - hx) * 0.15;
    const c1y = hy + (leaf.y - hy) * 0.35;
    const c2y = hy + (leaf.y - hy) * 0.65;
    const dx = Math.hypot(leaf.x - hx, leaf.y - hy);
    const travelMs = Math.max(220, dx / PULSE_TRAVEL_SPEED_PX_PER_MS);
    pulses.push({
      ox: hx,
      oy: hy,
      c1x: sideX,
      c1y,
      c2x: leaf.x,
      c2y,
      dx: leaf.x,
      dy: leaf.y,
      travelMs,
      startedAt: now + stagger,
      reactorId: leaf.reactorId,
      colour: hubColour,
    });
  });
  return pulses;
}

// ─── Component ────────────────────────────────────────────────────

interface HubHoverState {
  status: ReactorStatus | null;
  // Mouse-relative position inside the canvas in SVG units. Drives
  // the canvas hub's tiny scale-up (a visual confirmation independent
  // of the timed physical pulse).
  px: number; py: number;
}

export default function Poster005Dendrogram() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  // Live refs that the RAF loop reads without restarting.
  const pulsesRef = useRef<Pulse[]>([]);
  const hubPulsesRef = useRef<HubPulseFx[]>([]);
  const hoverHubRef = useRef<HubHoverState>({ status: null, px: 0, py: 0 });
  const filteredStatusRef = useRef<ReactorStatus | null>(null);

  useEffect(() => { injectStyleOnce(); }, []);

  // Fetch + strip hub polylines from the source SVG.
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
          // Crop to the dendrogram region (hub labels + hubs + connectors
          // + leaves) — same as before, status labels included at y=313.
          svg.setAttribute('viewBox', `${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`);
          svg.setAttribute('width', '100%');
          svg.removeAttribute('height');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          svg.setAttribute(
            'style',
            'display:block;width:100%;height:auto;position:relative;z-index:2;',
          );

          // Strip the hub polylines — anything with stroke matching the
          // 4 status hub-stroke colours (note: SVG uses the OLD hex
          // values #a51e23 / #7d746a / #237c3e — we now render via
          // canvas with the canonical map fill values).
          const HUB_STROKES = new Set([
            '#a51e23',
            '#7d746a',
            '#237c3e',
            '#b4822e',
            // Defensive: also catch any whitespace / case variation.
          ]);
          svg.querySelectorAll('polyline').forEach((p) => {
            const stroke = (p.getAttribute('stroke') ?? '').trim().toLowerCase();
            if (HUB_STROKES.has(stroke)) p.remove();
          });
        }
        setSvgMarkup(new XMLSerializer().serializeToString(svg ?? doc.documentElement));
      }
    };
    xhr.send();
    return () => { cancelled = true; };
  }, []);

  // Stamp data-unit / data-phase on leaf circles after injection.
  useEffect(() => {
    if (!svgMarkup) return;
    const container = containerRef.current;
    if (!container) return;
    // Build cx → reactor lookup.
    const sorted = [...REACTORS].sort((a, b) => a.timelineColumnX - b.timelineColumnX);
    const matcher = (cx: number) => {
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
      return best && bestDist <= 2 ? best : null;
    };

    const circles = container.querySelectorAll<SVGCircleElement>('svg circle');
    let stamped = 0;
    circles.forEach((c) => {
      const cy = parseFloat(c.getAttribute('cy') ?? '0');
      if (Math.abs(cy - 800.993) > 0.5) return;
      if (c.closest('g[id^="row-"]')) return;
      const cx = parseFloat(c.getAttribute('cx') ?? '0');
      const reactor = matcher(cx);
      if (!reactor) return;
      c.setAttribute('data-unit', reactor.id);
      c.setAttribute('data-phase', reactor.status);
      stamped++;
    });
    if (import.meta.env.DEV && stamped < 60) {
      console.warn(`[Poster005Dendrogram] only stamped ${stamped} leaf circles (expected ~72)`);
    }
  }, [svgMarkup]);

  // Container-delegated hover handlers for LEAVES (cross-view brushing).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const findLeaf = (el: Element | null): SVGCircleElement | null => {
      let cur: Element | null = el;
      while (cur && cur !== container) {
        if (cur instanceof SVGCircleElement && cur.getAttribute('data-unit')) return cur;
        if (cur instanceof SVGGElement && /^row-\d+$/.test(cur.id ?? '')) {
          // Row groups in the timeline strip share the dendrogram SVG.
          // Find the data-unit via REACTORS.rowId.
          const r = REACTORS.find((x) => x.rowId === cur!.id);
          return r ? (cur as unknown as SVGCircleElement) : null;
        }
        cur = cur.parentElement;
      }
      return null;
    };

    const onOver = (e: PointerEvent) => {
      const t = findLeaf(e.target as Element);
      if (!t) return;
      let id: string | null = null;
      if (t instanceof SVGCircleElement) {
        id = t.getAttribute('data-unit');
      } else {
        // SVGGElement row case
        const g = t as unknown as SVGGElement;
        const r = REACTORS.find((x) => x.rowId === g.id);
        id = r?.id ?? null;
      }
      if (id) poster005Store.setHoveredReactor(id);
    };
    const onOut = (e: PointerEvent) => {
      const t = findLeaf(e.target as Element);
      if (!t) return;
      const next = findLeaf(e.relatedTarget as Element);
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

  // Store subscription → apply leaf classes.
  useEffect(() => {
    if (!svgMarkup) return;
    const container = containerRef.current;
    if (!container) return;
    const apply = (filteredStatus: ReactorStatus | null, hoveredId: string | null) => {
      filteredStatusRef.current = filteredStatus;
      const hoveredR = hoveredId ? REACTOR_BY_ID[hoveredId] : null;
      const leaves = container.querySelectorAll<SVGCircleElement>('circle[data-unit]');
      leaves.forEach((c) => {
        const id = c.getAttribute('data-unit') ?? '';
        const r = REACTOR_BY_ID[id];
        if (!r) return;
        const matchesHover = hoveredR ? hoveredR.id === id : false;
        const matchesFilter = filteredStatus === null || r.status === filteredStatus;
        const isFocused = matchesHover;
        const isDimmed = hoveredR ? !matchesHover : (filteredStatus !== null && !matchesFilter);
        c.classList.toggle('is-focused', isFocused);
        c.classList.toggle('is-dimmed', isDimmed);
      });
      // Row groups in the dendrogram strip (the timeline area at y=820+)
      // mirror dim only — no focus state.
      const rows = container.querySelectorAll<SVGGElement>('g[id^="row-"]');
      rows.forEach((g) => {
        const r = REACTORS.find((x) => x.rowId === g.id);
        if (!r) return;
        const matchesHover = hoveredR ? hoveredR.id === r.id : false;
        const matchesFilter = filteredStatus === null || r.status === filteredStatus;
        const isDimmed = hoveredR ? !matchesHover : (filteredStatus !== null && !matchesFilter);
        g.classList.toggle('is-dimmed', isDimmed);
      });
    };
    const initial = poster005Store.getCurrent();
    apply(initial.filteredStatus, initial.hoveredReactor);
    return poster005Store.subscribe((s) => apply(s.filteredStatus, s.hoveredReactor));
  }, [svgMarkup]);

  // Canvas RAF loop — draws the four hub forms with motion pipeline
  // + active pulses + hub physical-pulse scaling.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const r = container.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      canvas.width = Math.max(1, Math.floor(cssW * DPR));
      canvas.height = Math.max(1, Math.floor(cssH * DPR));
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const t0 = performance.now();
    let rafId = 0;

    const frame = (now: number) => {
      const t = (now - t0) / 1000;

      // Identity then set transform mapping SVG units → canvas pixels.
      // SVG viewBox is (VIEW_X, VIEW_Y, VIEW_W, VIEW_H). The visible
      // SVG renders at fit-to-width inside the container, so the same
      // mapping applies to the canvas: scale by (canvasW / VIEW_W)
      // and offset by (-VIEW_X * scale, -VIEW_Y * scale).
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      const scale = (cssW / VIEW_W) * DPR;
      const offsetX = -VIEW_X * scale;
      const offsetY = -VIEW_Y * scale;

      const filteredStatus = filteredStatusRef.current;
      const hoverHub = hoverHubRef.current;

      const k1 = TUNING.flowK1;
      const w1 = TUNING.flowW1;
      const k2 = TUNING.flowK2;
      const w2 = TUNING.flowW2;
      const a2w = TUNING.flowAmp2Weight;

      const NUM_BUCKETS = 8;

      // ── Hub forms ───────────────────────────────────────────────
      for (const hub of HUBS) {
        const isFiltered = filteredStatus !== null && filteredStatus !== hub.status;
        const isHovered = hoverHub.status === hub.status;
        const baseAlpha = isFiltered ? 0.06 : (isHovered || filteredStatus === hub.status ? 1 : 0.85);

        // Hub physical pulse: animate scale around centroid.
        let physScale = 1;
        const pulse = hubPulsesRef.current.find((p) => p.status === hub.status);
        if (pulse) {
          const dt = now - pulse.startedAt;
          if (dt < HUB_PHYSICAL_PULSE_MS) {
            const u = dt / HUB_PHYSICAL_PULSE_MS;
            // Up then back down using a sine ease.
            const e = Math.sin(u * Math.PI);
            physScale = 1 + (HUB_PULSE_PEAK_SCALE - 1) * e;
          }
        }

        ctx.save();
        // Compose: canvas-pixels = (svgUnits × scale) + offset
        ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
        // Then apply physical pulse around centroid:
        const [cx, cy] = hub.centroid;
        ctx.translate(cx, cy);
        ctx.scale(physScale, physScale);
        ctx.translate(-cx, -cy);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = hub.colour;
        ctx.lineWidth = 0.4;

        const flowAmp = hub.flowAmp;
        const N = hub.lines.length;
        const t1off = w1 * t;
        const t1offY = w1 * t * 1.3;
        const t2off = w2 * t * 1.7;
        const t2offY = w2 * t * 0.7;

        for (let bucket = 0; bucket < NUM_BUCKETS; bucket++) {
          const bucketDepthMid = (bucket + 0.5) / NUM_BUCKETS;
          ctx.globalAlpha = baseAlpha * (0.55 + 0.45 * (1 - bucketDepthMid));
          ctx.beginPath();
          for (let li = 0; li < N; li++) {
            const line = hub.lines[li];
            const lineBucket = Math.min(NUM_BUCKETS - 1, Math.floor(line.depth * NUM_BUCKETS));
            if (lineBucket !== bucket) continue;

            if (line.path !== null) {
              const pts = line.pts;
              const n = line.n;
              if (n < 2) continue;
              ctx.moveTo(pts[0], pts[1]);
              for (let kk = 1; kk < n; kk++) {
                ctx.lineTo(pts[kk * 2], pts[kk * 2 + 1]);
              }
              continue;
            }

            const pts = line.pts;
            const n = line.n;
            if (n < 2) continue;
            const a = flowAmp * line.dw;
            {
              const x = pts[0];
              const y = pts[1];
              const ax1 = k1 * x + t1off;
              const ay1 = k1 * y + t1offY;
              const ax2 = k2 * x + t2off;
              const ay2 = k2 * y + t2offY;
              const dx =
                Math.sin(ax1) * Math.cos(ay1) +
                a2w * Math.sin(ax2) * Math.cos(ay2);
              const dy =
                -Math.cos(ax1) * Math.sin(ay1) -
                a2w * Math.cos(ax2) * Math.sin(ay2);
              ctx.moveTo(x + a * dx, y + a * dy);
            }
            for (let kk = 1; kk < n; kk++) {
              const x = pts[kk * 2];
              const y = pts[kk * 2 + 1];
              const ax1 = k1 * x + t1off;
              const ay1 = k1 * y + t1offY;
              const ax2 = k2 * x + t2off;
              const ay2 = k2 * y + t2offY;
              const dx =
                Math.sin(ax1) * Math.cos(ay1) +
                a2w * Math.sin(ax2) * Math.cos(ay2);
              const dy =
                -Math.cos(ax1) * Math.sin(ay1) -
                a2w * Math.cos(ax2) * Math.sin(ay2);
              ctx.lineTo(x + a * dx, y + a * dy);
            }
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Pulses ──────────────────────────────────────────────────
      const livePulses: Pulse[] = [];
      for (const p of pulsesRef.current) {
        const dt = now - p.startedAt;
        if (dt < 0) { livePulses.push(p); continue; }
        const u = dt / p.travelMs;
        if (u >= 1) {
          // Absorb flash at the destination, then drop.
          // Implemented as a brief radial flash in the next frame's
          // path — for simplicity we render it inline if u in (1, 1.1).
          if (u < 1.1) livePulses.push(p);
          continue;
        }
        const pt = cubicPoint(u, p.ox, p.oy, p.c1x, p.c1y, p.c2x, p.c2y, p.dx, p.dy);

        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

        // Glow
        const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, PULSE_GLOW_RADIUS);
        glow.addColorStop(0, PULSE_GLOW_COLOR);
        glow.addColorStop(0.4, PULSE_GLOW_MID_COLOR);
        glow.addColorStop(1, PULSE_GLOW_EDGE_COLOR);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, PULSE_GLOW_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = PULSE_CORE_COLOR;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, PULSE_CORE_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Bulge — short streak along the tangent direction
        const tlen = Math.hypot(pt.tx, pt.ty) || 1;
        const ux = pt.tx / tlen;
        const uy = pt.ty / tlen;
        const halfLen = PULSE_BULGE_HALF_LEN;
        ctx.strokeStyle = PULSE_BULGE_COLOR;
        ctx.lineWidth = PULSE_BULGE_WIDTH;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pt.x - ux * halfLen, pt.y - uy * halfLen);
        ctx.lineTo(pt.x + ux * halfLen, pt.y + uy * halfLen);
        ctx.stroke();

        ctx.restore();
        livePulses.push(p);
      }
      // Trim absorbed pulses.
      pulsesRef.current = livePulses;

      // Trim expired hub physical pulses.
      hubPulsesRef.current = hubPulsesRef.current.filter(
        (p) => now - p.startedAt < HUB_PHYSICAL_PULSE_MS,
      );

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  // Hub hit-testing overlay — a transparent <div> with absolute-
  // positioned hot-zones for the four hubs. Each hot-zone fires
  // pointerenter → start cascade for that status.
  // Positions: hub bbox in SVG units → percent of container.
  const hotZones = HUBS.map((hub) => {
    const left = ((hub.bbox.minX - VIEW_X) / VIEW_W) * 100;
    const top = ((hub.bbox.minY - VIEW_Y) / VIEW_H) * 100;
    const width = ((hub.bbox.maxX - hub.bbox.minX) / VIEW_W) * 100;
    const height = ((hub.bbox.maxY - hub.bbox.minY) / VIEW_H) * 100;
    return {
      status: hub.status,
      style: {
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
      } as React.CSSProperties,
    };
  });

  const onHubEnter = (status: ReactorStatus) => {
    hoverHubRef.current = { status, px: 0, py: 0 };
    const now = performance.now();
    const colour = STATUS_COLOUR[status];
    pulsesRef.current = pulsesRef.current.concat(buildPulsesForHub(status, now, colour));
    hubPulsesRef.current = hubPulsesRef.current.concat([{ status, startedAt: now }]);
  };
  const onHubLeave = (status: ReactorStatus) => {
    if (hoverHubRef.current.status === status) {
      hoverHubRef.current = { status: null, px: 0, py: 0 };
    }
  };
  const onHubClick = (status: ReactorStatus) => {
    poster005Store.toggleFilteredStatus(status);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8">
      <div
        ref={containerRef}
        className="poster005-dendro relative w-full mx-auto"
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      >
        {/* Canvas — drawn first so SVG hub-stripped overlay sits on top
            for leaf hit-testing. */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
          style={{ zIndex: 1, pointerEvents: 'none' }}
        />
        {svgMarkup && (
          <div className="absolute inset-0 w-full h-full" style={{ zIndex: 2 }}>
            <InjectedDendro markup={svgMarkup} />
          </div>
        )}
        {/* Hub hit-zones — invisible, above everything, fire cascade
            on enter. Click toggles the filter for that status. */}
        <div className="absolute inset-0" style={{ zIndex: 3, pointerEvents: 'none' }}>
          {hotZones.map(({ status, style }) => (
            <div
              key={status}
              role="button"
              aria-label={`Trigger pulse cascade for ${STATUS_LABEL[status]} reactors (${STATUS_TOTALS[status].count} reactors, ${STATUS_TOTALS[status].mw.toLocaleString()} MW)`}
              tabIndex={0}
              onPointerEnter={() => onHubEnter(status)}
              onPointerLeave={() => onHubLeave(status)}
              onClick={() => onHubClick(status)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onHubClick(status);
              }}
              className="absolute cursor-pointer"
              style={{ ...style, pointerEvents: 'auto' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
