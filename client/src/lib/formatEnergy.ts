import { PHYSICS } from './fissionPhysicsConstants';

export type FormattedEnergy = {
  primary: string;
  equivalent1: string | null;
  equivalent2: string | null;
};

// Thresholds: below these the equivalent line is hidden so the
// reactor regime reads as a single line. Values picked against
// observed cascade energies: reactor produces ~200-1000 MeV (single
// to a few fissions, below threshold for both equivalents); bomb
// regime produces hundreds of GeV to TeV (above both).
const BULB_EQUIVALENT_THRESHOLD_MEV = 100_000; // 100 GeV
const URANIUM_EQUIVALENT_THRESHOLD_MEV = 100_000; // 100 GeV

// Tiered formatting of cumulative fission energy. As energy climbs,
// equivalences are added so the user has real-world anchors for what
// they're seeing. Every conversion is calculated from the genuine
// physical constants in fissionPhysicsConstants.ts; no rounding
// distorts the meaning.
export function formatEnergy(mev: number): FormattedEnergy {
  if (mev === 0) {
    return { primary: '0 MeV', equivalent1: null, equivalent2: null };
  }

  // Primary value - units climb as energy grows.
  let primary: string;
  if (mev < 1_000) {
    primary = `${Math.round(mev)} MeV`;
  } else if (mev < 1_000_000) {
    primary = `${(mev / 1_000).toFixed(1)} GeV`;
  } else if (mev < 1_000_000_000) {
    primary = `${(mev / 1_000_000).toFixed(1)} TeV`;
  } else {
    primary = `${(mev / 1_000_000_000).toFixed(2)} PeV`;
  }

  // Bulb-seconds equivalent. At our cascade scale this lands in the
  // nanosecond-to-microsecond range; the truth-teller point is that
  // the energy is real but microscopic.
  let equivalent1: string | null = null;
  if (mev >= BULB_EQUIVALENT_THRESHOLD_MEV) {
    const joules = mev * PHYSICS.MEV_TO_J;
    const bulbSeconds = joules / PHYSICS.J_PER_100W_BULB_SECOND;
    equivalent1 = `≈ a 100W bulb for ${formatTime(bulbSeconds)}`;
  }

  // Uranium-mass equivalent. Per the same scale logic, this lands
  // in the attogram-to-femtogram range.
  let equivalent2: string | null = null;
  if (mev >= URANIUM_EQUIVALENT_THRESHOLD_MEV) {
    const grams = (mev / PHYSICS.MEV_PER_FISSION) * PHYSICS.GRAMS_PER_U235_ATOM;
    equivalent2 = `≈ ${formatMass(grams)} of uranium-235 consumed`;
  }

  return { primary, equivalent1, equivalent2 };
}

// Format a time in seconds, picking the unit that gives a readable
// 1-3 digit number. Covers ns through days.
function formatTime(seconds: number): string {
  if (seconds >= 86400) return `${(seconds / 86400).toFixed(1)} days`;
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)} hours`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds >= 1) return `${seconds.toFixed(1)} s`;
  if (seconds >= 1e-3) return `${(seconds * 1e3).toFixed(1)} ms`;
  if (seconds >= 1e-6) return `${(seconds * 1e6).toFixed(1)} μs`;
  if (seconds >= 1e-9) return `${(seconds * 1e9).toFixed(1)} ns`;
  return `${(seconds * 1e12).toFixed(1)} ps`;
}

// Format a mass in grams, picking the unit that gives a readable
// 1-3 digit number. Covers ag (10⁻¹⁸ g) through g.
function formatMass(grams: number): string {
  if (grams >= 1) return `${grams.toFixed(2)} g`;
  if (grams >= 1e-3) return `${(grams * 1e3).toFixed(2)} mg`;
  if (grams >= 1e-6) return `${(grams * 1e6).toFixed(1)} μg`;
  if (grams >= 1e-9) return `${(grams * 1e9).toFixed(1)} ng`;
  if (grams >= 1e-12) return `${(grams * 1e12).toFixed(1)} pg`;
  if (grams >= 1e-15) return `${(grams * 1e15).toFixed(1)} fg`;
  return `${(grams * 1e18).toFixed(1)} ag`;
}
