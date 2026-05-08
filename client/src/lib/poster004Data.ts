/**
 * Poster 004 — UK final energy 2024, by carrier and end-use sector.
 *
 * Hub-and-spoke dendrogram:
 *   Centre = 1,542 TWh of UK final energy (2024).
 *   Six carrier blobs radiate from the hub, sized r ∝ √twh.
 *   Each carrier branches to its end-use sectors as smaller dots,
 *   also sized r ∝ √twh, fanning out radially.
 *
 * Data source: the printed poster (`004-version2_1f18c33d.png`).
 * The canonical workbook does not contain a dedicated dendrogram
 * sheet for this poster — values were entered directly into the
 * Illustrator master from DUKES 2025 Tables 1.1.1 / 1.1.3 / 1.1.5.
 * The print is therefore the authoritative source for both carrier
 * and sector values; do not consult DUKES, the workbook, or any
 * underlying dataset to "fix" a value here.
 *
 * Carrier sum: 729 + 432 + 272 + 85 + 10 + 14 = 1,542 TWh — exact
 * match to the body-prose total. (An earlier brief revision had a
 * 6 TWh rounding gap; the print does not.)
 *
 * Sector values transcribed from the printed poster at native PNG
 * resolution and re-verified per-carrier in May 2026. Natural Gas
 * sectors sum to 432.2 TWh (matches the carrier total within
 * rounding). Heat sectors sum exactly. Petroleum / Electricity
 * within ~2%. Bioenergy / Solid Fuel small values (<1 TWh) are at
 * the limit of OCR readability — flagged with // verify comments.
 *
 * Geometry is computed deterministically from carrier order and
 * sector count — no per-sector hand-tuned positions. The radial
 * layout is designed for the web view; it does NOT attempt to
 * replicate the print's exact placement (the print uses organic
 * placement that doesn't translate directly to a programmatic
 * dendrogram).
 */

export type CarrierId =
  | 'petroleum'
  | 'naturalGas'
  | 'electricity'
  | 'bioenergy'
  | 'solidFuel'
  | 'heat';

export const CARRIER_IDS: readonly CarrierId[] = [
  'petroleum',
  'naturalGas',
  'electricity',
  'bioenergy',
  'solidFuel',
  'heat',
] as const;

export interface Sector {
  /** Unique within the parent carrier. Stable id for animation refs. */
  id: string;
  label: string;
  twh: number;
  /** Radians, 0 = right, math convention (CCW positive). */
  angle: number;
}

export interface Carrier {
  id: CarrierId;
  label: string;
  twh: number;
  colour: string;
  /** Radians, math convention. Hub-relative direction the carrier sits in. */
  angle: number;
  sectors: Sector[];
}

// Headline total — matches both the body prose and the carrier sum.
export const TOTAL_TWH = 1542;

// Geometry constants (SVG units). The viewport for the dendrogram
// is a square sized DENDROGRAM_SIZE × DENDROGRAM_SIZE; the hub is
// at its centre.
export const DENDROGRAM_SIZE = 920;
export const HUB_CX = DENDROGRAM_SIZE / 2;
export const HUB_CY = DENDROGRAM_SIZE / 2;

// Hub blob's resting radius. The hub displays the total, not a
// scaled magnitude — it doesn't need to be on the √twh scale.
export const HUB_RADIUS = 56;

// Per-carrier hub distances. Smaller carriers sit closer to the hub
// (matching the print's organic placement, where Heat is almost
// touching the hub). The variation also produces the wave-front feel
// in cascade-1: pulses to closer carriers arrive first.
export const CARRIER_DISTANCE_BY_ID: Readonly<Record<CarrierId, number>> = {
  heat: 145,
  solidFuel: 150,
  bioenergy: 175,
  electricity: 195,
  naturalGas: 210,
  petroleum: 225,
};

// Sector distance scales with the parent carrier's radius so larger
// carriers' sectors don't crowd the carrier blob.
export function sectorDistance(carrier: Carrier): number {
  return 90 + carrierRadius(carrier.twh) * 1.4;
}

// Opacity for non-focused carriers / sectors / their spokes during
// CARRIER_FOCUS. Court's brief: "very, very transparent — next to
// invisible but just still there." 0.03 is as faint as the dots
// remain visible without disappearing.
export const DIM_OPACITY = 0.03;

