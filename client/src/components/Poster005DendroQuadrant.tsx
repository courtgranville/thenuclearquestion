// ─────────────────────────────────────────────────────────────────
// Poster005DendroQuadrant.tsx — one status's slice of the dendrogram.
//
// Court asked for a 2x2 grid layout (under-construction TL, retired
// TR, operating BL, cancelled BR) so the hub forms can scale up to
// the same resolution as poster 001 / 002 / 006 / the homepage,
// instead of all four sharing one cramped horizontal row.
//
// Each quadrant fetches the source SVG, strips:
//   - all hub-form polylines (canvas owns the visual)
//   - the row-* groups (the timeline strip lives in Poster005Timeline)
//   - leaf circles for the other three statuses
//   - level-1 connectors not originating from THIS status's hub
//   - level-2 connectors not ending at one of THIS status's leaves
// then sets a tight viewBox around just the kept geometry.
//
// A canvas overlay renders only this status's hub form with the
// poster-001 motion pipeline + the poster-004 pulse primitives.
// Pulses fire on pointerenter and traverse the actual SVG paths
// (via lib/poster005Connectors). Leaf circles in the injected SVG
// stay interactive for cross-view brushing via poster005Store.
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
import {
  HUB_BY_STATUS,
  LEAVES_BY_STATUS,
  TUNING,
  type PreparedHub,
} from '@/lib/poster005Hubs';
import {
  TRAJECTORY_BY_REACTOR,
  trajectoryPoint,
  type Trajectory,
} from '@/lib/poster005Connectors';
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
  PULSE_LAUNCH_AT_MS,
  PULSE_TRAVEL_SPEED_PX_PER_MS,
} from '@/lib/poster004Engine';

const DENDRO_URL = '/assets/005-dendrogram-clean_336edeac.svg';

// SVG-unit y range to include per quadrant. Top is just above the
// status label (y≈313), bottom is just below the leaf row (y=800.993).
const QUAD_VIEW_Y_TOP = 305;
const QUAD_VIEW_Y_BOTTOM = 815;

// CSS class registry — one keyed style per quadrant.
const CSS_INJECTED_KEY = '__poster005_quadrant_css_v1';

function injectStyleOnce() {
  if (typeof document === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any)[CSS_INJECTED_KEY]) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any)[CSS_INJECTED_KEY] = true;
  const style = document.createElement('style');
  style.textContent = `
    .poster005-quadrant circle[data-unit] {
      transform-box: fill-box;
      transform-origin: center;
      transition: transform 140ms ease-out, opacity 160ms ease-out;
      cursor: pointer;
      will-change: transform, opacity;
    }
    .poster005-quadrant circle[data-unit].is-focused {
      transform: scale(1.5);
    }
    .poster005-quadrant circle[data-unit].is-dimmed {
      opacity: 0.06;
    }
    .poster005-quadrant[data-any-hover="true"] svg path,
    .poster005-quadrant[data-any-hover="true"] svg text,
    .poster005-quadrant[data-any-hover="true"] svg line {
      opacity: 0.06;
      transition: opacity 160ms ease-out;
    }
    .poster005-quadrant[data-other-filter="true"] {
      opacity: 0.25;
      transition: opacity 200ms ease-out;
    }
    .poster005-quadrant.is-this-filter {
      transition: opacity 200ms ease-out;
    }
  `;
  document.head.appendChild(style);
}

const InjectedSvg = memo(function InjectedSvg({ markup }: { markup: string }) {
  return (
    <div
      className="w-full h-full"
      dangerouslySetInnerHTML={{ __html: markup }}
      style={{ pointerEvents: 'auto' }}
    />
  );
});

interface Pulse {
  traj: Trajectory;
  startedAt: number;
  travelMs: number;
}

interface HubPulseFx {
  startedAt: number;
}

