// ─────────────────────────────────────────────────────────────────
// Poster005Callouts.tsx — three big editorial numerals from the print.
//
// Copy is verbatim from 005-version2_ad4c9725.pdf / 005-preview-1
// fea2ab19.png. These are static — no time-scrub drives them — and
// they are what the page is trying to leave the visitor with.
// ─────────────────────────────────────────────────────────────────

interface Callout {
  numeral: string;        // e.g. "31 years"
  body: string;           // explanatory text after the numeral
}

const CALLOUTS: Callout[] = [
  {
    numeral: '31 years',
    body: 'since Britain last switched on a new nuclear reactor',
  },
  {
    numeral: '30+ reactors',
    body: 'announced by government and industry since 1995. Almost none were built',
  },
  {
    numeral: '14,141 MW',
    body:
      "of planned capacity — more than twice the capacity of Britain's entire operating nuclear fleet today.",
  },
];

export default function Poster005Callouts() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
        {CALLOUTS.map((c, i) => (
          <div key={i} className="text-left">
            <p
              className="font-serif leading-[1.05] mb-2"
              style={{
                fontSize: 'clamp(1.6rem, 3.4vw, 2.1rem)',
                fontWeight: 600,
                color: '#0d1a1e',
              }}
            >
              {c.numeral}
            </p>
            <p
              className="text-sm text-muted-foreground leading-snug"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              {c.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
