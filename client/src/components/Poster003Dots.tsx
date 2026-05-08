import { useEffect, useMemo, useRef, useState } from 'react';
import { DOT_ORDERING, type VizState } from '@/lib/poster003Data';

/**
 * Poster 003 — death-toll dots layer (699 SVG circles).
 *
 * Drives a stable seeded sequence of red→green flips controlled by
 * the slider. During drag the green-count tracks the geometric
 * (interpolated) lives-saved value continuously; on release the
 * count snap-corrects to the exact anchor lives-saved.
 *
 * Editorial constraint: there is NO source attribution per dot.
 * DOT_ORDERING is a pseudo-random permutation; tooltips and hover
 * states are deliberately absent. Death-by-source is told by the
 * deaths-blobs layer, not by individual dots.
 */

const SVG_URL = '/assets/003-S1-dots_009b59b1.svg';
const NUM_DOTS = 699;
const DOT_RADIUS = 2.16;
const COLOR_RED = '#a51e23';
const COLOR_GREEN = '#217b3d';
const DOT_OPACITY = 0.85;

interface DotPosition {
  cx: number;
  cy: number;
}

// Module-level cache so a re-mount doesn't re-fetch and re-parse.
let cachedPositions: DotPosition[] | null = null;
let cachedViewBox: string | null = null;
let cachedAspect = 1;

interface ParsedDots {
  positions: DotPosition[];
  /** Tight viewBox cropped to the actual dot bbox + small padding. */
  viewBox: string;
  /** Aspect ratio derived from the cropped viewBox. */
  aspect: number;
}

// Padding (in viewBox units) around the dot bbox in the cropped
// viewBox. Leaves a little breathing room without re-introducing
// the dead zone the source SVG had below the dots (where the
// burned-in "699 / ESTIMATED DEATHS PER YEAR" text used to live).
const VIEWBOX_PADDING = 6;

// Pulls only the 699 circle positions and computes a tight viewBox
// cropped to the actual dot bbox. The source SVG's viewBox has
// ~34% empty space below the dots (where the burned-in number/
// subtitle used to live) — we strip the text and tighten the
// viewBox so the ticker can sit visually close to the dot mass.
function parseDotsSvg(svgText: string): ParsedDots | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  const circleEls = Array.from(svg.querySelectorAll('circle'));
  if (circleEls.length === 0) return null;
  const positions: DotPosition[] = circleEls.map((c) => ({
    cx: parseFloat(c.getAttribute('cx') || '0'),
    cy: parseFloat(c.getAttribute('cy') || '0'),
  }));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of positions) {
    if (p.cx < minX) minX = p.cx;
    if (p.cx > maxX) maxX = p.cx;
    if (p.cy < minY) minY = p.cy;
    if (p.cy > maxY) maxY = p.cy;
  }
  const x = minX - DOT_RADIUS - VIEWBOX_PADDING;
  const y = minY - DOT_RADIUS - VIEWBOX_PADDING;
  const w = (maxX - minX) + 2 * (DOT_RADIUS + VIEWBOX_PADDING);
  const h = (maxY - minY) + 2 * (DOT_RADIUS + VIEWBOX_PADDING);
  return {
    positions,
    viewBox: `${x} ${y} ${w} ${h}`,
    aspect: w / h,
  };
}

export interface Poster003DotsProps {
  vizState: VizState;
  /** True while the slider is being dragged (live geometry). */
  dragging: boolean;
  /**
   * Reports the current red/green dot counts each render. Used by
   * the parent to drive the live ticker totals beneath the grid.
   *
   * Editorial note: this is the deliberate ticker relaxation —
   * mid-drag the parent displays these counts as continuous numbers.
   * The values are honest counts of dots actually rendered, not
   * interpolated mortality estimates. See poster003Data.ts and the
   * Poster003TickerTotals comment for context.
   */
  onCountsChange?: (counts: { redCount: number; greenCount: number }) => void;
}

export default function Poster003Dots({
  vizState,
  dragging,
  onCountsChange,
}: Poster003DotsProps) {
  const [positions, setPositions] = useState<DotPosition[] | null>(
    cachedPositions,
  );
  const [viewBox, setViewBox] = useState<string | null>(cachedViewBox);
  const [aspect, setAspect] = useState<number>(cachedAspect);
  const [parseError, setParseError] = useState(false);

  // ─── One-time fetch + parse ─────────────────────────────────────
  useEffect(() => {
    if (cachedPositions && cachedViewBox) return;
    let cancelled = false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', SVG_URL, true);
    xhr.responseType = 'text';
    xhr.responseType = 'text';
    xhr.onload = () => {
      if (cancelled) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        const parsed = parseDotsSvg(xhr.responseText);
        if (parsed && parsed.positions.length === NUM_DOTS) {
          cachedPositions = parsed.positions;
          cachedViewBox = parsed.viewBox;
          cachedAspect = parsed.aspect;
          setPositions(parsed.positions);
          setViewBox(parsed.viewBox);
          setAspect(parsed.aspect);
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

  // ─── Compute target green count from vizState + dragging ─────────
  // While dragging: track the interpolated lives-saved so dots flip
  // continuously. On release: snap to the anchor's exact value.
  const targetGreen = useMemo(() => {
    const raw = dragging
      ? NUM_DOTS - vizState.geometricTotalDeaths
      : vizState.anchorState.livesSaved;
    return Math.max(0, Math.min(NUM_DOTS, Math.round(raw)));
  }, [dragging, vizState]);

  // Build the boolean array deterministically from targetGreen +
  // DOT_ORDERING. Walking the ordering keeps the flip sequence
  // stable across forward and backward motion.
  const isGreen = useMemo(() => {
    const arr = new Array(NUM_DOTS).fill(false);
    for (let i = 0; i < targetGreen; i++) {
      arr[DOT_ORDERING[i]] = true;
    }
    return arr;
  }, [targetGreen]);

  // Report the current counts to the parent (used to drive the
  // live ticker totals). Identity of the callback is stabilised via
  // a ref so we don't re-fire on parent re-render alone.
  const onCountsChangeRef = useRef(onCountsChange);
  onCountsChangeRef.current = onCountsChange;
  useEffect(() => {
    onCountsChangeRef.current?.({
      redCount: NUM_DOTS - targetGreen,
      greenCount: targetGreen,
    });
  }, [targetGreen]);

  if (parseError) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <p className="text-base text-muted-foreground">
          Unable to load the dots visualisation.
        </p>
      </div>
    );
  }

  if (!positions || !viewBox) {
    return (
      <div
        className="w-full mx-auto"
        style={{ aspectRatio: aspect, maxWidth: 600 }}
      />
    );
  }

  return (
    <div
      className="relative w-full mx-auto"
      style={{ aspectRatio: aspect, maxWidth: 600 }}
    >
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        className="absolute inset-0 block"
        aria-hidden="true"
      >
        {positions.map((p, i) => (
          <circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r={DOT_RADIUS}
            fill={isGreen[i] ? COLOR_GREEN : COLOR_RED}
            opacity={DOT_OPACITY}
          />
        ))}
      </svg>
    </div>
  );
}
