// ─────────────────────────────────────────────────────────────────
// Poster005Legend.tsx - designed legend for the poster page.
//
// Court round-6: rather than embed the print's 005-legend.svg
// verbatim (where the elements run as one long horizontal strip),
// we extract the same iconography and re-lay it as a multi-column
// React component so each item reads clearly.
//
// Four sections (each a column on desktop, stacked on mobile):
//   1. Map - how to read the geographic dots
//   2. Dendrogram - how the four hubs cluster reactors by status
//      and how leaf-size encodes capacity
//   3. Timeline - what each bar / dot / dashed line means
//   4. Methodology - the editorial note about cancelled projects
//
// All icons are tiny inline SVGs that mirror the print's marks:
// status colour dots, hub→leaf miniature, capacity-circle pair,
// and per-phase bar examples. Using the canonical STATUS_COLOUR
// from poster005Data so the legend's swatches are guaranteed to
// match the live visualisations.
// ─────────────────────────────────────────────────────────────────

import { STATUS_COLOUR } from '@/lib/poster005Data';

const SERIF_STYLE = { fontFamily: "'Playfair', Georgia, serif" } as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4
        className="font-serif text-base text-foreground mb-3"
        style={{ fontWeight: 600 }}
      >
        {title}
      </h4>
      <div className="space-y-3" style={SERIF_STYLE}>
        {children}
      </div>
    </div>
  );
}

