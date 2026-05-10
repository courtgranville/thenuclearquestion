// ─────────────────────────────────────────────────────────────────
// Poster005Dendrogram.tsx — 2x2 status dendrogram grid.
//
// Court round-3 spec: split the single-row dendrogram into a 2x2
// grid (Under Construction TL, Retired TR, Operating BL, Cancelled
// BR). Each quadrant scales up its hub form to roughly half the
// page width — gives the poster-001 / 006 / homepage level of
// resolution Court asked for.
//
// All four DendroQuadrant instances share the same poster005Store,
// so hover and filter wire across quadrants and to the map +
// timeline automatically.
// ─────────────────────────────────────────────────────────────────

import Poster005DendroQuadrant from '@/components/Poster005DendroQuadrant';

export default function Poster005Dendrogram() {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10 md:gap-y-8">
        <Poster005DendroQuadrant status="underConstruction" />
        <Poster005DendroQuadrant status="retired" />
        <Poster005DendroQuadrant status="operating" />
        <Poster005DendroQuadrant status="cancelled" />
      </div>
    </div>
  );
}
