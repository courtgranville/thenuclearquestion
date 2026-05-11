// ─────────────────────────────────────────────────────────────────
// Poster005ReactorDetail.tsx - hover detail panel.
//
// Subscribes to poster005Store and renders details for whichever
// reactor is currently hovered (across the map, dendrogram, or
// timeline - they all set the same hoveredReactor). When nothing is
// hovered the panel shows a soft instruction. Empty-state height
// matches populated-state so the layout doesn't jump.
// ─────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import {
  REACTOR_BY_ID,
  STATUS_COLOUR,
  STATUS_LABEL,
} from '@/lib/poster005Data';
import { poster005Store } from '@/lib/poster005Store';

function formatYear(y: number | null): string {
  if (y === null) return ' - ';
  return String(y);
}

function formatMw(mw: number | null): string {
  if (mw === null) return ' - ';
  return `${mw.toLocaleString()} MW`;
}

function formatLifespan(start: number | null, end: number | null): string {
  if (start === null && end === null) return ' - ';
  if (start === null) return `up to ${end}`;
  if (end === null) return `from ${start}`;
  return `${start} - ${end}`;
}

export default function Poster005ReactorDetail() {
  const [hoveredId, setHoveredId] = useState(poster005Store.getCurrent().hoveredReactor);

  useEffect(() => {
    return poster005Store.subscribe((s) => setHoveredId(s.hoveredReactor));
  }, []);

  const reactor = hoveredId ? REACTOR_BY_ID[hoveredId] : null;

  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 min-h-[140px]"
      aria-live="polite"
    >
      {!reactor && (
        <p
          className="text-center text-sm text-muted-foreground italic"
          style={{ fontFamily: "'Playfair', Georgia, serif" }}
        >
          Hover any reactor on the map, dendrogram, or timeline for its
          name, site, capacity, and key dates.
        </p>
      )}
      {reactor && (
        <div
          className="rounded-sm border p-4 sm:p-5"
          style={{
            borderColor: 'rgba(13,26,30,0.18)',
            borderLeftColor: STATUS_COLOUR[reactor.status],
            borderLeftWidth: 3,
          }}
        >
          <div className="flex items-baseline gap-3 flex-wrap mb-2">
            <h4
              className="font-serif text-lg"
              style={{
                color: STATUS_COLOUR[reactor.status],
                fontWeight: 600,
              }}
            >
              {reactor.name}
            </h4>
            <span
              className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              {STATUS_LABEL[reactor.status]}
            </span>
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"
            style={{ fontFamily: "'Playfair', Georgia, serif" }}
          >
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                Site
              </p>
              <p className="text-foreground">{reactor.site ?? ' - '}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                Capacity
              </p>
              <p className="text-foreground tabular-nums">{formatMw(reactor.capacityMw)}</p>
            </div>

            {reactor.status === 'cancelled' && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                  Cancelled
                </p>
                <p className="text-foreground tabular-nums">
                  {formatYear(reactor.cancellationYear)}
                  {reactor.cancellationYearInferred && (
                    <span className="ml-1 italic text-xs text-muted-foreground">(inferred)</span>
                  )}
                </p>
              </div>
            )}

            {reactor.status !== 'cancelled' && (
              <>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                    Construction
                  </p>
                  <p className="text-foreground tabular-nums">
                    {formatYear(reactor.constructionStart)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                    {reactor.status === 'underConstruction' ? 'Planned grid' : 'Grid connection'}
                  </p>
                  <p className="text-foreground tabular-nums">
                    {formatYear(reactor.commercialOperation)}
                  </p>
                </div>
              </>
            )}
          </div>

          {reactor.status === 'retired' && (
            <p
              className="mt-3 text-xs italic text-muted-foreground"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              Operating life: {formatLifespan(reactor.commercialOperation, reactor.shutdown)}
            </p>
          )}
          {reactor.status === 'operating' && (
            <p
              className="mt-3 text-xs italic text-muted-foreground"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              Operating since {reactor.commercialOperation}; current planning horizon{' '}
              {reactor.shutdown}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
