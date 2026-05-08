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
 * resolution. Larger values (≥10 TWh) are high-confidence; smaller
 * values (<1 TWh) are at the limit of OCR readability and should be
 * spot-checked against the print at PR review. Any sector with an
 * uncertain decimal place is flagged with a // verify comment.
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

// Distance from hub centre to carrier centre, and from carrier
// centre to sector centre. Carriers sit on a ring of one radius;
// sectors sit on a ring around their carrier.
export const CARRIER_DISTANCE = 180;
export const SECTOR_DISTANCE = 170;

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

// Natural Gas 432 TWh — 12 sectors visible in print.
//
// Known issue (PR review): the sum of these 12 sectors is ~371,
// leaving a ~60 TWh gap against the 432 TWh carrier total. Likely
// one or two large NG sector values are mis-read (Iron & steel
// candidates: 5.3 vs 53; or there is a sector at the print's edge
// that wasn't in the available crops). Spot-check the largest NG
// sector values against the print before merge — the visual
// proportion of any one mis-read sector dot will be visibly off.
const NATURAL_GAS_SECTORS: RawSector[] = [
  { id: 'gas-domestic',         label: 'Domestic',              twh: 253 },
  { id: 'gas-commercial',       label: 'Commercial',            twh: 44.3 },
  { id: 'gas-foodBeverages',    label: 'Food & beverages',      twh: 19.7 },
  { id: 'gas-lightIndustry',    label: 'Light industry',        twh: 12.9 },
  { id: 'gas-chemicals',        label: 'Chemicals',             twh: 12.3 },
  { id: 'gas-mineralProducts',  label: 'Mineral products',      twh: 10.7 },
  { id: 'gas-roadTransport',    label: 'Road transport',        twh: 5.7 },  // verify
  { id: 'gas-ironSteel',        label: 'Iron & steel',          twh: 5.3 },  // verify (5.3 vs 53)
  { id: 'gas-miscellaneous',    label: 'Miscellaneous',         twh: 3.1 },
  { id: 'gas-agriculture',      label: 'Agriculture',           twh: 2.5 },  // verify
  { id: 'gas-publicAdmin',      label: 'Public administration', twh: 0.9 },
  { id: 'gas-paperPrinting',    label: 'Paper & printing',      twh: 0.5 },
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
  return {
    x: HUB_CX + Math.cos(carrier.angle) * CARRIER_DISTANCE,
    y: HUB_CY - Math.sin(carrier.angle) * CARRIER_DISTANCE,
  };
}

export function sectorCentre(carrier: Carrier, sector: Sector): Point {
  const cc = carrierCentre(carrier);
  return {
    x: cc.x + Math.cos(sector.angle) * SECTOR_DISTANCE,
    y: cc.y - Math.sin(sector.angle) * SECTOR_DISTANCE,
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
