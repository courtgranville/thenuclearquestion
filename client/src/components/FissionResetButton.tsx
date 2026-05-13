import type { FissionEngine } from '@/lib/fissionEngine';

type Props = { engine: FissionEngine };

// Reset link, top-right of the room alongside Return. Calls the
// engine's softReset which kills live neutrons, transitions every
// non-bound particle to recohering, and clears energy/stats. The
// existing recohere spring force pulls particles back to rest over
// ~2 s - no snap, just a graceful return to baseline.
export default function FissionResetButton({ engine }: Props) {
  return (
    <button
      type="button"
      onClick={() => engine.softReset()}
      className="font-sans text-sm tracking-[0.15em] uppercase text-[#ECE7DF]/70 hover:text-[#ECE7DF] transition-colors duration-200 pointer-events-auto"
    >
      Reset
    </button>
  );
}
