type Props = {
  value: number;
  onChange: (n: number) => void;
};

// Maps slider position (0..1) to physical enrichment fraction. The
// slider maxes at "weapons-grade" (95%) and bottoms at "reactor-grade"
// (3%). These are the two ends of the real-world enrichment band.
export function enrichmentFromSliderValue(v: number): number {
  return 0.03 + v * (0.95 - 0.03);
}

export default function FissionEnrichmentSlider({ value, onChange }: Props) {
  const enrichment = enrichmentFromSliderValue(value);
  const percent = Math.round(enrichment * 100);

  return (
    <div className="font-sans text-[#ECE7DF] w-full">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm tracking-[0.12em] uppercase text-[#ECE7DF]/80">
          Enrichment
        </p>
        <span className="text-sm text-[#ECE7DF]/70 tabular-nums">{percent}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Enrichment - reactor-grade to weapons-grade"
        className="fission-slider pointer-events-auto w-full"
      />
      <div className="flex justify-between mt-2 text-sm text-[#ECE7DF]/70">
        <span>Reactor-grade</span>
        <span>Weapons-grade</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#ECE7DF]/70 max-w-[18rem]">
        Most reactors run on 3-8% enriched uranium. Weapons-grade is 90% or higher. The difference is how readily a chain reaction can sustain itself.
      </p>
    </div>
  );
}
