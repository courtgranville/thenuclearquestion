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
 * Node radii morph proportionally to source TWh using the same
 * area-proportional convention as the printed artwork:
 *   r = baseRadius × √(currentTwh / s1Twh)
 * (i.e. disc area is proportional to TWh; not the linear formula
 * given in the original brief — verified against the printed S2 and
 * S3 dendrograms, where r grows by √(TWh ratio).)
 *
 * Connector lines and nodes are hard-cut to invisible when a source
 * effectively reaches zero (geometricTwh < 0.5). No fade. Snap back
 * to visible on the way left.
 */

const SVG_URL = '/assets/003-S1-dendrogram_19832a4f.svg';

const STROKE_NUCLEAR = '#b4822e';
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

const NODE_TWH_VISIBILITY_THRESHOLD = 0.5;

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
  textOverlay: string;
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

// Extract the trailing "x y" from a d-string by reading the last two
// space- or comma-separated numbers.
function endpointOfD(d: string): { x: number; y: number } | null {
  const numRe = /(-?\d*\.?\d+(?:e-?\d+)?)/g;
  const nums: number[] = [];
  let m;
  while ((m = numRe.exec(d)) !== null) nums.push(parseFloat(m[1]));
  if (nums.length < 2) return null;
  // For relative bezier curves the endpoint isn't necessarily the
  // last two numbers in absolute coords — but this dendrogram uses
  // a uniform structure where the last two numbers ARE the absolute
  // endpoint for both M-prefixed absolute paths and the c-suffix
  // pattern present here ("M cx0 cy0 c …, end_x end_y"). The c-relative
  // anchor is the same as M in these paths, so end_x = M.x + relX.
  return { x: nums[0] + nums[nums.length - 2], y: nums[1] + nums[nums.length - 1] };
}

function parseDendrogramSvg(svgText: string): ParsedDendrogram | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  const viewBox = svg.getAttribute('viewBox') || '0 0 1000 1000';

  // Nodes: every <circle> in the document.
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

  // Links: paths inside <g id="links">.
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

  // Strip the circles and the links group from the SVG; keep
  // everything else (text labels) as the static overlay.
  circleEls.forEach((c) => c.remove());
  if (linksGroup) linksGroup.remove();

  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute(
    'style',
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;',
  );
  const textOverlay = new XMLSerializer().serializeToString(svg);

  return { viewBox, textOverlay, nodes, links };
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

  // Per-frame node + link state.
  const nodeRender = useMemo(() => {
    if (!parsed) return [];
    return parsed.nodes.map((node) => {
      const currentTwh = vizState.geometricSources[node.sourceId].twh;
      const visible = currentTwh >= NODE_TWH_VISIBILITY_THRESHOLD;
      // Area-proportional: r ∝ √TWh. baseRadius is calibrated to
      // the source's max-TWh scenario so r at max ≡ baseRadius.
      // (For nuclear the SVG's S1 radius corresponds to S1 TWh;
      // we scale up by √(maxTwh/s1Twh) to land at the correct
      // S3 radius — verified against the printed S3 artwork.)
      const baseR =
        node.s1Radius *
        Math.sqrt(MAX_TWH_FOR_SOURCE[node.sourceId] / node.s1Twh);
      const r =
        baseR * Math.sqrt(currentTwh / MAX_TWH_FOR_SOURCE[node.sourceId]);
      return { node, r: Math.max(0, r), visible };
    });
  }, [parsed, vizState]);

  const linkRender = useMemo(() => {
    if (!parsed) return [];
    return parsed.links.map((link) => {
      const currentTwh = vizState.geometricSources[link.sourceId].twh;
      return {
        link,
        visible: currentTwh >= NODE_TWH_VISIBILITY_THRESHOLD,
      };
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
        {/* Connector lines first (under nodes) */}
        {linkRender.map(({ link, visible }, i) => (
          <path
            key={`link-${i}`}
            d={link.d}
            fill="none"
            stroke={STROKE_LINK}
            strokeWidth={0.5}
            strokeMiterlimit={10}
            visibility={visible ? 'visible' : 'hidden'}
          />
        ))}
        {/* Nodes on top */}
        {nodeRender.map(({ node, r, visible }, i) => (
          <circle
            key={`node-${i}`}
            cx={node.cx}
            cy={node.cy}
            r={r}
            fill={node.fill}
            stroke={STROKE_LINK}
            strokeMiterlimit={10}
            strokeWidth={0.5}
            visibility={visible ? 'visible' : 'hidden'}
          />
        ))}
      </svg>
      {/* Text-label overlay */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        dangerouslySetInnerHTML={{ __html: parsed.textOverlay }}
      />
    </div>
  );
}
