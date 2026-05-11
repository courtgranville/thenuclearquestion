import { memo, useEffect, useRef, useState } from 'react';
import { type SourceId, SOURCE_IDS } from '@/lib/poster003Data';
import { poster003Store } from '@/lib/poster003Store';

/**
 * Poster 003 - energy-mix dendrogram (commit 19).
 *
 * Architecture: decoupled from the React render path. The component
 * renders one full SVG tree on mount with all 8 source groups
 * present (display=none by default) and refs to every dynamic
 * element. A RAF loop, started in useEffect and triggered by store
 * subscription, reads the current vizState, computes per-source
 * target x positions, eases live positions toward target each
 * frame, and writes the result to the SVG via setAttribute /
 * textContent. The component never re-renders during slider drag.
 *
 * Layout: present sources sorted ascending by current TWh
 * (smallest left, largest right) and distributed at slot widths
 * computed each frame to guarantee no adjacent-node overlap. As
 * sources cross zero TWh they hard-cut to invisible; on reverse
 * drag they pop back at their new target with no animate-in.
 *
 * Editorial relaxation note: per-source % of mix ticks continuously
 * - same justification as the dot ticker (commit 9) and the
 * deaths-by-source per-source counts (commit 15). Honest because
 * it's a fraction of the rendered geometry, not an interpolated
 * mortality estimate.
 */

const SVG_URL = '/assets/003-S1-dendrogram_19832a4f.svg';

const STROKE_NUCLEAR = '#b5822e';
const STROKE_OTHER = '#7d746a';
const STROKE_LINK = '#0d1a1e';

// Trunk apex + node baseline derived from the printed S1 dendrogram.
const TRUNK_X = 574.54;
const TRUNK_Y = 651.39;
const BASELINE_Y = TRUNK_Y + 217.03;
const C1_DY = 172.54;
const C2_DY = 44.48;

const X_CENTER = TRUNK_X;

const PREFERRED_SPACING = 56;
const MIN_PADDING_BETWEEN_NODES = 14;
const EASE_FACTOR = 0.15;
const SETTLE_TOLERANCE = 0.05;

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

function slotWidthFor(sortedRadiiAsc: number[]): number {
  const n = sortedRadiiAsc.length;
  if (n <= 1) return PREFERRED_SPACING;
  const r1 = sortedRadiiAsc[n - 1];
  const r2 = sortedRadiiAsc[n - 2];
  const minSlot = r1 + r2 + MIN_PADDING_BETWEEN_NODES;
  return Math.max(PREFERRED_SPACING, minSlot);
}

function targetXForSlot(i: number, n: number, slot: number): number {
  if (n <= 1) return X_CENTER;
  const startX = X_CENTER - ((n - 1) * slot) / 2;
  return startX + i * slot;
}

function pctText(pct: number): string {
  return pct >= 10 ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
}

interface NodeRefs {
  group: SVGGElement | null;
  link: SVGPathElement | null;
  circle: SVGCircleElement | null;
  nameText: SVGTextElement | null;
  pctText: SVGTextElement | null;
}