function StatusRow({ colour, label }: { colour: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="inline-block w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: colour }}
      />
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}

export default function Poster005Legend() {
  return (
    <div className="w-full container">
      <div className="max-w-3xl mx-auto pt-8 border-t border-border/40">
        <p
          className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-2"
          style={SERIF_STYLE}
        >
          How to read these
        </p>
        <h3
          className="font-serif text-2xl text-foreground mb-6"
          style={{ fontWeight: 600 }}
        >
          Legend
        </h3>
        <div className="grid grid-cols-1 gap-y-6">
          {/* 1. Map */}
          <Section title="The map">
            <p className="text-sm text-muted-foreground leading-snug">
              Each dot marks one reactor project at its geographic
              location. Colour shows status.
            </p>
            <div className="space-y-1.5">
              <StatusRow colour={STATUS_COLOUR.operating} label="Operating" />
              <StatusRow colour={STATUS_COLOUR.underConstruction} label="Under construction" />
              <StatusRow colour={STATUS_COLOUR.retired} label="Retired" />
              <StatusRow colour={STATUS_COLOUR.cancelled} label="Cancelled" />
            </div>
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Cluster insets
              </p>
              <svg
                width={180}
                height={50}
                viewBox="0 0 180 50"
                aria-hidden
              >
                {/* Source dot on UK */}
                <circle cx="22" cy="25" r="4" fill={STATUS_COLOUR.retired} fillOpacity={0.55} stroke="#0d1a1e" />
                {/* Dotted leader */}
                <line x1="28" y1="25" x2="100" y2="25" stroke="#0d1a1e" strokeOpacity={0.5} strokeWidth={0.8} strokeDasharray="2 3" />
                {/* Zoom circle */}
                <circle cx="140" cy="25" r="22" fill="none" stroke="#0d1a1e" strokeOpacity={0.6} strokeWidth={0.6} />
                <circle cx="133" cy="22" r="3.5" fill={STATUS_COLOUR.retired} fillOpacity={0.55} stroke="#0d1a1e" />
                <circle cx="144" cy="25" r="3.5" fill={STATUS_COLOUR.cancelled} fillOpacity={0.55} stroke="#0d1a1e" />
                <circle cx="138" cy="30" r="3.5" fill={STATUS_COLOUR.underConstruction} fillOpacity={0.55} stroke="#0d1a1e" />
              </svg>
              <p className="text-xs text-muted-foreground leading-snug mt-1">
                Where reactors cluster too tightly to read (Sellafield, Wylfa,
                Sizewell), an inset zooms in.
              </p>
            </div>
          </Section>

          {/* 2. Dendrogram */}
          <Section title="The dendrogram">
            <p className="text-sm text-muted-foreground leading-snug">
              72 reactors organised by status (the four hubs) and by project.
              Leaf-circle size shows nameplate capacity.
            </p>
            <div className="pt-2">
              <svg width={180} height={120} viewBox="0 0 180 120" aria-hidden>
                {/* Hub */}
                <circle cx="90" cy="22" r="14" fill={STATUS_COLOUR.retired} fillOpacity={0.4} stroke={STATUS_COLOUR.retired} strokeWidth={0.6} />
                {/* Connector Béziers fanning to leaves */}
                <path d="M 90 36 C 90 70, 40 70, 40 100" fill="none" stroke="#0d1a1e" strokeOpacity={0.4} strokeWidth={0.7} />
                <path d="M 90 36 C 90 70, 90 70, 90 100" fill="none" stroke="#0d1a1e" strokeOpacity={0.4} strokeWidth={0.7} />
                <path d="M 90 36 C 90 70, 140 70, 140 100" fill="none" stroke="#0d1a1e" strokeOpacity={0.4} strokeWidth={0.7} />
                {/* Three leaves: small/med/large */}
                <circle cx="40" cy="100" r="4" fill={STATUS_COLOUR.retired} fillOpacity={0.7} />
                <circle cx="90" cy="100" r="6" fill={STATUS_COLOUR.retired} fillOpacity={0.7} />
                <circle cx="140" cy="100" r="9" fill={STATUS_COLOUR.retired} fillOpacity={0.7} />
              </svg>
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums mt-1 px-2">
                <span>77 MW</span>
                <span>1,720 MW</span>
              </div>
            </div>
          </Section>

          {/* 3. Timeline */}
          <Section title="The timeline">
            <p className="text-sm text-muted-foreground leading-snug">
              One vertical line per reactor, plotted from construction year
              (top) to shutdown (bottom). Colour shows the phase.
            </p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <svg width={20} height={50} viewBox="0 0 20 50" aria-hidden>
                  <line x1="10" y1="6" x2="14" y2="6" stroke={STATUS_COLOUR.cancelled} strokeWidth={1.4} strokeLinecap="round" />
                  <line x1="6" y1="6" x2="14" y2="6" stroke={STATUS_COLOUR.cancelled} strokeWidth={1.4} strokeLinecap="round" />
                  <line x1="10" y1="6" x2="10" y2="14" stroke={STATUS_COLOUR.cancelled} strokeWidth={2.2} strokeLinecap="round" />
                  <line x1="10" y1="14" x2="10" y2="44" stroke={STATUS_COLOUR.operating} strokeWidth={2.2} strokeLinecap="round" />
                  <line x1="6" y1="44" x2="14" y2="44" stroke={STATUS_COLOUR.operating} strokeWidth={1.4} strokeLinecap="round" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-foreground">Retired</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Construction (red) → operating (green) → shutdown tick.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg width={20} height={50} viewBox="0 0 20 50" aria-hidden>
                  <line x1="6" y1="6" x2="14" y2="6" stroke={STATUS_COLOUR.cancelled} strokeWidth={1.4} strokeLinecap="round" />
                  <line x1="10" y1="6" x2="10" y2="14" stroke={STATUS_COLOUR.cancelled} strokeWidth={2.2} strokeLinecap="round" />
                  <line x1="10" y1="14" x2="10" y2="46" stroke={STATUS_COLOUR.operating} strokeWidth={2.2} strokeLinecap="round" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-foreground">Operating</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Still running, no shutdown tick.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg width={20} height={50} viewBox="0 0 20 50" aria-hidden>
                  <rect x="6.5" y="4" width="7" height="4" fill={STATUS_COLOUR.underConstruction} />
                  <line x1="10" y1="10" x2="10" y2="46" stroke={STATUS_COLOUR.underConstruction} strokeWidth={2.2} strokeDasharray="3 2.5" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-foreground">Under construction</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Anchor at construction start, dashed to projected COD.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg width={20} height={50} viewBox="0 0 20 50" aria-hidden>
                  <circle cx="10" cy="22" r="4" fill="none" stroke={STATUS_COLOUR.retired} strokeWidth={1.4} />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-foreground">Cancelled</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Hollow grey circle at the cancellation year.
                  </p>
                </div>
              </div>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}