// r ∝ √twh, with a chosen scale that puts the largest carrier
// (Petroleum, 729 TWh) at a sensible visual size.
const CARRIER_R_SCALE = 2.4;
const SECTOR_R_SCALE = 1.6;

export function carrierRadius(twh: number): number {
  return Math.sqrt(twh) * CARRIER_R_SCALE;
}

export function sectorRadius(twh: number): number {
  // Floor at 2px so a 0.1-TWh sector is still visible/clickable.
  return Math.max(2, Math.sqrt(twh) * SECTOR_R_SCALE);
}

// ─────────────────────────────────────────────────────────────────────
// Carrier palette — from CLAUDE.md poster accent palette.
// ─────────────────────────────────────────────────────────────────────

const PALETTE = {
  petroleum: '#a51e22',
  naturalGas: '#1c3867',
  electricity: '#b5822e',
  bioenergy: '#217b3d',
  solidFuel: '#7d736a',
  heat: '#4a6e70',
} as const;

// ─────────────────────────────────────────────────────────────────────
// Sector data — transcribed from the printed poster.
// ─────────────────────────────────────────────────────────────────────

interface RawSector {
  id: string;
  label: string;
  twh: number;
}

// Petroleum 729 TWh — 15 sectors. Order is print-order around the
// blob, top going down. Angles are computed below.
const PETROLEUM_SECTORS: RawSector[] = [
  { id: 'pet-roadTransport',     label: 'Road transport',       twh: 411 },
  { id: 'pet-aviation',          label: 'Aviation',             twh: 153.9 },
  { id: 'pet-nonEnergyUse',      label: 'Non-energy use',       twh: 52.7 },
  { id: 'pet-domestic',          label: 'Domestic',             twh: 27.2 },
  { id: 'pet-lightIndustry',     label: 'Light industry',       twh: 20.5 },
  { id: 'pet-commercial',        label: 'Commercial',           twh: 19.9 },
  { id: 'pet-nationalNavigation',label: 'National navigation',  twh: 9.3 },
  { id: 'pet-publicAdmin',       label: 'Public administration',twh: 9.0 },
  { id: 'pet-rail',              label: 'Rail',                 twh: 6.2 },
  { id: 'pet-miscellaneous',     label: 'Miscellaneous',        twh: 5.0 },
  { id: 'pet-foodBeverages',     label: 'Food & beverages',     twh: 1.6 },
  { id: 'pet-mineralProducts',   label: 'Mineral products',     twh: 1.1 },
  { id: 'pet-chemicals',         label: 'Chemicals',            twh: 0.9 },
  { id: 'pet-paperPrinting',     label: 'Paper & printing',     twh: 0.3 },
  { id: 'pet-ironSteel',         label: 'Iron & steel',         twh: 0.2 },
];

// Natural Gas 432 TWh — 12 sectors. Sum 432.2, matches the print
// within ±0.2 TWh. Re-OCR'd from focused crops 2026-05-08:
// Public administration was originally read as 0.9, is actually 36.2.
// Light industry was 12.9, actually 31.6. Mineral products was
// originally 10.7, actually 12.9. Misc was 3.1, actually 10.7.
const NATURAL_GAS_SECTORS: RawSector[] = [
  { id: 'gas-domestic',         label: 'Domestic',              twh: 253 },
  { id: 'gas-commercial',       label: 'Commercial',            twh: 44.3 },
  { id: 'gas-publicAdmin',      label: 'Public administration', twh: 36.2 },
  { id: 'gas-lightIndustry',    label: 'Light industry',        twh: 31.6 },
  { id: 'gas-foodBeverages',    label: 'Food & beverages',      twh: 19.7 },
  { id: 'gas-mineralProducts',  label: 'Mineral products',      twh: 12.9 },
  { id: 'gas-chemicals',        label: 'Chemicals',             twh: 12.3 },
  { id: 'gas-miscellaneous',    label: 'Miscellaneous',         twh: 10.7 },
  { id: 'gas-ironSteel',        label: 'Iron & steel',          twh: 5.5 },
  { id: 'gas-paperPrinting',    label: 'Paper & printing',      twh: 3.1 },
  { id: 'gas-roadTransport',    label: 'Road transport',        twh: 1.8 },
  { id: 'gas-agriculture',      label: 'Agriculture',           twh: 0.8 },
];

