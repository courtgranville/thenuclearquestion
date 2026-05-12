type Props = {
  value: number;
  onChange: (n: number) => void;
};

// Neutron-speed slider. value 0 = fast (low fission probability,
// neutrons mostly pass through), value 1 = slow (high fission
// probability, slow neutrons reliably cause fission - the moderator
// effect).
export default function FissionNeutronSpeedSlider({ value, onChange }: Props) {
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
        aria-label="Neutron speed - fast to slow"
        className="fission-slider pointer-events-auto w-full"
      />
      <div className="flex justify-between mt-2 text-sm text-[#ECE7DF]/70">
        <span>Fast</span>
        <span>Slow</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#ECE7DF]/70 max-w-[18rem]">
        Fast neutrons pass through. Slow neutrons cause fission. Real reactors use a moderator - water, graphite, heavy water - to slow neutrons down. Move the slider and watch what changes.
      </p>
    </div>
  );
}
