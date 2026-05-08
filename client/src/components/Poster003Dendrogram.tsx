import { useEffect, useReducer, useRef, useState } from 'react';
import {
  type SourceId,
  type VizState,
  SOURCE_IDS,
} from '@/lib/poster003Data';

/**
 * Poster 003 — energy-mix dendrogram (SVG, dynamic positions).
 *
 * Layout model: sources currently present (`geometricTwh > 0`) are
 * sorted ascending by current TWh (smallest left, largest right —
 * matching the printed S1/S2/S3 layouts) and distributed evenly
 * along a horizontal baseline. As sources cross zero TWh they
 * disappear with a hard cut and the remaining nodes ease into a
 * new even distribution. No physics — just analytical positions
 * with per-frame easing toward target (~150ms settle).
 *
 * Editorial discipline note: percentages tick continuously with
 * the slider — the same deliberate relaxation as the dot ticker
 * (see Poster003Viz `TickerTotals` comment). Per-source % of mix
 * is honest because it's a fraction of the rendered geometry, not
 * an interpolated mortality estimate. The hard cut at exactly 0%
 * is the only opacity transition; there is no fade curve.
 */

const SVG_URL = '/assets/003-S1-dendrogram_19832a4f.svg';

const STROKE_NUCLEAR = '#b5822e';
const STROKE_OTHER = '#7d746a';
const STROKE_LINK = '#0d1a1e';

// Trunk apex + node baseline derived from the printed S1 dendrogram:
//   M574.54,651.39 c0,172.54  X,44.48  X,217.03
// trunk = (574.54, 651.39); node baseline = trunk.y + 217.03.
const TRUNK_X = 574.54;
const TRUNK_Y = 651.39;
const BASELINE_Y = TRUNK_Y + 217.03;
const C1_DY = 172.54; // first cubic control offset, y from trunk
const C2_DY = 44.48;  // second cubic control offset, y from trunk

// Horizontal layout window. Matches the printed S1's left-to-right
// span (coal at ~374, gas at ~775) plus a small inset so labels
// don't run into the dendrogram viewBox edges.
const X_MIN = 380;
const X_MAX = 775;
const X_CENTER = (X_MIN + X_MAX) / 2;
const X_SPAN = X_MAX - X_MIN;

// Margin-aware spacing: keep PREFERRED_SPACING between nodes when
// it fits, otherwise compress to fit in the available span. So a
// small N (S3, three sources) clusters tightly at centre rather
// than stretching to fill the full horizontal width.
const PREFERRED_SPACING = 56;
const EASE_FACTOR = 0.15;
const SETTLE_TOLERANCE = 0.05;

// r = RADIUS_CONSTANT × √TWh — verified across S1, S2, S3 prints
// (e.g. nuclear S1 r=19.96 at 40.6 TWh → 19.96 / √40.6 ≈ 3.13).
const RADIUS_CONSTANT = 3.13;

const LABEL_NAMES: Record<SourceId, string> = {
  gas: 'GAS',
  oil: 'OIL',
  bioenergy: 'BIOENERGY',
  coal: 'COAL',
  hydro: 'HYDRO',
  wind: 'WIND',
  nuclear: 'NUCLEAR',
  solar: 'SOLAR',
};

interface ParsedDendrogram {
  viewBox: string;
  staticOverlay: string;
}

let cached: ParsedDendrogram | null = null;

// Returns the centroid y of a depth-0 group's path "M x,y" anchors.
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

// Strip everything dynamic (circles, the links group, the per-
// source label row at y > 880). Keep only the central trunk
// annotation in the static overlay.
function parseDendrogramSvg(svgText: string): ParsedDendrogram | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  const viewBox = svg.getAttribute('viewBox') || '0 0 1000 1000';

  Array.from(svg.querySelectorAll('circle')).forEach((c) => c.remove());
  const linksGroup = svg.querySelector('g#links');
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
  return { viewBox, staticOverlay };
}

function connectorPath(nodeX: number): string {
  return (
    `M${TRUNK_X},${TRUNK_Y} ` +
    `C${TRUNK_X},${TRUNK_Y + C1_DY} ` +
    `${nodeX},${TRUNK_Y + C2_DY} ` +
    `${nodeX},${BASELINE_Y}`
  );
}

// Given N present sources, return the target x for index i in
// [0..N-1]. Margin-aware: PREFERRED_SPACING between nodes when
// it fits; otherwise compress to fit X_SPAN.
function targetXFor(i: number, n: number): number {
  if (n <= 1) return X_CENTER;
  const totalSpan = (n - 1) * PREFERRED_SPACING;
  const useSpacing =
    totalSpan <= X_SPAN ? PREFERRED_SPACING : X_SPAN / (n - 1);
  const startX = X_CENTER - ((n - 1) * useSpacing) / 2;
  return startX + i * useSpacing;
}

