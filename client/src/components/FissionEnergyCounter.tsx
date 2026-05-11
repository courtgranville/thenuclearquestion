type Props = {
  energyMeV: number;
};

// Phase 2 visual stub. Phase 10 wires the engine's energyMeV through
// and adds the GeV/TeV scaling plus the bulb-seconds and U-235 mass
// conversion sub-captions.
export default function FissionEnergyCounter({ energyMeV }: Props) {
  return (
    <div className="font-sans text-[#ECE7DF]">
      <p className="text-sm tracking-[0.12em] uppercase text-[#ECE7DF]/60">
        Energy released
      </p>
      <p className="text-2xl font-serif mt-1">
        {energyMeV.toFixed(0)} MeV
      </p>
    </div>
  );
}
