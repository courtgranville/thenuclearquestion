// ─────────────────────────────────────────────────────────────────
// Poster006Legend.tsx - designed legend for poster 006.
//
// Source: client/public/assets/006-legend.svg. Three form types:
// producer circles, waste-category forms, and radiation-dose
// bubbles. Plus a few sample-scale notes.
// ─────────────────────────────────────────────────────────────────

const SERIF_STYLE = { fontFamily: "'Playfair', Georgia, serif" } as const;
const WASTE_GREY = '#7d746a';
const WASTE_RED = '#a51e23';
const STROKE_BLUE = '#1c3867';

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

function FormRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function SampleRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export default function Poster006Legend() {
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
          Three kinds of forms carry the data on this poster. Volumes are
          from the NDA&apos;s UK Radioactive Waste Inventory 2022; doses
          are in millisieverts (mSv).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
          <Section title="The three forms">
            <FormRow
              icon={
                <svg width={56} height={28} viewBox="0 0 56 28" aria-hidden>
                  <circle cx={14} cy={14} r={10} fill={WASTE_GREY} fillOpacity={0.6} />
                  <circle cx={42} cy={14} r={10} fill={WASTE_RED} fillOpacity={0.8} />
                </svg>
              }
              title="Producer circles"
              body="Sized by waste volume (m³)."
            />
            <FormRow
              icon={
                <svg width={48} height={36} viewBox="0 0 48 36" aria-hidden>
                  {[16, 12, 8, 4].map((r) => (
                    <circle key={r} cx={24} cy={18} r={r} fill="none" stroke={STROKE_BLUE} strokeWidth={0.8} />
                  ))}
                </svg>
              }
              title="Waste-category forms"
              body="Size = volume; density of concentric rings = radioactivity."
            />
            <FormRow
              icon={
                <svg width={48} height={36} viewBox="0 0 48 36" aria-hidden>
                  {/* Burst rays */}
                  {[...Array(20)].map((_, i) => {
                    const a = (i / 20) * Math.PI * 2;
                    const r1 = 4;
                    const r2 = 16;
                    return (
                      <line
                        key={i}
                        x1={24 + Math.cos(a) * r1}
                        y1={18 + Math.sin(a) * r1}
                        x2={24 + Math.cos(a) * r2}
                        y2={18 + Math.sin(a) * r2}
                        stroke={WASTE_RED}
                        strokeOpacity={0.7}
                        strokeWidth={0.8}
                      />
                    );
                  })}
                  <circle cx={24} cy={18} r={4} fill={WASTE_RED} />
                </svg>
              }
              title="Radiation dose bubbles"
              body="Size = effective dose (mSv), area-proportional on a log scale."
            />
          </Section>

          <Section title="Sample scales">
            <div className="space-y-4">
              <SampleRow
                icon={
                  <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden>
                    <circle cx={20} cy={20} r={4} fill={WASTE_GREY} fillOpacity={0.6} />
                  </svg>
                }
                label="Hinkley"
                value="9,970 m³"
              />
              <SampleRow
                icon={
                  <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden>
                    <circle cx={20} cy={20} r={16} fill={WASTE_GREY} fillOpacity={0.6} />
                  </svg>
                }
                label="Sellafield"
                value="3,320,000 m³"
              />
              <SampleRow
                icon={
                  <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden>
                    <circle cx={20} cy={20} r={2} fill={WASTE_RED} />
                  </svg>
                }
                label="Chest X-ray"
                value="0.02 mSv"
              />
              <SampleRow
                icon={
                  <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden>
                    {[...Array(16)].map((_, i) => {
                      const a = (i / 16) * Math.PI * 2;
                      return (
                        <line
                          key={i}
                          x1={20 + Math.cos(a) * 4}
                          y1={20 + Math.sin(a) * 4}
                          x2={20 + Math.cos(a) * 16}
                          y2={20 + Math.sin(a) * 16}
                          stroke={WASTE_RED}
                          strokeOpacity={0.7}
                          strokeWidth={0.8}
                        />
                      );
                    })}
                    <circle cx={20} cy={20} r={4} fill={WASTE_RED} />
                  </svg>
                }
                label="CT scan"
                value="10 mSv"
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
