// ─────────────────────────────────────────────────────────────────
// Poster005DendroQuadrant.tsx - one status's slice of the dendrogram.
//
// Court asked for a 2x2 grid layout (under-construction TL, retired
// TR, operating BL, cancelled BR) so the hub forms can scale up to
// the same resolution as poster 001 / 002 / 006 / the homepage,
// instead of all four sharing one cramped horizontal row.
//
// Each quadrant fetches the source SVG, strips:
// - all hub-form polylines (canvas owns the visual)
// - the row-* groups (the timeline strip lives in Poster005Timeline)
// - leaf circles for the other three statuses
// - level-1 connectors not originating from THIS status's hub
// - level-2 connectors not ending at one of THIS status's leaves
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
import { fitCanvasToDpr } from '@/lib/canvasUtils';

const DENDRO_URL = '/assets/005-dendrogram-clean_336edeac.svg';

// Actual connector-anchor positions from the source SVG (where the
// level-1 cubic Béziers START - i.e. y=422.366, x depends on hub).
// These differ slightly from HUBS[*].anchor in the JSON (which is
// the BBOX centroid at y≈405). We need the connector-anchor for
// path matching.
const CONNECTOR_ANCHOR: Record<ReactorStatus, { x: number; y: number }> = {
  underConstruction: { x: 150.873, y: 422.366 },
  operating:         { x: 301.610, y: 422.366 },
  retired:           { x: 729.267, y: 422.366 },
  cancelled:         { x: 1317.654, y: 422.366 },
};

// SVG-unit y range to include per quadrant. Hub-form top is around
// y=345 (the smallest hub bbox top is retired/cancelled at y=345);
// leaf row at y=800.993. Leaves can carry radii up to ~24 so their
// bottom edge sits at y≈825; the viewBox needs to extend past that
// or the largest circles clip. Timeline gridlines start at y=835
// so we stop at 832 - 1 px below the gridlines, 8 px below the
// largest possible leaf bottom (Court round-14: 'circles seem to
// be getting cut off so you need to increase the bbox slightly').
const QUAD_VIEW_Y_TOP = 332;
const QUAD_VIEW_Y_BOTTOM = 832;
const QUAD_VIEW_H = QUAD_VIEW_Y_BOTTOM - QUAD_VIEW_Y_TOP;

// Width (in SVG units) every quadrant uses. The widest content is
// the retired-status leaf spread of ~590 units; we add padding so
// the leaves don't sit at the edge. Critically, using the SAME
// width for every quadrant means preserveAspectRatio gives every
// quadrant the SAME SVG-to-pixel scale. Hub forms therefore render
// at their print-proportional sizes - yellow (UC) small, grey
// (retired) and red (cancelled) larger - matching Court's brief
// that "yellow forms/circles should not be taller than the grey
// ones - like in the original poster".
const QUAD_VIEW_W = 660;

