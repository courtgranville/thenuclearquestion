import { useEffect, useMemo, useState } from 'react';
import {
  MAX_TWH_FOR_SOURCE,
  SCENARIOS,
  type SourceId,
  type VizState,
} from '@/lib/poster003Data';

/**
 * Poster 003 — energy-mix dendrogram (SVG, fixed node positions).
 *
 * Node radii morph proportionally to source TWh, area-proportional:
 *   r = baseRadius × √(currentTwh / maxTwh)
 *
 * Smooth fades replace the original hard cut-off:
 *   - Above 5 TWh: full opacity.
 *   - 5 TWh → 0 TWh: opacity fades linearly from 1 to 0.
 *   - Below 0 TWh: hidden.
 * Circle, connector line, and label all share this opacity so a
 * vanishing source disappears as a unit. No CSS transition on r —
 * radii update directly from interpolated state each render, which
 * is smoother than transitioning per-frame state changes.
 */

const SVG_URL = '/assets/003-S1-dendrogram_19832a4f.svg';

// Canonical CLAUDE.md ochre / stone, matching the canvas-deaths layer.
const STROKE_NUCLEAR = '#b5822e';
const STROKE_OTHER = '#7d746a';
const STROKE_LINK = '#0d1a1e';

// Source-id mapping by x-position. Verified manually against the
// printed S1 dendrogram: r = 3.13 × √TWh for every node.
const SOURCE_BY_X: ReadonlyArray<{ x: number; id: SourceId }> = [
  { x: 374.08, id: 'coal' },
  { x: 426.25, id: 'hydro' },
  { x: 480.13, id: 'oil' },
  { x: 534.71, id: 'solar' },
  { x: 591.73, id: 'bioenergy' },
  { x: 650.67, id: 'nuclear' },
  { x: 711.73, id: 'wind' },
  { x: 775.01, id: 'gas' },
];

// Hand-encoded label positions for the React-controlled labels
// beneath each node. Coordinates read off the bbox centres of the
// burned-in S1 dendrogram label groups (which we strip from the
// overlay so they don't double-render). Text content is built per
// frame from anchor-state TWh — per-source % stays snap-only.
const LABEL_DATA: Readonly<Record<SourceId, { name: string; x: number; y: number }>> = {
  coal:      { name: 'COAL',      x: 374, y: 905 },
  hydro:     { name: 'HYDRO',     x: 426, y: 905 },
  oil:       { name: 'OIL',       x: 480, y: 905 },
  solar:     { name: 'SOLAR',     x: 535, y: 905 },
  bioenergy: { name: 'BIOENERGY', x: 592, y: 922 },
  nuclear:   { name: 'NUCLEAR',   x: 651, y: 922 },
  wind:      { name: 'WIND',      x: 712, y: 922 },
  gas:       { name: 'GAS',       x: 775, y: 922 },
};

// Opacity-fade thresholds for circle, line, and label.
const OPACITY_FULL_TWH = 5;

function fadeOpacity(twh: number): number {
  if (twh >= OPACITY_FULL_TWH) return 1;
  if (twh <= 0) return 0;
  return twh / OPACITY_FULL_TWH;
}

interface ParsedNode {
  sourceId: SourceId;
  cx: number;
  cy: number;
  s1Radius: number;
  s1Twh: number;
  fill: string;
}

interface ParsedLink {
  sourceId: SourceId;
  d: string;
}

interface ParsedDendrogram {
  viewBox: string;
  staticOverlay: string;
  nodes: ParsedNode[];
  links: ParsedLink[];
}

let cached: ParsedDendrogram | null = null;

function nearestSourceId(cx: number): SourceId {
  let best = SOURCE_BY_X[0];
  let bestDist = Math.abs(cx - best.x);
  for (let i = 1; i < SOURCE_BY_X.length; i++) {
    const d = Math.abs(cx - SOURCE_BY_X[i].x);
    if (d < bestDist) {
      bestDist = d;
      best = SOURCE_BY_X[i];
    }
  }
  return best.id;
}

function endpointOfD(d: string): { x: number; y: number } | null {
  const numRe = /(-?\d*\.?\d+(?:e-?\d+)?)/g;
  const nums: number[] = [];
  let m;
  while ((m = numRe.exec(d)) !== null) nums.push(parseFloat(m[1]));
  if (nums.length < 2) return null;
  return {
    x: nums[0] + nums[nums.length - 2],
    y: nums[1] + nums[nums.length - 1],
  };
}

