type Props = {
  value: number;
  onChange: (n: number) => void;
};

// Phase 2 visual stub. The slider is wired as an <input type="range">
// so it drags, but the callback is a no-op until Phase 8 connects it
// to the engine's moderatorRatio. Caption copy is provisional and is
// re-written in Phase 13 by Court.
export default function FissionModeratorSlider({ value, onChange }: Props) {
  return (
    <div className="font-sans text-[#ECE7DF] w-full">
      <p className="text-sm tracking-[0.12em] uppercase text-[#ECE7DF]/80 mb-3">
        Neutron speed
      </p>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Neutron speed - moderator setting"
        className="fission-slider pointer-events-auto w-full"
      />
      <div className="flex justify-between mt-2 text-sm text-[#ECE7DF]/70">
        <span>Fast</span>
        <span>Slow</span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[#ECE7DF]/70 max-w-[18rem]">
        Real reactors slow neutrons with a moderator - water, graphite, heavy water - because slow neutrons are vastly more likely to cause fission. Move the slider. The line between a controlled reaction and a runaway one is the line between a reactor and a weapon.
      </p>
    </div>
  );
}