function Poster003DendrogramImpl() {
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

  // Refs for every dynamic SVG element. Initialised once; populated
  // by callback refs as the JSX mounts.
  const elementRefs = useRef<Record<SourceId, NodeRefs>>(
    SOURCE_IDS.reduce((acc, id) => {
      acc[id] = {
        group: null,
        link: null,
        circle: null,
        nameText: null,
        pctText: null,
      };
      return acc;
    }, {} as Record<SourceId, NodeRefs>),
  );

  // ─── RAF easing loop + store subscription ──────────────────────
  // The RAF loop runs continuously while there are nodes to ease;
  // it stops when all positions have settled and there is no slider
  // activity. Store updates re-arm the loop.
  useEffect(() => {
    const xRef: Record<string, number> = {};
    const presentLast: Set<SourceId> = new Set();
    let rafId: number | null = null;
    const lastWritten: Record<SourceId, { x: number; pct: string; visible: boolean }> = {} as Record<
      SourceId,
      { x: number; pct: string; visible: boolean }
    >;
    SOURCE_IDS.forEach((id) => {
      lastWritten[id] = { x: -1, pct: '', visible: false };
    });

    const writeNodeAttrs = (
      id: SourceId,
      x: number,
      r: number,
      pct: string,
      visible: boolean,
    ) => {
      const refs = elementRefs.current[id];
      if (!refs.group) return;
      const last = lastWritten[id];
      if (visible !== last.visible) {
        refs.group.setAttribute('display', visible ? 'inline' : 'none');
        last.visible = visible;
      }
      if (!visible) return;
      // Position-related attributes only need rewriting if x or r
      // changed perceptibly. setAttribute is cheap, but skipping
      // avoids needless layout work.
      if (Math.abs(x - last.x) > 0.01 || refs.circle?.getAttribute('r') !== `${r}`) {
        if (refs.link) {
          refs.link.setAttribute('d', connectorPath(x));
        }
        if (refs.circle) {
          refs.circle.setAttribute('cx', String(x));
          refs.circle.setAttribute('r', String(r));
        }
        if (refs.nameText) {
          refs.nameText.setAttribute('x', String(x));
          refs.nameText.setAttribute('y', String(BASELINE_Y + r + 14));
        }
        if (refs.pctText) {
          refs.pctText.setAttribute('x', String(x));
          refs.pctText.setAttribute('y', String(BASELINE_Y + r + 22));
        }
        last.x = x;
      }
      if (pct !== last.pct && refs.pctText) {
        refs.pctText.textContent = pct;
        last.pct = pct;
      }
    };

    const tick = () => {
      const viz = poster003Store.getCurrent();

      const present: SourceId[] = SOURCE_IDS.filter(
        (id) => viz.geometricSources[id].twh > 0,
      ).sort(
        (a, b) =>
          viz.geometricSources[a].twh - viz.geometricSources[b].twh,
      );
      const presentSet = new Set(present);
      const N = present.length;
      const radiiAsc = present.map(
        (id) => RADIUS_CONSTANT * Math.sqrt(viz.geometricSources[id].twh),
      );
      const slot = slotWidthFor(radiiAsc);

      let easingActive = false;

      // Ease per-source x toward target, write live values to DOM.
      for (let i = 0; i < N; i++) {
        const id = present[i];
        const target = targetXForSlot(i, N, slot);
        const wasPresent = presentLast.has(id);
        let x: number;
        if (!wasPresent) {
          xRef[id] = target;
          x = target;
        } else {
          const cur = xRef[id] ?? target;
          const next = cur + (target - cur) * EASE_FACTOR;
          if (Math.abs(target - next) < SETTLE_TOLERANCE) {
            xRef[id] = target;
            x = target;
          } else {
            xRef[id] = next;
            x = next;
            easingActive = true;
          }
        }
        const twh = viz.geometricSources[id].twh;
        const r = RADIUS_CONSTANT * Math.sqrt(twh);
        const totalTwh = viz.anchorState.totalTwh;
        const pct =
          totalTwh > 0
            ? pctText((twh / totalTwh) * 100)
            : '0%';
        writeNodeAttrs(id, x, r, pct, true);
      }
      // Hide sources no longer present.
      for (const id of SOURCE_IDS) {
        if (!presentSet.has(id)) {
          delete xRef[id];
          writeNodeAttrs(id, 0, 0, '', false);
        }
      }
      // Sync presentLast for the next tick.
      presentLast.clear();
      presentSet.forEach((id) => presentLast.add(id));

      rafId = easingActive ? requestAnimationFrame(tick) : null;
    };

    const scheduleTick = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(tick);
    };

    // Subscribe - every store update wakes the RAF.
    const unsubscribe = poster003Store.subscribe(() => scheduleTick());

    // Initial paint at the current store state.
    scheduleTick();

    return () => {
      unsubscribe();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
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

  return (
    <div
      className="relative w-full mx-auto"
      style={{ aspectRatio: '473.86 / 306.98', maxWidth: 900 }}
    >
      <svg
        viewBox={parsed?.viewBox ?? '347.81 640.02 473.86 306.98'}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        className="absolute inset-0 block"
        // overflow=visible so a cluster wider than the natural
        // viewBox span renders outermost nodes instead of clipping.
        style={{ overflow: 'visible' }}
        aria-hidden="true"
      >
        {SOURCE_IDS.map((id) => {
          const isNuclear = id === 'nuclear';
          const fill = isNuclear ? STROKE_NUCLEAR : STROKE_OTHER;
          const labelColor = isNuclear ? STROKE_NUCLEAR : '#0d1a1e';
          return (
            <g
              key={id}
              ref={(el) => {
                elementRefs.current[id].group = el;
              }}
              display="none"
            >
              <path
                ref={(el) => {
                  elementRefs.current[id].link = el;
                }}
                fill="none"
                stroke={STROKE_LINK}
                strokeWidth={0.5}
                strokeMiterlimit={10}
              />
              <circle
                ref={(el) => {
                  elementRefs.current[id].circle = el;
                }}
                cy={BASELINE_Y}
                fill={fill}
                stroke={STROKE_LINK}
                strokeMiterlimit={10}
                strokeWidth={0.5}
              />
              <text
                ref={(el) => {
                  elementRefs.current[id].nameText = el;
                }}
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
                ref={(el) => {
                  elementRefs.current[id].pctText = el;
                }}
                textAnchor="middle"
                fontFamily="'Playfair', Georgia, serif"
                fontSize={8}
                fontWeight={600}
                fill={labelColor}
                className="tabular-nums"
              />
            </g>
          );
        })}
      </svg>
      {parsed && (
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          dangerouslySetInnerHTML={{ __html: parsed.staticOverlay }}
        />
      )}
    </div>
  );
}

export default memo(Poster003DendrogramImpl);