// CSS class registry - one keyed style per quadrant.
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
    /* Hub-form polylines render natively in the SVG layer now.
       Smooth in/out for hover & filter dim. */
    .poster005-quadrant svg polyline {
      transition: opacity 180ms ease-out;
    }
    /* Court round-11: when hovering a leaf, the hub form (polylines)
       must STAY visible, and the connector chain from form → focused
       leaf must also stay visible. Only OTHER connectors and OTHER
       leaves dim.
 - polylines (hub form): NOT dimmed by data-any-hover.
 - path[data-reactor*=ID]: kept visible via a sibling
           [data-hovered-id=ID] attribute on the quadrant. Other
           paths drop to 0.06. */
    .poster005-quadrant[data-any-hover="true"] svg path {
      opacity: 0.06;
      transition: opacity 160ms ease-out;
    }
    .poster005-quadrant[data-any-hover="true"] svg text,
    .poster005-quadrant[data-any-hover="true"] svg line {
      opacity: 0.06;
      transition: opacity 160ms ease-out;
    }
    /* Filter on a different status: the whole quadrant fades back. */
    .poster005-quadrant[data-other-filter="true"] {
      opacity: 0.18;
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
      const connectorAnchor = CONNECTOR_ANCHOR[status];
      const myLeaves = new Set(LEAVES_BY_STATUS[status].map((l) => l.reactorId));
      const myLeafXs = LEAVES_BY_STATUS[status].map((l) => l.x);

      // Keep THIS status's hub polylines (canonical print stroke
       // colour) so they render natively as crisp SVG at full
      // resolution; strip every other hub's polylines + cream-fill
      // polylines. The canvas overlay now owns only the pulse
      // animation - the hub form itself is rendered by the SVG.
      //
      // Court round-7: 'replace the forms with the ones being used
      // on the current live site main branch, which are much higher
      // definition'. The print SVG's 256 polylines per hub are
      // already high-def - rendering them as SVG instead of
      // rasterised canvas is what makes them look high-def.
      const MY_HUB_STROKE: Record<string, string> = {
        underConstruction: '#b4822e',
        operating:         '#237c3e',
        retired:           '#7d746a',
        cancelled:         '#a51e23',
      };
      const myHubStroke = MY_HUB_STROKE[status];
      svg.querySelectorAll('polyline').forEach((p) => {
        const stroke = (p.getAttribute('stroke') ?? '').trim().toLowerCase();
        const fill = (p.getAttribute('fill') ?? '').trim().toLowerCase();
        if (stroke === myHubStroke) {
          // Keep this hub's outline polylines. Thinner stroke and
          // reduced opacity so the form reads as a softer, more
          // transparent organic mark (Court round-8 feedback).
          p.setAttribute('stroke-width', '0.35');
          p.setAttribute('stroke-opacity', '0.5');
          return;
        }
        // Strip every other polyline (other hubs' outlines, cream
        // fills, and any miscellaneous shape primitives).
        p.remove();
      });

      // Strip every row-* group (the timeline strip is its own component).
      svg.querySelectorAll('g[id^="row-"]').forEach((g) => g.remove());

      // Strip every <line> below the dendrogram leaf row. The source
      // SVG has 8 horizontal decade gridlines + tick marks at y=835-
      // 993 (the timeline portion) which were bleeding through the
      // quadrant viewBox crop because their elements live OUTSIDE
      // the row-* groups.
      svg.querySelectorAll('line').forEach((ln) => {
        const y1 = parseFloat(ln.getAttribute('y1') ?? '0');
        const y2 = parseFloat(ln.getAttribute('y2') ?? '0');
        if (Math.min(y1, y2) > 815) ln.remove();
      });

      // Strip decade year-label outlined-path groups (live at y=830-
      // 1000 outside row groups, encoded as isolation glyph groups).
      svg.querySelectorAll('g').forEach((g) => {
        const paths = g.querySelectorAll('path');
        if (paths.length === 0) return;
        const d = paths[0].getAttribute('d') ?? '';
        const m = /M([\d.\-]+),([\d.\-]+)/.exec(d);
        if (!m) return;
        const sy = parseFloat(m[2]);
        if (sy > 815) g.remove();
      });

      // Strip <text> elements that hold decade year labels (1960,
      // 1970, ...). These were positioned via transform="translate(...)"
      // and weren't caught by the y-based path filter above.
      svg.querySelectorAll('text').forEach((t) => {
        const inner = (t.textContent ?? '').trim();
        if (/^\d{4}$/.test(inner)) {
          t.remove();
        }
      });

      // Connectors: two-pass filter.
      //   Pass 1: identify this hub's sub-hubs (the endpoints of
      //           level-1 paths originating at this hub's anchor).
      //   Pass 2: keep only level-1 paths from this hub and level-2
      //           paths whose START matches one of those sub-hubs.
      // Earlier the filter kept any level-2 path ending at a leaf x
      // in this status, which let orphan paths from OTHER hubs
      // through whenever an x-coordinate happened to collide  -
      // visible as 'lines all over the place'.
      const ANCHOR_X = connectorAnchor.x;
      const ANCHOR_Y = connectorAnchor.y;
      const allPathInfo: {
        el: SVGPathElement; sx: number; sy: number; ex: number; ey: number;
      }[] = [];
      svg.querySelectorAll<SVGPathElement>('path').forEach((p) => {
        const d = (p.getAttribute('d') ?? '').trim();
        // Match the M start, then peek at the next command. Connector
        // paths can be cubic (c... → relative cubic Bézier ending at
        // dx,dy in the last two numbers) OR vertical-only (v... →
        // single relative dy). Both are valid connectors; the c
        // form curves, the v form is a straight vertical drop.
        const startM = /^M([\d.\-]+),([\d.\-]+)([cv])/.exec(d);
        if (!startM) return;
        const sx = parseFloat(startM[1]);
        const sy = parseFloat(startM[2]);
        const cmd = startM[3];
        // SVG paths omit the comma before negative numbers (so
        // "103.332-20.96" is two numbers, not "103.332" minus 20).
        // Match every signed number rather than splitting on
        // separators.
        const tail =
          d.substring(startM[0].length).match(/-?\d+\.?\d*(?:e[-+]?\d+)?/g)?.map(parseFloat) ?? [];
        let ex: number, ey: number;
        if (cmd === 'c') {
          if (tail.length < 6) { p.remove(); return; }
          ex = sx + tail[4];
          ey = sy + tail[5];
        } else {
          // v: single dy (vertical line by dy)
          if (tail.length < 1) { p.remove(); return; }
          ex = sx;
          ey = sy + tail[0];
        }
        allPathInfo.push({ el: p, sx, sy, ex, ey });
      });

      // Pass 1: this hub's sub-hub endpoints.
      const ownSubHubs: { x: number; y: number }[] = [];
      for (const info of allPathInfo) {
        const isLevel1 = Math.abs(info.sy - 422.366) < 1;
        if (isLevel1 && Math.abs(info.sx - ANCHOR_X) < 1 && Math.abs(info.sy - ANCHOR_Y) < 1) {
          ownSubHubs.push({ x: info.ex, y: info.ey });
        }
      }
      const startsAtOwnSubHub = (sx: number, sy: number): boolean =>
        ownSubHubs.some((sh) => Math.abs(sh.x - sx) < 1 && Math.abs(sh.y - sy) < 1);

      // Pass 2: drop paths that don't belong to this status, and
      // stamp the kept paths with which reactor(s) they serve so
      // hover dim can keep the chain hub → sub-hub → focused leaf
      // visible while dimming the rest.
      const leafByX = new Map<number, string>();
      for (const leaf of LEAVES_BY_STATUS[status]) {
        leafByX.set(Math.round(leaf.x * 100) / 100, leaf.reactorId);
      }
      const level1ReactorsBySubhub = new Map<string, string[]>();
      // First find level-2 paths that survive and record which
      // reactor each one serves; group by their start (sub-hub key)
      // so level-1 paths can later be stamped with the reactors
      // reachable through them.
      for (const info of allPathInfo) {
        const isLevel2 = Math.abs(info.sy - 594.329) < 1;
        if (!isLevel2) continue;
        const matchesLeafX = myLeafXs.some((lx) => Math.abs(info.ex - lx) < 1.5);
        if (!startsAtOwnSubHub(info.sx, info.sy) || !matchesLeafX) continue;
        // Find which reactor this serves (closest leaf x).
        let bestId: string | null = null;
        let bestD = Infinity;
        for (const leaf of LEAVES_BY_STATUS[status]) {
          const d = Math.abs(leaf.x - info.ex);
          if (d < bestD) { bestD = d; bestId = leaf.reactorId; }
        }
        if (!bestId) continue;
        info.el.setAttribute('data-reactor', bestId);
        const subKey = `${info.sx.toFixed(2)},${info.sy.toFixed(2)}`;
        const arr = level1ReactorsBySubhub.get(subKey) ?? [];
        arr.push(bestId);
        level1ReactorsBySubhub.set(subKey, arr);
      }
      for (const info of allPathInfo) {
        const isLevel1 = Math.abs(info.sy - 422.366) < 1;
        const isLevel2 = Math.abs(info.sy - 594.329) < 1;
        if (isLevel1) {
          if (!(Math.abs(info.sx - ANCHOR_X) < 1 && Math.abs(info.sy - ANCHOR_Y) < 1)) {
            info.el.remove();
            continue;
          }
          // Stamp with all reactors reachable via this level-1.
          const subKey = `${info.ex.toFixed(2)},${info.ey.toFixed(2)}`;
          const reactors = level1ReactorsBySubhub.get(subKey) ?? [];
          if (reactors.length === 0) continue;
          info.el.setAttribute('data-reactor', reactors.join(','));
        } else if (isLevel2) {
          // Already stamped above; drop unstamped ones.
          if (!info.el.hasAttribute('data-reactor')) {
            info.el.remove();
          }
        }
      }
      void leafByX;

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
      // in React above each quadrant - so strip everything in the
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

      // Unified viewBox: same width (QUAD_VIEW_W) and same height
      // (QUAD_VIEW_H) for every quadrant, centred on this hub's
      // connector-anchor x. Smaller fleets (UC, operating) get
      // whitespace around their narrow content; larger fleets
      // (retired, cancelled) fit exactly. Critically the SVG-to-
      // pixel scale is identical across quadrants, so the hubs
      // render at their print-proportional sizes.
      const xCenter = connectorAnchor.x;
      const xMin = xCenter - QUAD_VIEW_W / 2;
      const yMin = QUAD_VIEW_Y_TOP;
      svg.setAttribute('viewBox', `${xMin} ${yMin} ${QUAD_VIEW_W} ${QUAD_VIEW_H}`);
      svg.setAttribute('width', '100%');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute(
        'style',
        'display:block;width:100%;height:100%;position:absolute;inset:0;z-index:2;',
      );

      setViewBox({ x: xMin, y: yMin, w: QUAD_VIEW_W, h: QUAD_VIEW_H });
      setSvgMarkup(new XMLSerializer().serializeToString(svg));
    };
    xhr.send();
    return () => { cancelled = true; };
  }, [status]);

  // Hover wiring - leaves only. Hub hover comes from the dedicated
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

  // Store subscription - apply leaf focus/dim classes + container
  // attributes for SVG-element dimming.
  useEffect(() => {
    if (!svgMarkup) return;
    const container = containerRef.current;
    if (!container) return;
    const apply = (filteredStatus: ReactorStatus | null, hoveredId: string | null) => {
      filteredStatusRef.current = filteredStatus;
      hoveredReactorRef.current = hoveredId ? REACTOR_BY_ID[hoveredId] ?? null : null;
      const hoveredR = hoveredReactorRef.current;
      // Court round-10: hover only greys out other reactors IN THE
      // SAME sector. Other sectors stay full. The data-any-hover
      // attribute (which dims hub polylines + connectors + axis
      // text) is therefore only true on the quadrant that owns the
      // hovered reactor - never on the others.
      const hoverInThisQuad = !!hoveredR && hoveredR.status === status;
      container.setAttribute('data-any-hover', hoverInThisQuad ? 'true' : 'false');
      // Click-on-hub filter dim still works globally: other
      // quadrants fade back when a filter is active and it's not
      // this status.
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
        // Dim leaves only if the hover is in THIS quadrant and this
        // leaf isn't the focused one. If the hover is in another
        // quadrant, this quadrant's leaves stay at full opacity.
        const isDimmed = hoverInThisQuad && !matchesHover;
        c.classList.toggle('is-focused', isFocused);
        c.classList.toggle('is-dimmed', isDimmed);
      });

      // Connector chain visibility: when hovering a leaf, the
      // path(s) whose data-reactor includes the focused id stay at
      // full opacity (override the data-any-hover dim). Other
      // paths inherit the 0.06 dim from CSS.
      const paths = container.querySelectorAll<SVGPathElement>('path[data-reactor]');
      const focusedId = hoverInThisQuad && hoveredR ? hoveredR.id : null;
      paths.forEach((p) => {
        if (!focusedId) {
          p.style.opacity = '';
          return;
        }
        const reactors = (p.getAttribute('data-reactor') ?? '').split(',');
        if (reactors.includes(focusedId)) {
          // Force full opacity even though parent quadrant has
          // data-any-hover="true".
          p.style.opacity = '1';
        } else {
          p.style.opacity = '';
        }
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

    // DPR refreshed each resize via the shared helper - capped at
    // MAX_DPR=3 instead of the previous local 1.5 cap which was
    // rendering Retina at 75% of native resolution.
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    const resize = () => {
      const r = container.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      const fit = fitCanvasToDpr(canvas, cssW, cssH);
      dpr = fit.dpr;
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
      const scale = s * dpr;
      const offX = offsetX * dpr;
      const offY = offsetY * dpr;

      const hoveredReactor = hoveredReactorRef.current;
      const filteredStatus = filteredStatusRef.current;
      // baseAlpha / hub physical pulse / canvas hub-form rendering
      // all removed - the SVG layer renders the hub polylines
      // natively now. Court round-7: 'replace the forms with the
      // ones being used on the current live site main branch, which
      // are much higher definition'. The canonical 256 print
      // polylines per hub render crisply when drawn as SVG instead
      // of rasterised on canvas.
      void hoveredReactor;
      void filteredStatus;
      void hub;
      void t;
      void TUNING;

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

  // Hub hot-zone - refer to via ref so we can attach native
  // pointerover/leave listeners. React's onPointerEnter sometimes
  // misses fires when the cursor enters via a fast diagonal or when
  // the parent intercepts the event first; native listeners on the
  // element are more reliable.
  const hotZoneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = hotZoneRef.current;
    if (!el) return;
    const fire = () => {
      if (isHubHoveredRef.current) return;
      isHubHoveredRef.current = true;
      const now = performance.now();
      pulsesRef.current = buildPulses(status, now);
      hubPulseRef.current = { startedAt: now };
    };
    const reset = () => {
      isHubHoveredRef.current = false;
    };
    const onOver = (e: PointerEvent) => {
      // pointerover bubbles; pointerenter would skip when a child
      // exists. We don't have children in the hot-zone, but using
      // pointerover sidesteps any cross-browser quirks with enter.
      const rel = e.relatedTarget as Node | null;
      if (rel && el.contains(rel)) return;
      fire();
    };
    const onOut = (e: PointerEvent) => {
      const rel = e.relatedTarget as Node | null;
      if (rel && el.contains(rel)) return;
      reset();
    };
    el.addEventListener('pointerover', onOver, { passive: true });
    el.addEventListener('pointerout', onOut, { passive: true });
    return () => {
      el.removeEventListener('pointerover', onOver);
      el.removeEventListener('pointerout', onOut);
    };
  }, [status]);

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
      {/* Quadrant header - status label + count + MW total */}
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
          className="text-sm uppercase tracking-[0.12em] text-muted-foreground"
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
              ref={hotZoneRef}
              role="button"
              tabIndex={0}
              aria-label={`Pulse cascade for ${STATUS_LABEL[status]} reactors`}
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
