import { useEffect, useMemo, useState } from 'react';
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
let cachedTextOverlay: string | null = null;
let cachedViewBox: string | null = null;

interface ParsedDots {
  positions: DotPosition[];
  textOverlay: string;
  viewBox: string;
}

function parseDotsSvg(svgText: string): ParsedDots | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  const viewBox = svg.getAttribute('viewBox') || '0 0 100 100';
  const circleEls = Array.from(svg.querySelectorAll('circle'));
  const positions: DotPosition[] = circleEls.map((c) => ({
    cx: parseFloat(c.getAttribute('cx') || '0'),
    cy: parseFloat(c.getAttribute('cy') || '0'),
  }));
  // Strip circles. The remaining text-label paths are the overlay.
  circleEls.forEach((c) => c.remove());
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute(
    'style',
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;',
  );
  const textOverlay = new XMLSerializer().serializeToString(svg);
  return { positions, textOverlay, viewBox };
}

export interface Poster003DotsProps {
  vizState: VizState;
  /** True while the slider is being dragged (live geometry). */
  dragging: boolean;
}

export default function Poster003Dots({
  vizState,
  dragging,
}: Poster003DotsProps) {
  const [positions, setPositions] = useState<DotPosition[] | null>(
    cachedPositions,
  );
  const [textOverlay, setTextOverlay] = useState<string | null>(
    cachedTextOverlay,
  );
  const [viewBox, setViewBox] = useState<string | null>(cachedViewBox);
  const [parseError, setParseError] = useState(false);

  // ─── One-time fetch + parse ─────────────────────────────────────
  useEffect(() => {
    if (cachedPositions && cachedTextOverlay && cachedViewBox) return;
    let cancelled = false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', SVG_URL, true);
    xhr.responseType = 'text';
    xhr.onload = () => {
      if (cancelled) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        const parsed = parseDotsSvg(xhr.responseText);
        if (parsed && parsed.positions.length === NUM_DOTS) {
          cachedPositions = parsed.positions;
          cachedTextOverlay = parsed.textOverlay;
          cachedViewBox = parsed.viewBox;
          setPositions(parsed.positions);
          setTextOverlay(parsed.textOverlay);
          setViewBox(parsed.viewBox);
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
        style={{ aspectRatio: '219.87 / 321.48', maxWidth: 600 }}
      />
    );
  }

  return (
    <div
      className="relative w-full mx-auto"
      style={{ aspectRatio: '219.87 / 321.48', maxWidth: 600 }}
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
      {textOverlay && (
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          dangerouslySetInnerHTML={{ __html: textOverlay }}
        />
      )}
    </div>
  );
}