export interface Poster003DendrogramProps {
  vizState: VizState;
}

export default function Poster003Dendrogram({
  vizState,
}: Poster003DendrogramProps) {
  const [parsed, setParsed] = useState<ParsedDendrogram | null>(cached);
  const [parseError, setParseError] = useState(false);

  // ─── Fetch + strip the static overlay once ──────────────────────
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

  // ─── Eased x-positions per source ──────────────────────────────
  // Recomputed each animation frame from current vizState. Newly-
  // present sources teleport to their target x (no animate-in);
  // existing sources ease toward their target as the cluster
  // reorganises around appearing/disappearing siblings.
  const xRef = useRef<Record<string, number>>({});
  const presentLastFrameRef = useRef<Set<SourceId>>(new Set());

  // Live ref for the RAF tick.
  const vizStateRef = useRef<VizState>(vizState);
  vizStateRef.current = vizState;

  const [, forceUpdate] = useReducer((x: number) => (x + 1) % 1e9, 0);

  // RAF loop: continuously eases positions and re-renders the SVG.
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const viz = vizStateRef.current;
      // Sources currently present: geometricTwh > 0.
      const present: SourceId[] = SOURCE_IDS.filter(
        (id) => viz.geometricSources[id].twh > 0,
      ).sort(
        (a, b) =>
          viz.geometricSources[a].twh - viz.geometricSources[b].twh,
      );
      const presentSet = new Set(present);
      const N = present.length;

      // Compute and ease target positions.
      for (let i = 0; i < N; i++) {
        const id = present[i];
        const target = targetXFor(i, N);
        const wasPresent = presentLastFrameRef.current.has(id);
        if (!wasPresent) {
          // Reappearing — teleport to target so the source pops
          // into its correct position in the cluster, then ticks
          // up from there. No animate-in.
          xRef.current[id] = target;
        } else {
          const cur = xRef.current[id] ?? target;
          const next = cur + (target - cur) * EASE_FACTOR;
          xRef.current[id] =
            Math.abs(target - next) < SETTLE_TOLERANCE ? target : next;
        }
      }
      // Forget positions for sources that vanished.
      for (const id of SOURCE_IDS) {
        if (!presentSet.has(id)) delete xRef.current[id];
      }
      presentLastFrameRef.current = presentSet;

      forceUpdate();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

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

  // Build the per-source render list. Read viz directly from props
  // each render — geometric twh drives both radius and percentage.
  const totalTwh = vizState.anchorState.totalTwh;
  const present: SourceId[] = SOURCE_IDS.filter(
    (id) => vizState.geometricSources[id].twh > 0,
  ).sort(
    (a, b) =>
      vizState.geometricSources[a].twh -
      vizState.geometricSources[b].twh,
  );

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
        {present.map((id) => {
          const x = xRef.current[id] ?? X_CENTER;
          return (
            <path
              key={`link-${id}`}
              d={connectorPath(x)}
              fill="none"
              stroke={STROKE_LINK}
              strokeWidth={0.5}
              strokeMiterlimit={10}
            />
          );
        })}
        {/* Nodes + per-source labels */}
        {present.map((id) => {
          const x = xRef.current[id] ?? X_CENTER;
          const twh = vizState.geometricSources[id].twh;
          const r = RADIUS_CONSTANT * Math.sqrt(twh);
          const isNuclear = id === 'nuclear';
          const fill = isNuclear ? STROKE_NUCLEAR : STROKE_OTHER;
          const labelColor = isNuclear ? STROKE_NUCLEAR : '#0d1a1e';
          // Editorial relaxation: percentage ticks continuously
          // with geometric TWh — same justification as the dot
          // ticker (see Poster003Viz comment). Honest because
          // it's a fraction of the rendered geometry, not an
          // interpolated mortality estimate. Per-source mortality
          // numbers (deaths-by-source labels) stay snap-only.
          const pct = totalTwh > 0 ? (twh / totalTwh) * 100 : 0;
          const pctText =
            pct >= 10 ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
          const labelY = BASELINE_Y + r + 14;
          return (
            <g key={`node-${id}`}>
              <circle
                cx={x}
                cy={BASELINE_Y}
                r={r}
                fill={fill}
                stroke={STROKE_LINK}
                strokeMiterlimit={10}
                strokeWidth={0.5}
              />
              <text
                x={x}
                y={labelY}
                textAnchor="middle"
                fontFamily="'Playfair', Georgia, serif"
                fontSize={6}
                fill={labelColor}
                opacity={0.9}
                style={{
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                {LABEL_NAMES[id]}
              </text>
              <text
                x={x}
                y={labelY + 8}
                textAnchor="middle"
                fontFamily="'Playfair', Georgia, serif"
                fontSize={8}
                fontWeight={600}
                fill={labelColor}
                className="tabular-nums"
              >
                {pctText}
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
