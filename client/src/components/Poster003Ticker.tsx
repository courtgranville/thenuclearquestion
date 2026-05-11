import { memo, useEffect, useRef } from 'react';
import { poster003Store } from '@/lib/poster003Store';

/**
 * Poster 003 - live ticker totals beneath the dot grid (commit 19).
 *
 * Decoupled from React: the component renders its DOM tree once on
 * mount and subscribes to poster003Store. The subscription callback
 * writes the new red/green counts to the two <span>s via refs and
 * toggles the lives-saved container's display when the count
 * crosses zero. The component never re-renders during slider drag.
 *
 * Editorial relaxation note (commit 9): these aggregate dot totals
 * are the deliberate ticker exception to the snap-only rule. The
 * counts derive from the same store state that drives the dot grid
 * canvas, so the on-screen numbers are honest counts of dots
 * actually rendered. Per-source mortality (deaths-by-source labels)
 * and per-source TWh % (dendrogram) stay snap-only.
 */

const NUM_DOTS = 699;

function targetGreenCount(
  geometricTotalDeaths: number,
  livesSavedAtAnchor: number,
  dragging: boolean,
): number {
  const raw = dragging
    ? NUM_DOTS - geometricTotalDeaths
    : livesSavedAtAnchor;
  return Math.max(0, Math.min(NUM_DOTS, Math.round(raw)));
}

function formatCount(n: number): string {
  return n.toLocaleString();
}

function Poster003TickerImpl() {
  const redValueRef = useRef<HTMLSpanElement | null>(null);
  const greenValueRef = useRef<HTMLSpanElement | null>(null);
  const greenContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let lastRed = -1;
    let lastGreen = -1;

    const writeNumbers = () => {
      const viz = poster003Store.getCurrent();
      const dragging = poster003Store.isDragging();
      const greenCount = targetGreenCount(
        viz.geometricTotalDeaths,
        viz.anchorState.livesSaved,
        dragging,
      );
      const redCount = NUM_DOTS - greenCount;

      if (redCount !== lastRed && redValueRef.current) {
        redValueRef.current.textContent = formatCount(redCount);
        lastRed = redCount;
      }
      if (greenCount !== lastGreen) {
        if (greenValueRef.current) {
          greenValueRef.current.textContent = formatCount(greenCount);
        }
        if (greenContainerRef.current) {
          greenContainerRef.current.style.display =
            greenCount > 0 ? '' : 'none';
        }
        lastGreen = greenCount;
      }
    };

    // Initial write - picks up whatever the slider's current state is.
    writeNumbers();

    const unsubscribe = poster003Store.subscribe(() => writeNumbers());
    return () => unsubscribe();
  }, []);

  // The dots SVG is now cropped to the actual dot bbox (no dead
  // zone below), so the ticker can sit visually close to the dot
  // mass - gap roughly equal to one numeral line-height.
  const NUMBER_STYLE: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 'clamp(40px, 6vw, 64px)',
    lineHeight: 1,
    fontFamily: "'Playfair', Georgia, serif",
  };
  const SUB_STYLE: React.CSSProperties = {
    fontFamily: "'Playfair', Georgia, serif",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 mt-1 flex gap-10 flex-wrap justify-center">
      <div className="text-center">
        <span
          ref={redValueRef}
          className="block font-serif tabular-nums"
          style={{ ...NUMBER_STYLE, color: '#a51e22' }}
        >
          699
        </span>
        <span
          className="block text-[11px] tracking-[0.18em] uppercase text-muted-foreground mt-2"
          style={SUB_STYLE}
        >
          Estimated deaths per year
        </span>
      </div>
      <div
        ref={greenContainerRef}
        className="text-center"
        style={{ display: 'none' }}
      >
        <span
          ref={greenValueRef}
          className="block font-serif tabular-nums"
          style={{ ...NUMBER_STYLE, color: '#217B3D' }}
        >
          0
        </span>
        <span
          className="block text-[11px] tracking-[0.18em] uppercase text-muted-foreground mt-2"
          style={SUB_STYLE}
        >
          Lives saved per year
        </span>
      </div>
    </div>
  );
}

export default memo(Poster003TickerImpl);
