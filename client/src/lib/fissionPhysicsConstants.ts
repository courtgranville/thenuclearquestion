// Real-world physical constants used in the energy-counter
// equivalences. None of these numbers are invented; they're the
// genuine conversions from fission physics to everyday human-scale
// comparators. The truth-teller commitment of the room requires
// that every conversion be defensible.
//
// Sources: NIST CODATA for elementary charge / MeV-to-J conversion;
// standard nuclear physics references for U-235 fission energy and
// atomic mass.

export const PHYSICS = {
  // 1 MeV in joules. NIST CODATA value (1.602176634e-13).
  MEV_TO_J: 1.602176634e-13,

  // Energy a 100 W bulb consumes in one second.
  J_PER_100W_BULB_SECOND: 100,

  // Mass of one U-235 atom in grams: 235.0439299 g/mol ÷ Avogadro's
  // number (6.02214076e23). 235.0439299 / 6.02214076e23 ≈ 3.903e-22.
  GRAMS_PER_U235_ATOM: 3.903e-22,

  // Energy released per fission event in MeV. The textbook value
  // for U-235 thermal-neutron fission is about 200 MeV total
  // (kinetic energy of fragments + neutrons + prompt gammas +
  // antineutrinos), matching what the engine bookkeeps in
  // TUNING.ENERGY_PER_FISSION_MEV.
  MEV_PER_FISSION: 200,
} as const;
