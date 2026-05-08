/**
 * Poster 004 — Viz assembly.
 *
 * Composes the dendrogram from its sibling layers. This component
 * is the only thing PosterPage.tsx imports for poster id "004".
 *
 * Layer stack (back to front, bottom to top):
 *   - <svg> viewport
 *     - Skeleton    (dashed spokes)
 *     - Sectors     (sector dots + labels)
 *     - Carriers    (carrier blobs + labels, hover targets)
 *     - Hub         (centre + label, hover target)
 *   - Pulses canvas (absolute-positioned overlay)
 *
 * Sector dots are placed BELOW Carriers in the SVG stack so that
 * during the cascade-2 grow-on-arrival, the tiny circles emerge
 * from behind their parent carrier blob — visually consistent with
 * the print's read direction.
 *
 * Around the diagram:
 *   - FramingLabel    (above)
 *   - HonestyCaveat   (below diagram)
 *   - Buttons row     (below caveat)
 *
 * Wholesale replaces the previous InteractiveSVG-based version.
 */

import { useEffect } from 'react';
import { DENDROGRAM_SIZE } from '@/lib/poster004Data';
import { reset as resetEngine } from '@/lib/poster004Engine';
import Poster004Skeleton from '@/components/Poster004Skeleton';
import Poster004Hub from '@/components/Poster004Hub';
import Poster004Carriers from '@/components/Poster004Carriers';
import Poster004Sectors from '@/components/Poster004Sectors';
import Poster004Pulses from '@/components/Poster004Pulses';
import Poster004ProgressButton from '@/components/Poster004ProgressButton';
import Poster004ResetButton from '@/components/Poster004ResetButton';
import Poster004StaticButton from '@/components/Poster004StaticButton';
import Poster004FramingLabel from '@/components/Poster004FramingLabel';
import Poster004HonestyCaveat from '@/components/Poster004HonestyCaveat';

export default function Poster004Viz() {
  // Reset the store on mount so navigating back to the page always
  // starts from DEFAULT. Module-scope singleton retains state
  // across React tree unmounts otherwise. resetEngine() also
  // cancels any in-flight RAF loop, so the cleanup is the same.
  useEffect(() => {
    resetEngine();
    return () => {
      resetEngine();
    };
  }, []);

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4">
        <Poster004FramingLabel />

        <div
          className="relative mx-auto my-6"
          style={{
            width: '100%',
            maxWidth: DENDROGRAM_SIZE,
            aspectRatio: '1 / 1',
          }}
        >
          <svg
            viewBox={`0 0 ${DENDROGRAM_SIZE} ${DENDROGRAM_SIZE}`}
            width="100%"
            height="100%"
            role="img"
            aria-label="UK final energy 2024 by carrier and end-use sector. The hub is total final energy of 1,542 TWh; six carrier blobs radiate out, each branching to its end-use sectors."
            style={{ display: 'block' }}
          >
            <Poster004Skeleton />
            <Poster004Sectors />
            <Poster004Carriers />
            <Poster004Hub />
          </svg>
          <Poster004Pulses />
        </div>

        <div className="mt-8">
          <Poster004HonestyCaveat />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Poster004ProgressButton />
          <Poster004StaticButton />
          <Poster004ResetButton />
        </div>
      </div>
    </div>
  );
}