function buildPulses(status: ReactorStatus, now: number): Pulse[] {
  const leaves = LEAVES_BY_STATUS[status];
  const pulses: Pulse[] = [];
  const launchAt = now + PULSE_LAUNCH_AT_MS;
  for (const leaf of leaves) {
    const traj = TRAJECTORY_BY_REACTOR.get(leaf.reactorId);
    if (!traj) continue;
    const travelMs = traj.totalLen / PULSE_TRAVEL_SPEED_PX_PER_MS;
    pulses.push({ traj, startedAt: launchAt, travelMs });
  }
  return pulses;
}

// ─── Component ────────────────────────────────────────────────────

interface QuadrantProps {
  status: ReactorStatus;
}

export default function Poster005DendroQuadrant({ status }: QuadrantProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  // Tight viewBox computed at SVG-strip time so the canvas + SVG
  // share the same coordinate window.
  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const pulsesRef = useRef<Pulse[]>([]);
  const hubPulseRef = useRef<HubPulseFx | null>(null);
  const isHubHoveredRef = useRef<boolean>(false);
  const filteredStatusRef = useRef<ReactorStatus | null>(null);
  const hoveredReactorRef = useRef<{ id: string; status: ReactorStatus } | null>(null);

  useEffect(() => { injectStyleOnce(); }, []);

  // Fetch + filter the source SVG to just this status's geometry.
  useEffect(() => {
    let cancelled = false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', DENDRO_URL, true);
    xhr.responseType = 'text';
    xhr.onload = () => {
      if (cancelled) return;
      if (xhr.status < 200 || xhr.status >= 300) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(xhr.responseText, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return;

      const hub = HUB_BY_STATUS[status];
      if (!hub) return;
      const hubAnchor = hub.anchor;
      const myLeaves = new Set(LEAVES_BY_STATUS[status].map((l) => l.reactorId));
      const myLeafXs = LEAVES_BY_STATUS[status].map((l) => l.x);

      // Strip every hub-form polyline (we'll redraw on canvas).
      svg.querySelectorAll('polyline').forEach((p) => p.remove());

      // Strip every row-* group (the timeline strip is its own component).
      svg.querySelectorAll('g[id^="row-"]').forEach((g) => g.remove());

      // Connectors: remove those that don't belong to this status.
      // A level-1 connector starts at one of the 4 hub anchors at y=422.
      // A level-2 connector starts at a sub-hub at y=594.
      // We keep level-1 paths whose start == this hub's anchor, and
      // level-2 paths whose end is a leaf x for this status.
      const ANCHOR_X = hubAnchor[0];
      const ANCHOR_Y = hubAnchor[1];
      const subHubXs = new Set<number>();   // populated below from kept level-1s
      svg.querySelectorAll('path').forEach((p) => {
        const d = p.getAttribute('d') ?? '';
        const m = /^M([\d.\-]+),([\d.\-]+)c/.exec(d.trim());
        if (!m) {
          // Not a cubic Bézier connector — keep (could be something else).
          return;
        }
        const sx = parseFloat(m[1]);
        const sy = parseFloat(m[2]);
        // Compute end: c relative cubic Bézier. d-string is "Mx,y c c1x,c1y c2x,c2y ex,ey"
        const tail = d.substring(m[0].length).split(/[, ]+/).map(parseFloat).filter((n) => !isNaN(n));
        if (tail.length < 6) { p.remove(); return; }
        const ex = sx + tail[4];
        const ey = sy + tail[5];

        const isLevel1 = Math.abs(sy - 422.366) < 1;
        const isLevel2 = Math.abs(sy - 594.329) < 1;

        if (isLevel1) {
          // Keep if starts at this hub's anchor (allowing float drift).
          if (Math.abs(sx - ANCHOR_X) < 1 && Math.abs(sy - ANCHOR_Y) < 1) {
            subHubXs.add(Math.round(ex * 100) / 100);
          } else {
            p.remove();
          }
        } else if (isLevel2) {
          // Keep if the leaf-x matches one of our reactors.
          const matchesLeafX = myLeafXs.some((lx) => Math.abs(ex - lx) < 1.5);
          if (!matchesLeafX) p.remove();
        }
      });

      // Leaves: stamp data-unit, then remove leaves not for this status.
      const sorted = [...REACTORS].sort((a, b) => a.timelineColumnX - b.timelineColumnX);
      const matchCx = (cx: number): typeof REACTORS[0] | null => {
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
      svg.querySelectorAll('circle').forEach((c) => {
        const cy = parseFloat(c.getAttribute('cy') ?? '0');
        if (Math.abs(cy - 800.993) > 0.5) {
          c.remove();
          return;
        }
        const cx = parseFloat(c.getAttribute('cx') ?? '0');
        const reactor = matchCx(cx);
        if (!reactor) {
          c.remove();
          return;
        }
        if (!myLeaves.has(reactor.id)) {
          c.remove();
          return;
        }
        c.setAttribute('data-unit', reactor.id);
        c.setAttribute('data-phase', reactor.status);
      });

      // Status labels: the print bakes a label at y≈313-324 above
      // each hub. They're outlined path groups (not <text>). They
      // bleed between adjacent quadrants when the viewBox crop
      // includes their x range, and we already show a status label
      // in React above each quadrant — so strip everything in the
      // label band on every quadrant.
      // The labels are <g><path d="...">…</g> groups whose paths
      // start inside y=305-330. We walk every <g> and remove it if
      // any of its child paths has a starting y inside that band.
      svg.querySelectorAll('g').forEach((g) => {
        // Skip the root <svg>'s direct children that don't contain
        // labels (e.g., we still need <path> connector siblings).
        const paths = g.querySelectorAll('path');
        if (paths.length === 0) return;
        // Sample the first path's start point.
        const d = paths[0].getAttribute('d') ?? '';
        const m = /M([\d.\-]+),([\d.\-]+)/.exec(d);
        if (!m) return;
        const sy = parseFloat(m[2]);
        if (sy >= 305 && sy <= 332) {
          g.remove();
        }
      });

      // Compute the cropped viewBox: a small padding around the kept
      // content. X spans from min(hub bbox minX, leaf x minus padding)
      // to max(hub bbox maxX, leaf x plus padding).
      const padX = 16;
      const padY = 6;
      const allXs: number[] = [
        hub.bbox.minX,
        hub.bbox.maxX,
        ...myLeafXs,
      ];
      const xMin = Math.min(...allXs) - padX;
      const xMax = Math.max(...allXs) + padX;
      const yMin = QUAD_VIEW_Y_TOP - padY;
      const yMax = QUAD_VIEW_Y_BOTTOM + padY;

      svg.setAttribute('viewBox', `${xMin} ${yMin} ${xMax - xMin} ${yMax - yMin}`);
      svg.setAttribute('width', '100%');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute(
        'style',
        'display:block;width:100%;height:100%;position:absolute;inset:0;z-index:2;',
      );

      setViewBox({ x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin });
      setSvgMarkup(new XMLSerializer().serializeToString(svg));
    };
    xhr.send();
    return () => { cancelled = true; };
  }, [status]);

  // Hover wiring — leaves only. Hub hover comes from the dedicated
  // hot-zone <div> at the bottom of the JSX.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const findLeaf = (el: Element | null): SVGCircleElement | null => {
      let cur: Element | null = el;
      while (cur && cur !== container) {
        if (cur instanceof SVGCircleElement && cur.getAttribute('data-unit')) return cur;
        cur = cur.parentElement;
      }
      return null;
    };

    const onOver = (e: PointerEvent) => {
      const t = findLeaf(e.target as Element);
      if (!t) return;
      const id = t.getAttribute('data-unit');
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

  // Store subscription — apply leaf focus/dim classes + container
  // attributes for SVG-element dimming.
  useEffect(() => {
    if (!svgMarkup) return;
    const container = containerRef.current;
    if (!container) return;
    const apply = (filteredStatus: ReactorStatus | null, hoveredId: string | null) => {
      filteredStatusRef.current = filteredStatus;
      hoveredReactorRef.current = hoveredId ? REACTOR_BY_ID[hoveredId] ?? null : null;
      const hoveredR = hoveredReactorRef.current;
      container.setAttribute('data-any-hover', hoveredR ? 'true' : 'false');
      // Filter dim: if a status filter is active and it's NOT this
      // quadrant's status, dim this whole quadrant.
      container.setAttribute(
        'data-other-filter',
        filteredStatus !== null && filteredStatus !== status ? 'true' : 'false',
      );
      container.classList.toggle(
        'is-this-filter',
        filteredStatus === status,
      );
      const leaves = container.querySelectorAll<SVGCircleElement>('circle[data-unit]');
      leaves.forEach((c) => {
        const id = c.getAttribute('data-unit') ?? '';
        const matchesHover = hoveredR ? hoveredR.id === id : false;
        const isFocused = matchesHover;
        const isDimmed = hoveredR ? !matchesHover : false;
        c.classList.toggle('is-focused', isFocused);
        c.classList.toggle('is-dimmed', isDimmed);
      });
    };
    const initial = poster005Store.getCurrent();
    apply(initial.filteredStatus, initial.hoveredReactor);
    return poster005Store.subscribe((s) => apply(s.filteredStatus, s.hoveredReactor));
  }, [svgMarkup, status]);

  // Canvas RAF loop. Renders ONLY this status's hub + active pulses.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !viewBox) return;
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

    const hub: PreparedHub | undefined = HUB_BY_STATUS[status];
    if (!hub) return () => ro.disconnect();

    const t0 = performance.now();
    let rafId = 0;

    const frame = (now: number) => {
      const t = (now - t0) / 1000;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // SVG → canvas mapping using the cropped viewBox. preserveAspect-
      // Ratio = xMidYMid meet means we letter-box: scale = min(W/vw, H/vh)
      // and centre the content.
      const sx = cssW / viewBox.w;
      const sy = cssH / viewBox.h;
      const s = Math.min(sx, sy);
      const offsetX = (cssW - viewBox.w * s) / 2 - viewBox.x * s;
      const offsetY = (cssH - viewBox.h * s) / 2 - viewBox.y * s;
      const scale = s * DPR;
      const offX = offsetX * DPR;
      const offY = offsetY * DPR;

      const hoveredReactor = hoveredReactorRef.current;
      const filteredStatus = filteredStatusRef.current;

      // Hub base alpha:
      //  - filter on a different status → dim heavily
      //  - reactor hovered with status != this → dim heavily
      //  - reactor hovered with status == this → full
      //  - hub hovered → full
      //  - default → full (we have only ONE hub per quadrant; no
      //    need to dim "other" hubs)
      let baseAlpha = 1;
      if (filteredStatus !== null && filteredStatus !== status) {
        baseAlpha = 0.05;
      } else if (hoveredReactor && hoveredReactor.status !== status) {
        baseAlpha = 0.05;
      }

      // Hub physical pulse: animate scale around centroid.
      let physScale = 1;
      const pulse = hubPulseRef.current;
      if (pulse) {
        const dt = now - pulse.startedAt;
        if (dt < HUB_PHYSICAL_PULSE_MS) {
          const u = dt / HUB_PHYSICAL_PULSE_MS;
          const e = Math.sin(u * Math.PI);
          physScale = 1 + (HUB_PULSE_PEAK_SCALE - 1) * e;
        }
      }

      ctx.save();
      ctx.setTransform(scale, 0, 0, scale, offX, offY);
      const [cx, cy] = hub.centroid;
      ctx.translate(cx, cy);
      ctx.scale(physScale, physScale);
      ctx.translate(-cx, -cy);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = hub.colour;
      ctx.lineWidth = 0.4;

      const k1 = TUNING.flowK1, w1 = TUNING.flowW1;
      const k2 = TUNING.flowK2, w2 = TUNING.flowW2;
      const a2w = TUNING.flowAmp2Weight;
      const flowAmp = hub.flowAmp;
      const N = hub.lines.length;
      const t1off = w1 * t;
      const t1offY = w1 * t * 1.3;
      const t2off = w2 * t * 1.7;
      const t2offY = w2 * t * 0.7;
      const NUM_BUCKETS = 8;

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

      // Pulses
      const live: Pulse[] = [];
      for (const p of pulsesRef.current) {
        const dt = now - p.startedAt;
        if (dt < 0) { live.push(p); continue; }
        const u = dt / p.travelMs;
        if (u >= 1) continue;
        const pt = trajectoryPoint(p.traj, u);

        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, offX, offY);

        const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, PULSE_GLOW_RADIUS);
        glow.addColorStop(0, PULSE_GLOW_COLOR);
        glow.addColorStop(0.4, PULSE_GLOW_MID_COLOR);
        glow.addColorStop(1, PULSE_GLOW_EDGE_COLOR);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, PULSE_GLOW_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = PULSE_CORE_COLOR;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, PULSE_CORE_RADIUS, 0, Math.PI * 2);
        ctx.fill();

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
        live.push(p);
      }
      pulsesRef.current = live;
      if (hubPulseRef.current && now - hubPulseRef.current.startedAt >= HUB_PHYSICAL_PULSE_MS) {
        hubPulseRef.current = null;
      }

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [viewBox, status]);

  // Hub hot-zone enter handler.
  const onHubEnter = () => {
    if (isHubHoveredRef.current) return;
    isHubHoveredRef.current = true;
    const now = performance.now();
    pulsesRef.current = buildPulses(status, now);
    hubPulseRef.current = { startedAt: now };
  };
  const onHubLeave = () => {
    isHubHoveredRef.current = false;
  };
  const onHubClick = () => {
    poster005Store.toggleFilteredStatus(status);
  };

  // Compute hub hot-zone position as a % within the quadrant.
  const hubHotZone = (() => {
    if (!viewBox) return null;
    const hub = HUB_BY_STATUS[status];
    if (!hub) return null;
    const left = ((hub.bbox.minX - viewBox.x) / viewBox.w) * 100;
    const top = ((hub.bbox.minY - viewBox.y) / viewBox.h) * 100;
    const width = ((hub.bbox.maxX - hub.bbox.minX) / viewBox.w) * 100;
    const height = ((hub.bbox.maxY - hub.bbox.minY) / viewBox.h) * 100;
    return { left, top, width, height };
  })();

  const colour = STATUS_COLOUR[status];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Quadrant header — status label + count + MW total */}
      <div className="flex items-baseline gap-3 mb-1">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: colour }}
        />
        <span
          className="font-serif text-base sm:text-lg"
          style={{ color: colour, fontWeight: 600 }}
        >
          {STATUS_LABEL[status]}
        </span>
        <span
          className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
          style={{ fontFamily: "'Playfair', Georgia, serif" }}
        >
          {STATUS_TOTALS[status].count} reactors · {STATUS_TOTALS[status].mw.toLocaleString()} MW
        </span>
      </div>

      {/* Fixed quadrant height so the 2x2 grid reads as a balanced
          composition regardless of each status's content aspect.
          The SVG + canvas use preserveAspectRatio: xMidYMid meet to
          fit + centre inside this box. Half-viewport-height feels
          right: large enough to read the hub form's linework on a
          desktop, and pairs symmetrically with another row below. */}
      <div
        ref={containerRef}
        className="poster005-quadrant relative w-full"
        style={{
          height: 'min(46vh, 480px)',
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
          style={{ zIndex: 1, pointerEvents: 'none' }}
        />
        {svgMarkup && (
          <div className="absolute inset-0 w-full h-full" style={{ zIndex: 2 }}>
            <InjectedSvg markup={svgMarkup} />
          </div>
        )}
        {hubHotZone && (
          <div className="absolute inset-0" style={{ zIndex: 3, pointerEvents: 'none' }}>
            <div
              role="button"
              tabIndex={0}
              aria-label={`Pulse cascade for ${STATUS_LABEL[status]} reactors`}
              onPointerEnter={onHubEnter}
              onPointerLeave={onHubLeave}
              onClick={onHubClick}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onHubClick(); }}
              className="absolute cursor-pointer"
              style={{
                left: `${hubHotZone.left}%`,
                top: `${hubHotZone.top}%`,
                width: `${hubHotZone.width}%`,
                height: `${hubHotZone.height}%`,
                pointerEvents: 'auto',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
