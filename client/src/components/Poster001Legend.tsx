// ─────────────────────────────────────────────────────────────────
// Poster001Legend.tsx — designed legend for poster 001.
//
// Source: client/public/assets/001-legend.svg (Court's print).
// Re-laid as a designed React component, same pattern as
// Poster005Legend: column-grid + inline SVG icons + plain-English
// descriptions, dropping any methodology content already in the
// body text.
// ─────────────────────────────────────────────────────────────────

const SERIF_STYLE = { fontFamily: "'Playfair', Georgia, serif" } as const;
const NUCLEAR_GREEN = '#237c3e';
const OTHER_GREY = '#7d746a';

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

export default function Poster001Legend() {
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
          <Section title="The forms">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Each form is one electric generation source. Volume is
              proportional to lifecycle greenhouse-gas emissions — larger
              forms released more carbon dioxide-equivalent per
              kilowatt-hour of electricity delivered.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: NUCLEAR_GREEN }}
                />
                <span className="text-sm text-foreground">Green marks nuclear</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: OTHER_GREY }}
                />
                <span className="text-sm text-foreground">Grey marks other sources</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              Nuclear is the only non-renewable on this poster with emissions
              below ten grams of CO₂-equivalent per kilowatt-hour.
            </p>
          </Section>

          <Section title="The scale">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Measured in grams of carbon dioxide-equivalent released per
              kilowatt-hour of electricity delivered, written gCO₂/kWh
              throughout.
            </p>
            <div className="pt-2">
              <svg width={260} height={130} viewBox="0 0 260 130" aria-hidden>
                {/* Nuclear: small green */}
                <circle cx={26} cy={90} r={7} fill={NUCLEAR_GREEN} />
                <text x={26} y={112} fontSize={11} textAnchor="middle" fill="rgba(13,26,30,0.78)" style={SERIF_STYLE}>Nuclear</text>
                <text x={26} y={124} fontSize={10} textAnchor="middle" fill="rgba(13,26,30,0.55)" style={SERIF_STYLE}>5.6</text>
                {/* Coal: large grey, area-proportional to ratio 173 */}
                <circle cx={180} cy={62} r={45} fill={OTHER_GREY} fillOpacity={0.5} />
                <text x={180} y={120} fontSize={11} textAnchor="middle" fill="rgba(13,26,30,0.78)" style={SERIF_STYLE}>Coal</text>
                <text x={180} y={132} fontSize={10} textAnchor="middle" fill="rgba(13,26,30,0.55)" style={SERIF_STYLE}>970</text>
              </svg>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              The coal form contains one hundred and seventy-three times the
              volume of the nuclear form. That ratio is shown to scale.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

