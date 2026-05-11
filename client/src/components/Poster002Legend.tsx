// ─────────────────────────────────────────────────────────────────
// Poster002Legend.tsx — designed legend for poster 002.
//
// Source: client/public/assets/002-legend.svg. Single-section
// legend: each source = organic form with a green surface
// (land footprint) and a blue volume (water consumption) sitting
// above it.
// ─────────────────────────────────────────────────────────────────

const SERIF_STYLE = { fontFamily: "'Playfair', Georgia, serif" } as const;
const WATER_BLUE = '#8a9aac';
const LAND_GREEN = '#92a987';

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

function MarkerRow({
  swatch,
  label,
}: {
  swatch: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">{swatch}</div>
      <span className="text-sm text-foreground" style={SERIF_STYLE}>
        {label}
      </span>
    </div>
  );
}

export default function Poster002Legend() {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
          <Section title="Each source is an organic form">
            <p className="text-sm text-muted-foreground leading-relaxed">
              A green surface shows the source's lifetime land footprint,
              and a blue volume shows its lifetime water consumption
              sitting above it. Larger surface, more land used; taller
              volume, more water consumed.
            </p>
          </Section>

          <Section title="Two marks per source">
            <div className="space-y-3">
              <MarkerRow
                swatch={
                  <svg width={60} height={32} viewBox="0 0 60 32" aria-hidden>
                    <circle cx={48} cy={16} r={8} fill={WATER_BLUE} fillOpacity={0.7} />
                    <line x1={4} y1={16} x2={36} y2={16} stroke="#0d1a1e" strokeOpacity={0.45} strokeWidth={0.8} strokeDasharray="3 2" />
                  </svg>
                }
                label="Water consumption, in m³/MWh"
              />
              <MarkerRow
                swatch={
                  <svg width={60} height={32} viewBox="0 0 60 32" aria-hidden>
                    <polygon points="48,8 56,16 48,24 40,16" fill={LAND_GREEN} fillOpacity={0.7} />
                    <line x1={4} y1={16} x2={36} y2={16} stroke="#0d1a1e" strokeOpacity={0.45} strokeWidth={0.8} strokeDasharray="3 2" />
                  </svg>
                }
                label="Land footprint, in m²·year/MWh"
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
