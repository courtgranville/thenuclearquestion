import { formatEnergy } from '@/lib/formatEnergy';

type Props = {
  energyMeV: number;
};

// Tiered energy readout. Primary is always shown; the two physical
// equivalents (bulb-seconds, uranium-mass) appear once the cumulative
// energy is large enough for them to mean anything. The truth-teller
// commitment: every conversion is calculated from real constants in
// fissionPhysicsConstants.ts and the units carry the right scale even
// when that scale is "fractions of a nanosecond of a lightbulb".
export default function FissionEnergyCounter({ energyMeV }: Props) {
  const { primary, equivalent1, equivalent2 } = formatEnergy(energyMeV);

  return (
    <div className="font-sans text-[#ECE7DF] flex flex-col gap-1 max-w-xs">
      <p className="text-sm tracking-[0.12em] uppercase text-[#ECE7DF]/60">
        Energy released
      </p>
      <p className="text-2xl font-serif">{primary}</p>
      {equivalent1 && (
        <p className="text-sm italic text-[#ECE7DF]/70 mt-1">{equivalent1}</p>
      )}
      {equivalent2 && (
        <p className="text-sm italic text-[#ECE7DF]/70">{equivalent2}</p>
      )}
    </div>
  );
}