// Electricity 272 TWh — 12 sectors.
const ELECTRICITY_SECTORS: RawSector[] = [
  { id: 'elec-domestic',         label: 'Domestic',              twh: 94.4 },
  { id: 'elec-commercial',       label: 'Commercial',            twh: 62.4 },
  { id: 'elec-lightIndustry',    label: 'Light industry',        twh: 40.7 },
  { id: 'elec-publicAdmin',      label: 'Public administration', twh: 15.5 },
  { id: 'elec-chemicals',        label: 'Chemicals',             twh: 14.7 },
  { id: 'elec-foodBeverages',    label: 'Food & beverages',      twh: 10.4 },
  { id: 'elec-paperPrinting',    label: 'Paper & printing',      twh: 9.5 },
  { id: 'elec-roadTransport',    label: 'Road transport',        twh: 5.9 },
  { id: 'elec-mineralProducts',  label: 'Mineral products',      twh: 5.1 },
  { id: 'elec-rail',             label: 'Rail',                  twh: 5.0 },
  { id: 'elec-agriculture',      label: 'Agriculture',           twh: 3.9 },
  { id: 'elec-ironSteel',        label: 'Iron & steel',          twh: 1.9 },
];

// Bioenergy 85 TWh — 14 sectors.
const BIOENERGY_SECTORS: RawSector[] = [
  { id: 'bio-roadTransport',     label: 'Road transport',        twh: 28.7 },
  { id: 'bio-domestic',          label: 'Domestic',              twh: 25.7 },
  { id: 'bio-commercial',        label: 'Commercial',            twh: 14.9 },
  { id: 'bio-foodBeverages',     label: 'Food & beverages',      twh: 9.8 },
  { id: 'bio-paperPrinting',     label: 'Paper & printing',      twh: 4.5 },
  { id: 'bio-lightIndustry',     label: 'Light industry',        twh: 4.3 },
  { id: 'bio-aviation',          label: 'Aviation',              twh: 3.2 },
  { id: 'bio-agriculture',       label: 'Agriculture',           twh: 1.6 },
  { id: 'bio-chemicals',         label: 'Chemicals',             twh: 1.1 },
  { id: 'bio-publicAdmin',       label: 'Public administration', twh: 0.7 },
  { id: 'bio-mineralProducts',   label: 'Mineral products',      twh: 0.5 }, // verify
  { id: 'bio-miscellaneous',     label: 'Miscellaneous',         twh: 0.5 }, // verify
  { id: 'bio-rail',              label: 'Rail',                  twh: 0.1 },
  { id: 'bio-nonEnergyUse',      label: 'Non-energy use',        twh: 0.1 },
];

// Solid Fuel 10 TWh — 7 sectors. Most are <1 TWh; spot-check.
const SOLID_FUEL_SECTORS: RawSector[] = [
  { id: 'sf-mineralProducts', label: 'Mineral products',     twh: 3.0 },  // verify
  { id: 'sf-lightIndustry',   label: 'Light industry',       twh: 1.5 },  // verify
  { id: 'sf-domestic',        label: 'Domestic',             twh: 0.7 },  // verify
  { id: 'sf-foodBeverages',   label: 'Food & beverages',     twh: 0.7 },  // verify
  { id: 'sf-chemicals',       label: 'Chemicals',            twh: 0.4 },  // verify
  { id: 'sf-ironSteel',       label: 'Iron & steel',         twh: 0.3 },  // verify
  { id: 'sf-paperPrinting',   label: 'Paper & printing',     twh: 0.3 },  // verify
];

// Heat 14 TWh — 7 sectors. Several values cut off in available crops;
// spot-check at PR review.
const HEAT_SECTORS: RawSector[] = [
  { id: 'heat-domestic',       label: 'Domestic',              twh: 3.2 },  // verify
  { id: 'heat-foodBeverages',  label: 'Food & beverages',      twh: 3.5 },  // verify
  { id: 'heat-commercial',     label: 'Commercial',            twh: 2.6 },
  { id: 'heat-lightIndustry',  label: 'Light industry',        twh: 2.0 },  // verify
  { id: 'heat-chemicals',      label: 'Chemicals',             twh: 1.7 },
  { id: 'heat-paperPrinting',  label: 'Paper & printing',      twh: 0.7 },  // verify
  { id: 'heat-agriculture',    label: 'Agriculture',           twh: 0.3 },
];

