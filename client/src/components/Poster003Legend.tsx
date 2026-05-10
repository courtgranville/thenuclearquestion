// ─────────────────────────────────────────────────────────────────
// Poster003Legend.tsx — designed legend for poster 003.
//
// Source: client/public/assets/003-legend.svg. Three vertically-
// stacked sections (top dots, middle forms, bottom dendrogram).
// Re-laid as React columns with inline SVG icons.
// ─────────────────────────────────────────────────────────────────

const SERIF_STYLE = { fontFamily: "'Playfair', Georgia, serif" } as const;
const DEATH_RED = '#a51e23';
const SAVED_GREEN = '#217b3d';
const TWH_GREY = '#7d746a';

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

function IconRow({ icon, body }: { icon: React.ReactNode; body: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="text-sm text-muted-foreground leading-snug">{body}</div>
    </div>
  );
}

export default function Poster003Legend() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      <div className="border-t border-border/40 pt-8">
        <p
          className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2 text-center"
          style={SERIF_STYLE}
        >
          How to read these
        </p>
        <h3
          className="font-serif text-xl text-foreground mb-8 text-center"
          style={{ fontWeight: 600 }}
        >
          Legend
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-8">
          <Section title="Top — dot circles">
            <IconRow
              icon={
                <svg width={50} height={50} viewBox="0 0 50 50" aria-hidden>
                  <circle cx={25} cy={25} r={20} fill="none" stroke="#0d1a1e" strokeOpacity={0.3} strokeWidth={0.8} />
                  {[...Array(8)].map((_, i) => {
                    const a = (i / 8) * Math.PI * 2;
                    const r = 12;
                    return <circle key={i} cx={25 + Math.cos(a) * r} cy={25 + Math.sin(a) * r} r={1.8} fill={i < 4 ? DEATH_RED : SAVED_GREEN} />;
                  })}
                  <circle cx={25} cy={25} r={1.8} fill={DEATH_RED} />
                </svg>
              }
              body={
                <>
                  Each red dot is one death; each green dot is one life saved
                  versus today&apos;s electricity mix.
                </>
              }
            />
          </Section>

          <Section title="Middle — organic forms">
            <IconRow
              icon={
                <svg width={50} height={50} viewBox="0 0 50 50" aria-hidden>
                  <circle cx={25} cy={25} r={14} fill={DEATH_RED} fillOpacity={0.85} />
                </svg>
              }
              body={
                <>
                  Volume is proportional to estimated annual premature deaths
                  per energy source.
                </>
              }
            />
          </Section>

          <Section title="Bottom — dendrogram">
            <IconRow
              icon={
                <svg width={50} height={50} viewBox="0 0 50 50" aria-hidden>
                  <circle cx={25} cy={10} r={5} fill={TWH_GREY} fillOpacity={0.5} />
                  <path d="M 25 14 C 25 28, 8 28, 8 42" fill="none" stroke="#0d1a1e" strokeOpacity={0.4} strokeWidth={0.7} />
                  <path d="M 25 14 C 25 28, 25 28, 25 42" fill="none" stroke="#0d1a1e" strokeOpacity={0.4} strokeWidth={0.7} />
                  <path d="M 25 14 C 25 28, 42 28, 42 42" fill="none" stroke="#0d1a1e" strokeOpacity={0.4} strokeWidth={0.7} />
                  <circle cx={8} cy={42} r={2} fill={TWH_GREY} />
                  <circle cx={25} cy={42} r={3.5} fill={TWH_GREY} />
                  <circle cx={42} cy={42} r={5} fill={TWH_GREY} />
                </svg>
              }
              body={
                <>
                  The electricity mix arranged as a dendrogram. Circle size
                  is each source&apos;s share of the mix in TWh.
                </>
              }
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
