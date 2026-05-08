/**
 * Poster 004 — Viz assembly (v2).
 *
 * Renders the dendrogram + pulses canvas + caveat + buttons. The
 * only thing PosterPage.tsx imports for poster id "004".
 *
 * Layer stack (bottom → top inside the SVG):
 *   - Skeleton            (black dashed spokes, opacity-controlled)
 *   - Sectors             (dots + labels, behind carriers so cascade
 *                          dots emerge from behind their parent blob)
 *   - Carriers            (blobs + labels, hover targets)
 *   - Hub                 (centre, hover target, drawn last so its
 *                          hit area is on top)
 *   - HoverInstruction    (small italic text below the diagram)
 *
 * Plus a Pulses canvas overlay positioned absolutely over the SVG
 * for the moving pulse-tips.
 *
 * Below the canvas:
 *   - HonestyCaveat       (verbatim print copy)
 *   - Buttons             (Play animation · View as poster · Reset)
 *
 * onMount: schedules the hover instruction to fade in after 800ms.
 * onUnmount: resets the engine + store so navigating away and back
 * always lands the user in DEFAULT.
 */

import { useEffect } from 'react';
import { DENDROGRAM_SIZE } from '@/lib/poster004Data';
import {
  reset as resetEngine,
  scheduleHoverInstruction,
} from '@/lib/poster004Engine';
import Poster004Skeleton from '@/components/Poster004Skeleton';
import Poster004Sectors from '@/components/Poster004Sectors';
import Poster004Carriers from '@/components/Poster004Carriers';
import Poster004Hub from '@/components/Poster004Hub';
import Poster004HoverInstruction from '@/components/Poster004HoverInstruction';
import Poster004Pulses from '@/components/Poster004Pulses';
import Poster004HonestyCaveat from '@/components/Poster004HonestyCaveat';
import Poster004Buttons from '@/components/Poster004Buttons';

export default function Poster004Viz() {
  useEffect(() => {
    // Always start a fresh visit in DEFAULT.
    resetEngine();
    scheduleHoverInstruction();
    return () => {
      resetEngine();
    };
  }, []);

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4">
        <div
          className="relative mx-auto"
          style={{
            width: '100%',
            maxWidth: 720,
            aspectRatio: '1 / 1',
          }}
        >
          <svg
            viewBox={`0 0 ${DENDROGRAM_SIZE} ${DENDROGRAM_SIZE}`}
            width="100%"
            height="100%"
            role="img"
            aria-label="UK final energy 2024 by carrier and end-use sector. Hub-and-spoke dendrogram: 1,542 TWh total at the centre, six carriers radiating outward, each branching to its end-use sectors."
            style={{
              display: 'block',
              touchAction: 'manipulation',
            }}
          >
            <Poster004Skeleton />
            <Poster004Sectors />
            <Poster004Carriers />
            <Poster004Hub />
            <Poster004HoverInstruction />
          </svg>
          <Poster004Pulses />
        </div>

        <div className="mt-8">
          <Poster004HonestyCaveat />
        </div>

        <div className="mt-6">
          <Poster004Buttons />
        </div>
      </div>
    </div>
  );
}