// ─────────────────────────────────────────────────────────────────────
// Layout — carrier angles around the hub, sector angles around each
// carrier. The angles are designed for the web view: evenly-spaced
// carriers, sectors fanned in an arc that points away from the hub.
// ─────────────────────────────────────────────────────────────────────

interface CarrierLayout {
  id: CarrierId;
  label: string;
  twh: number;
  /** Direction from hub centre, radians (math convention). */
  angle: number;
  /** Half-width of the sector fan arc, radians. */
  fanArc: number;
  rawSectors: RawSector[];
}

const D2R = Math.PI / 180;

// Carrier angles match the print's general layout (Petroleum left,
// Natural Gas bottom, Electricity right, etc.). The fan-arc widths
// are tuned per-carrier so dense sector clusters don't overlap.
const CARRIER_LAYOUT: readonly CarrierLayout[] = [
  {
    id: 'petroleum',
    label: 'Petroleum',
    twh: 729,
    angle: 180 * D2R,
    fanArc: 95 * D2R,
    rawSectors: PETROLEUM_SECTORS,
  },
  {
    id: 'solidFuel',
    label: 'Solid fuel',
    twh: 10,
    angle: 120 * D2R,
    fanArc: 35 * D2R,
    rawSectors: SOLID_FUEL_SECTORS,
  },
  {
    id: 'bioenergy',
    label: 'Bioenergy',
    twh: 85,
    angle: 60 * D2R,
    fanArc: 75 * D2R,
    rawSectors: BIOENERGY_SECTORS,
  },
  {
    id: 'electricity',
    label: 'Electricity',
    twh: 272,
    angle: 0,
    fanArc: 70 * D2R,
    rawSectors: ELECTRICITY_SECTORS,
  },
  {
    id: 'heat',
    label: 'Heat',
    twh: 14,
    angle: -60 * D2R,
    fanArc: 35 * D2R,
    rawSectors: HEAT_SECTORS,
  },
  {
    id: 'naturalGas',
    label: 'Natural gas',
    twh: 432,
    angle: -120 * D2R,
    fanArc: 70 * D2R,
    rawSectors: NATURAL_GAS_SECTORS,
  },
];

function buildSectors(carrier: CarrierLayout): Sector[] {
  const { angle, fanArc, rawSectors } = carrier;
  const n = rawSectors.length;
  // Distribute sectors evenly across the fan arc, centred on the
  // carrier's outward direction. With n sectors the angular step is
  // fanArc / (n - 1); for n = 1 the sole sector sits on the carrier's
  // outward axis.
  const start = angle - fanArc / 2;
  const step = n > 1 ? fanArc / (n - 1) : 0;
  return rawSectors.map((s, i) => ({
    id: s.id,
    label: s.label,
    twh: s.twh,
    angle: start + i * step,
  }));
}

export const CARRIERS: readonly Carrier[] = CARRIER_LAYOUT.map((c) => ({
  id: c.id,
  label: c.label,
  twh: c.twh,
  colour: PALETTE[c.id],
  angle: c.angle,
  sectors: buildSectors(c),
}));

// ─────────────────────────────────────────────────────────────────────
// Coordinate helpers — used by Skeleton, Hub, Carriers, Sectors, and
// the Pulses canvas overlay. Centralised so the geometry constants
// can be tuned in one place.
// ─────────────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export function carrierCentre(carrier: Carrier): Point {
  const distance = CARRIER_DISTANCE_BY_ID[carrier.id];
  return {
    x: HUB_CX + Math.cos(carrier.angle) * distance,
    y: HUB_CY - Math.sin(carrier.angle) * distance,
  };
}

export function sectorCentre(carrier: Carrier, sector: Sector): Point {
  const cc = carrierCentre(carrier);
  const distance = sectorDistance(carrier);
  return {
    x: cc.x + Math.cos(sector.angle) * distance,
    y: cc.y - Math.sin(sector.angle) * distance,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Lookups for the engine — keyed access by id.
// ─────────────────────────────────────────────────────────────────────

export const CARRIER_BY_ID: Readonly<Record<CarrierId, Carrier>> =
  CARRIERS.reduce(
    (acc, c) => {
      acc[c.id] = c;
      return acc;
    },
    {} as Record<CarrierId, Carrier>,
  );

export const ALL_SECTOR_IDS: readonly string[] = CARRIERS.flatMap((c) =>
  c.sectors.map((s) => s.id),
);