// Returns the centroid y of a depth-0 group's path "M x,y" anchors.
// Used to identify per-source label groups (which sit at y > 880)
// versus the central trunk label (at y ≈ 657).
function groupCentroidY(g: Element): number {
  const ds = Array.from(g.querySelectorAll('path'))
    .map((p) => p.getAttribute('d') || '')
    .filter(Boolean);
  let sum = 0;
  let n = 0;
  for (const d of ds) {
    const m = /^M\s*(-?[\d.]+),(-?[\d.]+)/.exec(d);
    if (m) {
      sum += parseFloat(m[2]);
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

function parseDendrogramSvg(svgText: string): ParsedDendrogram | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  const viewBox = svg.getAttribute('viewBox') || '0 0 1000 1000';

  const circleEls = Array.from(svg.querySelectorAll('circle'));
  const nodes: ParsedNode[] = circleEls.map((c) => {
    const cx = parseFloat(c.getAttribute('cx') || '0');
    const cy = parseFloat(c.getAttribute('cy') || '0');
    const r = parseFloat(c.getAttribute('r') || '0');
    const fill = c.getAttribute('fill') || STROKE_OTHER;
    const sourceId = nearestSourceId(cx);
    const s1Twh = SCENARIOS[0].sources[sourceId].twh;
    return { sourceId, cx, cy, s1Radius: r, s1Twh, fill };
  });

  const linksGroup = svg.querySelector('g#links');
  const links: ParsedLink[] = [];
  if (linksGroup) {
    const pathEls = Array.from(linksGroup.querySelectorAll('path'));
    for (const p of pathEls) {
      const d = p.getAttribute('d') || '';
      const ep = endpointOfD(d);
      if (!ep) continue;
      const sourceId = nearestSourceId(ep.x);
      links.push({ sourceId, d });
    }
  }

  // Strip circles, links group, AND per-source label groups (those
  // with centroid y > 880 — the row of source labels below the
  // nodes). The central trunk label (y ≈ 657) stays intact.
  circleEls.forEach((c) => c.remove());
  if (linksGroup) linksGroup.remove();
  Array.from(svg.children)
    .filter((el) => el.tagName.toLowerCase() === 'g')
    .forEach((g) => {
      if (groupCentroidY(g) > 880) g.remove();
    });

  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute(
    'style',
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;',
  );
  const staticOverlay = new XMLSerializer().serializeToString(svg);

  return { viewBox, staticOverlay, nodes, links };
}

export interface Poster003DendrogramProps {
  vizState: VizState;
}

export default function Poster003Dendrogram({
  vizState,
}: Poster003DendrogramProps) {
  const [parsed, setParsed] = useState<ParsedDendrogram | null>(cached);
  const [parseError, setParseError] = useState(false);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', SVG_URL, true);
    xhr.responseType = 'text';
    xhr.onload = () => {
      if (cancelled) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        const p = parseDendrogramSvg(xhr.responseText);
        if (p) {
          cached = p;
          setParsed(p);
        } else {
          setParseError(true);
        }
      } else {
        setParseError(true);
      }
    };
    xhr.onerror = () => {
      if (!cancelled) setParseError(true);
    };
    xhr.send();
    return () => {
      cancelled = true;
    };
  }, []);

  // Per-source render data — radius, opacity, and a snap-locked
  // label string. Recomputed each render directly from interpolated
  // state; no CSS transition on r.
  const nodeRender = useMemo(() => {
    if (!parsed) return [];
    const totalTwh = vizState.anchorState.totalTwh;
    return parsed.nodes.map((node) => {
      const currentTwh = vizState.geometricSources[node.sourceId].twh;
      const opacity = fadeOpacity(currentTwh);
      const baseR =
        node.s1Radius *
        Math.sqrt(MAX_TWH_FOR_SOURCE[node.sourceId] / node.s1Twh);
      const r =
        baseR * Math.sqrt(currentTwh / MAX_TWH_FOR_SOURCE[node.sourceId]);
      // Label uses the SNAP value, not the geometric value. Per-
      // source TWh % stays snap-only.
      const anchorTwh = vizState.anchorState.sources[node.sourceId].twh;
      const pct = totalTwh > 0 ? (anchorTwh / totalTwh) * 100 : 0;
      const labelText =
        anchorTwh <= 0
          ? '0%'
          : pct >= 10
            ? `${pct.toFixed(0)}%`
            : `${pct.toFixed(1)}%`;
      return { node, r: Math.max(0, r), opacity, labelText };
    });
  }, [parsed, vizState]);

  const linkRender = useMemo(() => {
    if (!parsed) return [];
    return parsed.links.map((link) => {
      const currentTwh = vizState.geometricSources[link.sourceId].twh;
      return { link, opacity: fadeOpacity(currentTwh) };
    });
  }, [parsed, vizState]);

  if (parseError) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <p className="text-base text-muted-foreground">
          Unable to load the dendrogram visualisation.
        </p>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div
        className="w-full mx-auto"
        style={{ aspectRatio: '473.86 / 306.98', maxWidth: 900 }}
      />
    );
  }

  return (
    <div
      className="relative w-full mx-auto"
      style={{ aspectRatio: '473.86 / 306.98', maxWidth: 900 }}
    >
      <svg
        viewBox={parsed.viewBox}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        className="absolute inset-0 block"
        aria-hidden="true"
      >
        {linkRender.map(({ link, opacity }, i) => (
          <path
            key={`link-${i}`}
            d={link.d}
            fill="none"
            stroke={STROKE_LINK}
            strokeWidth={0.5}
            strokeMiterlimit={10}
            opacity={opacity}
          />
        ))}
        {nodeRender.map(({ node, r, opacity, labelText }, i) => {
          const lbl = LABEL_DATA[node.sourceId];
          const labelFill =
            node.sourceId === 'nuclear' ? STROKE_NUCLEAR : '#0d1a1e';
          return (
            <g key={`node-${i}`} opacity={opacity}>
              <circle
                cx={node.cx}
                cy={node.cy}
                r={r}
                fill={node.sourceId === 'nuclear' ? STROKE_NUCLEAR : node.fill}
                stroke={STROKE_LINK}
                strokeMiterlimit={10}
                strokeWidth={0.5}
              />
              <text
                x={lbl.x}
                y={lbl.y}
                textAnchor="middle"
                fontFamily="'Playfair', Georgia, serif"
                fontSize={6}
                fill={labelFill}
                opacity={0.9}
                style={{
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                {lbl.name}
              </text>
              <text
                x={lbl.x}
                y={lbl.y + 8}
                textAnchor="middle"
                fontFamily="'Playfair', Georgia, serif"
                fontSize={8}
                fontWeight={600}
                fill={labelFill}
              >
                {labelText}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        dangerouslySetInnerHTML={{ __html: parsed.staticOverlay }}
      />
    </div>
  );
}
