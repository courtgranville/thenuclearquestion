// ─────────────────────────────────────────────────────────────────
// Poster004Legend.tsx - designed legend for poster 004.
//
// Source: client/public/assets/004-legend.svg. Two sections:
// dendrogram levels (Hub / Carrier / Sector) and carrier colour
// swatches (6 carriers). Plus a footnote about non-energy use.
// ─────────────────────────────────────────────────────────────────

const SERIF_STYLE = { fontFamily: "'Playfair', Georgia, serif" } as const;

const CARRIERS: { name: string; colour: string }[] = [
  { name: 'Bioenergy',   colour: '#217b3d' },
  { name: 'Electricity', colour: '#b5822e' },
  { name: 'Heat',        colour: '#4a6e70' },
  { name: 'Natural gas', colour: '#1c3867' },
  { name: 'Petroleum',   colour: '#a51e22' },
  { name: 'Solid fuel',  colour: '#7d736a' },
];

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

function LevelRow({
  ring,
  title,
  body,
}: {
  ring: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">{ring}</div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground leading-snug">{body}</p>
      </div>
    </div>
  );
}

function CarrierSwatch({ colour, name }: { colour: string; name: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="inline-block w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: colour }}
      />
      <span className="text-sm text-foreground">{name}</span>
    </div>
  );
}

export default function Poster004Legend() {
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
          className="font-serif text-2xl text-foreground mb-3"
          style={{ fontWeight: 600 }}
        >
          Legend
        </h3>
        <p
          className="text-sm text-muted-foreground leading-relaxed mb-6"
          style={SERIF_STYLE}
        >
          Each level of the dendrogram is sized by share of UK final energy
          in 2024.
        </p>
        <div className="grid grid-cols-1 gap-y-6">
          <Section title="Three dendrogram levels">
            <LevelRow
              ring={
                <svg width={48} height={48} viewBox="0 0 48 48" aria-hidden>
                  <circle cx={24} cy={24} r={22} fill="none" stroke="#0d1a1e" strokeOpacity={0.3} strokeWidth={0.8} />
                  <circle cx={24} cy={24} r={16} fill="none" stroke="#0d1a1e" strokeOpacity={0.3} strokeWidth={0.8} />
                  <circle cx={24} cy={24} r={10} fill="none" stroke="#0d1a1e" strokeOpacity={0.3} strokeWidth={0.8} />
                  <circle cx={24} cy={24} r={4} fill="none" stroke="#0d1a1e" strokeOpacity={0.3} strokeWidth={0.8} />
                </svg>
              }
              title="Hub"
              body="UK final energy total = 1,542 TWh"
            />
            <LevelRow
              ring={
                <svg width={48} height={48} viewBox="0 0 48 48" aria-hidden>
                  <circle cx={24} cy={24} r={16} fill="none" stroke="#a51e22" strokeWidth={0.9} />
                  <circle cx={24} cy={24} r={11} fill="none" stroke="#a51e22" strokeWidth={0.9} />
                  <circle cx={24} cy={24} r={6} fill="none" stroke="#a51e22" strokeWidth={0.9} />
                </svg>
              }
              title="Carrier"
              body="Area = TWh by energy carrier"
            />
            <LevelRow
              ring={
                <svg width={48} height={48} viewBox="0 0 48 48" aria-hidden>
                  <circle cx={24} cy={24} r={6} fill="#a51e22" />
                </svg>
              }
              title="Sector"
              body="Area = TWh consumed by end-use sector"
            />
          </Section>

          <Section title="Carriers">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
              {CARRIERS.map((c) => (
                <CarrierSwatch key={c.name} colour={c.colour} name={c.name} />
              ))}
            </div>
          </Section>

          <Section title="Non-energy use">
            <p className="text-sm text-muted-foreground leading-relaxed">
              52.7 TWh of petroleum is shown as feedstock for petrochemicals,
              lubricants, bitumen and waxes - not combusted, but part of
              where UK petroleum physically goes.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
