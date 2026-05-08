/**
 * Poster 004 — honesty caveat.
 *
 * Verbatim print copy from the right-hand caveat block in
 * 004-version2_1f18c33d.png. This is the only piece of text on the
 * page that is required to match the print word-for-word; do not
 * paraphrase. Other body copy lives in posterData.ts and is
 * intentionally web-paraphrased.
 */

export default function Poster004HonestyCaveat() {
  return (
    <p
      className="text-base leading-relaxed text-foreground/80 max-w-2xl mx-auto text-center"
      style={{
        fontFamily: "'Playfair', Georgia, serif",
        fontWeight: 300,
      }}
    >
      <span className="font-semibold" style={{ fontWeight: 600 }}>
        Electricity is just 18% of UK final energy.
      </span>{' '}
      Decarbonising how it&rsquo;s made only cleans this slice.
      Everything else needs to be electrified before it can be
      decarbonised at all.
    </p>
  );
}
