// ─────────────────────────────────────────────────────────────────
// Poster005StatusLegend.tsx - four-button status filter.
//
// Drives the global filteredStatus in poster005Store. Map, dendrogram,
// and timeline all subscribe to that store; clicking a button toggles
// the filter (click again to clear). Active button is shown with a
// coloured chip + bold weight.
//
// Click toggles. There is no time-scrub or slider - the brief
// explicitly rules out a time-based approach for this poster.
// ─────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import {
  REACTORS,
  STATUS_COLOUR,
  STATUS_LABEL,
  STATUS_TOTALS,
  type ReactorStatus,
} from '@/lib/poster005Data';
import { poster005Store } from '@/lib/poster005Store';
import PosterControlButton from '@/components/PosterControlButton';

const STATUS_ORDER: ReactorStatus[] = [
  'underConstruction',
  'operating',
  'retired',
  'cancelled',
];

export default function Poster005StatusLegend() {
  const [filtered, setFiltered] = useState(poster005Store.getCurrent().filteredStatus);

  useEffect(() => {
    return poster005Store.subscribe((s) => setFiltered(s.filteredStatus));
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {STATUS_ORDER.map((status) => {
          const isActive = filtered === status;
          const count = STATUS_TOTALS[status].count;
          const mw = STATUS_TOTALS[status].mw;
          const colour = STATUS_COLOUR[status];
          return (
            <PosterControlButton
              key={status}
              label={STATUS_LABEL[status]}
              isActive={isActive}
              accentColour={colour}
              onClick={() => poster005Store.toggleFilteredStatus(status)}
              leadingDot
              aux={`${count} · ${mw.toLocaleString()} MW`}
              ariaLabel={`Filter to ${STATUS_LABEL[status]}, ${count} reactors, ${mw.toLocaleString()} MW`}
            />
          );
        })}
        {filtered !== null && (
          <button
            type="button"
            onClick={() => poster005Store.setFilteredStatus(null)}
            className="text-sm italic text-muted-foreground hover:text-foreground transition-colors duration-150 px-2"
            style={{ fontFamily: "'Playfair', Georgia, serif" }}
            aria-label="Clear filter"
          >
            clear
          </button>
        )}
      </div>

      {/* Sanity: every status totals row sourced from STATUS_TOTALS,
          not recomputed from REACTORS. The print's headlines are
          canonical (per provenance note in poster005Data.ts). */}
      {import.meta.env.DEV && filtered !== null && (
        <p
          className="mt-2 text-center text-sm italic text-muted-foreground"
          style={{ fontFamily: "'Playfair', Georgia, serif" }}
        >
          showing {REACTORS.filter((r) => r.status === filtered).length} reactors of {REACTORS.length}
        </p>
      )}
    </div>
  );
}
