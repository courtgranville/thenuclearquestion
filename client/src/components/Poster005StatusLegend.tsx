// ─────────────────────────────────────────────────────────────────
// Poster005StatusLegend.tsx — four-button status filter.
//
// Drives the global filteredStatus in poster005Store. Map, dendrogram,
// and timeline all subscribe to that store; clicking a button toggles
// the filter (click again to clear). Active button is shown with a
// coloured chip + bold weight.
//
// Click toggles. There is no time-scrub or slider — the brief
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
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        {STATUS_ORDER.map((status) => {
          const isActive = filtered === status;
          const count = STATUS_TOTALS[status].count;
          const mw = STATUS_TOTALS[status].mw;
          const colour = STATUS_COLOUR[status];
          return (
            <button
              key={status}
              type="button"
              onClick={() => poster005Store.toggleFilteredStatus(status)}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-sm border bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer transition-colors duration-200"
              style={{
                borderColor: isActive ? colour : 'rgba(13,26,30,0.18)',
                backgroundColor: isActive ? `${colour}14` : 'transparent',
                fontFamily: "'Playfair', Georgia, serif",
              }}
              aria-pressed={isActive}
              aria-label={`Filter to ${STATUS_LABEL[status]}, ${count} reactors, ${mw.toLocaleString()} MW`}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: colour }}
              />
              <span
                className="text-sm"
                style={{
                  color: isActive ? colour : 'rgba(13,26,30,0.78)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {STATUS_LABEL[status]}
              </span>
              <span
                className="text-xs text-muted-foreground tabular-nums"
                style={{ fontFamily: "'Playfair', Georgia, serif" }}
              >
                {count} · {mw.toLocaleString()} MW
              </span>
            </button>
          );
        })}
        {filtered !== null && (
          <button
            type="button"
            onClick={() => poster005Store.setFilteredStatus(null)}
            className="text-xs italic text-muted-foreground hover:text-foreground transition-colors duration-150 px-2"
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
          className="mt-2 text-center text-xs italic text-muted-foreground"
          style={{ fontFamily: "'Playfair', Georgia, serif" }}
        >
          showing {REACTORS.filter((r) => r.status === filtered).length} reactors of {REACTORS.length}
        </p>
      )}
    </div>
  );
}
