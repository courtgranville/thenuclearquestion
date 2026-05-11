// ─────────────────────────────────────────────────────────────────
// poster005Data.ts - typed reactor manifest + status totals.
//
// PROVENANCE (Court correction #2)
// ────────────────────────────────────────────────────────────────
//
// Per-reactor MW source: GEM Global Nuclear Power Tracker, accessed
// 2026-05-09 via client/data/uk_nuclear_sites_qgis.csv (a reconciled
// subset committed alongside scripts/extract-poster-005-forms.mjs).
//
// Per-reactor date source: client/public/assets/005-dendrogram-clean_
// 336edeac.svg - the timeline bars and cancellation dots are the
// canonical artwork; their y-coordinates encode each reactor's
// construction start, grid connection, retirement, or cancellation
// year, calibrated against the SVG's 8 horizontal gridlines
// (y=835.316→1953, y=993.758→2030, validated ±2y against Calder Hall 1
// / Sizewell B / Hinkley Point C1).
//
// Per-status totals source: the print poster's headline numerals
// (5050007versionversion2). Displayed verbatim. NO per-reactor MW value
// has been calibrated to make any sum match a print headline.
//
//   underConstruction:  count   2,  mw 3260  (computed 3260, exact)
//   operating:          count   9,  mw 6472  (computed 6474, +2)
//   retired:            count  36,  mw 9113  (computed 9114, +1)
//   cancelled:          count  25,  mw 14141 (computed 14242, +101)
//
// The 14,141 / 14,242 discrepancy is +0.71 % and traces almost
// entirely to Dungeness C: the abandoned-branch data layer used
// 1599 MW for Dungeness C, calibrated downward so the cancelled-fleet
// sum landed exactly at the print headline. That calibration has been
// removed. The script now derives Dungeness C from CSV total_mw
// minus the explicit overrides for A1/A2/B1/B2: 3340 − 220 − 220 −
// 600 − 600 = 1700 MW. The +101 MW residual is preserved rather than
// fudged; it is documented here and visible to anyone reading the
// per-reactor data.
//
// STATUS_TOTALS.cancelled.mw = 14141 verbatim - the page displays the
// print's canonical headline. Per-reactor capacityMw values shown in
// the detail panel are GEM-sourced and may not sum to the headline.
//
// CSV / SVG DATE DISAGREEMENTS (Court correction #3)
// ────────────────────────────────────────────────────────────────
//
// 33 of 72 reactors have a CSV start_year differing from the SVG-
// extracted grid_connection_year by more than 1 year. Almost all of
// these are structural: the CSV's start_year is a SITE-level value
// (typically the first unit's grid connection at the site), while
// the dendrogram's timeline encodes PER-UNIT dates. For example:
//
//   Sizewell B (operating): CSV start_year=1966 (Sizewell A1's COD),
//   SVG grid=1994 (Sizewell B's actual COD) - diff 28 years.
//   The SVG is correct; the CSV value is the wrong field for this row.
//
//   Hinkley Point C1 (underConstruction): CSV start_year=1965 (Hinkley
//   Point A1's COD), SVG grid=2030 (HP C1's planned grid) - diff 65y.
//   SVG correct.
//
// The script prefers SVG (per-unit, canonical from print artwork)
// over CSV (site-level, derived from GEM) for date fields. This is
// not a silent preference: every disagreement is recorded in the
// script's stderr SOURCE-DISAGREEMENT WARN list, and the script's
// output JSON records each per-reactor mapping_warnings array. If
// Court wants any specific dates overridden, edit them here directly.
//
// Two genuine outliers that aren't site-level/unit-level
// reconciliations - flag for review if the print's intent matters:
//
// - Hinkley Point B1: SVG construction=1961, grid=1967 vs Wikipedia
//     B1 construction=1967, grid=1976. The print's HPB1 bar appears
//     to start ~6 years too early. Possibly the print conflated A+B
//     construction history into the B row.
//
// - Pre-1953 cohorts (Calder Hall, Berkeley, Bradwell, Hunterston
//     A, Hinkley Point A, Trawsfynydd, Wylfa): construction_start
//     = 1953 because the print's chart top edge IS 1953 - pre-1953
//     history is visually clipped. These are not real construction-
//     start dates for those reactors; their values should be read as
//     "≤ 1953".
//
// ────────────────────────────────────────────────────────────────

export type ReactorStatus =
  | 'underConstruction'
  | 'operating'
  | 'retired'
  | 'cancelled';

export type ReactorCluster = 'sellafield' | 'wylfa' | 'sizewell' | null;

export interface Reactor {
  /** Canonical id - matches the `data-unit` attribute in every SVG. */
  id: string;
  /** Display name; usually identical to id. */
  name: string;
  /** Site name (the CSV's `name` column; matches `data-project` on the
   *  map circle for most reactors). */
  site: string | null;
  status: ReactorStatus;
  /** True for the 12 cancelled rows whose data-phase is
   *  "cancelled - inferred 4 y" - the print's cancellation year is
   *  inferred (construction-start + 4 years) rather than observed. */
  cancellationYearInferred: boolean;
  /** Per-reactor capacity in MW. Sourced from GEM via the CSV's
   *  total_mw / unit_count for mono-model sites; from
   *  REACTOR_MW_OVERRIDES (WNA / Wikipedia nameplate values) for
   *  mixed-model sites. Not calibrated. */
  capacityMw: number | null;
  /** Construction start year. Read from the top of the red timeline
   *  bar (or the top of the dashed navy projection for
   *  underConstruction). Clipped to 1953 for reactors whose actual
   *  start is pre-1953 - see provenance note above. */
  constructionStart: number | null;
  /** Grid connection / commercial operation year. Bottom of red bar /
   *  top of green bar / bottom of dashed projection. */
  commercialOperation: number | null;
  /** Retirement year (operating reactors show 2030, the chart's
   *  planning horizon). */
  shutdown: number | null;
  /** Cancellation year. Cancelled reactors only. */
  cancellationYear: number | null;
  /** Site coords in standard geographic units (degrees), from the
   *  GEM CSV. */
  lat: number | null;
  lng: number | null;
  /** Project-level coords in the map SVG's viewBox (1694.98 × 1330.76).
   *  Many reactors share one map circle - these match the cx/cy of
   *  that circle. */
  mapX: number | null;
  mapY: number | null;
  /** Cluster membership for the three inset zoom circles on the print
   *  map. Sellafield includes Moorside (co-located); Wylfa includes
   *  Wylfa Newydd + Wylfa SMR. */
  cluster: ReactorCluster;
  /** Row id matching `<g id="row-NN">` in the dendrogram SVG. */
  rowId: string;
  /** x-coord of this reactor's column on the dendrogram-clean SVG's
   *  timeline (used by Poster005Timeline to lay out the bars). */
  timelineColumnX: number;
}

export const STATUS_TOTALS = {
  underConstruction: { count: 2,  mw: 3260  },
  operating:         { count: 9,  mw: 6472  },
  retired:           { count: 36, mw: 9113  },
  cancelled:         { count: 25, mw: 14141 },
} as const;

export const STATUS_LABEL: Record<ReactorStatus, string> = {
  underConstruction: 'Under Construction',
  operating:         'Operating',
  retired:           'Retired',
  cancelled:         'Cancelled',
};

/** Print colour palette per status. These are the EXACT fill hex
 *  values used by the map circles in 005-map_d6bf9e9f.svg and the
 *  hub fills in 005-dendrogram-clean_336edeac.svg - the page UI
 *  must match the print verbatim, so the legend chips, leaf circles,
 *  hover callouts, tooltip accents, and canvas hub strokes all
 *  resolve to these values rather than the visually-similar
 *  #237c3e / #7d746a / #a51e23 set we were using before. */
export const STATUS_COLOUR: Record<ReactorStatus, string> = {
  underConstruction: '#b4822e',
  operating:         '#267c3e',
  retired:           '#7d746b',
  cancelled:         '#a61e23',
};

export const REACTORS: Reactor[] = [
  { id: "Moorside 1", name: "Moorside 1", site: "Moorside", status: "cancelled", cancellationYearInferred: false, capacityMw: 1135, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2018, lat: 54.4296, lng: -3.5109, mapX: 551.34, mapY: 558, cluster: "sellafield", rowId: "row-00", timelineColumnX: 1595.59 },
  { id: "Moorside 2", name: "Moorside 2", site: "Moorside", status: "cancelled", cancellationYearInferred: false, capacityMw: 1135, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2018, lat: 54.4296, lng: -3.5109, mapX: 551.34, mapY: 558, cluster: "sellafield", rowId: "row-01", timelineColumnX: 1560.927 },
  { id: "Moorside 3", name: "Moorside 3", site: "Moorside", status: "cancelled", cancellationYearInferred: false, capacityMw: 1135, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2018, lat: 54.4296, lng: -3.5109, mapX: 551.34, mapY: 558, cluster: "sellafield", rowId: "row-02", timelineColumnX: 1526.263 },
  { id: "Oldbury B1", name: "Oldbury B1", site: "Oldbury", status: "cancelled", cancellationYearInferred: false, capacityMw: 1117, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2020, lat: 51.65201, lng: -2.5674, mapX: 921.8, mapY: 887.54, cluster: null, rowId: "row-03", timelineColumnX: 1491.356 },
  { id: "Oldbury B2", name: "Oldbury B2", site: "Oldbury", status: "cancelled", cancellationYearInferred: false, capacityMw: 1117, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2020, lat: 51.65201, lng: -2.5674, mapX: 921.8, mapY: 887.54, cluster: null, rowId: "row-04", timelineColumnX: 1457.181 },
  { id: "Oldbury B3", name: "Oldbury B3", site: "Oldbury", status: "cancelled", cancellationYearInferred: false, capacityMw: 1117, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2020, lat: 51.65201, lng: -2.5674, mapX: 921.8, mapY: 887.54, cluster: null, rowId: "row-05", timelineColumnX: 1423.006 },
  { id: "Wylfa Newydd 1", name: "Wylfa Newydd 1", site: "Wylfa Newydd", status: "cancelled", cancellationYearInferred: false, capacityMw: 1380, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2020, lat: 53.4113, lng: -4.4839, mapX: 552.68, mapY: 837.41, cluster: "wylfa", rowId: "row-06", timelineColumnX: 1386.974 },
  { id: "Wylfa Newydd 2", name: "Wylfa Newydd 2", site: "Wylfa Newydd", status: "cancelled", cancellationYearInferred: false, capacityMw: 1380, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2020, lat: 53.4113, lng: -4.4839, mapX: 552.68, mapY: 837.41, cluster: "wylfa", rowId: "row-07", timelineColumnX: 1349.086 },
  { id: "Dungeness C", name: "Dungeness C", site: "Dungeness", status: "cancelled", cancellationYearInferred: false, capacityMw: 1700, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2009, lat: 50.9138886573521, lng: 0.962049399769726, mapX: 1116.01, mapY: 948, cluster: null, rowId: "row-08", timelineColumnX: 1309.579 },
  { id: "Sellafield (Candu) 1", name: "Sellafield (Candu) 1", site: "Sellafield (Candu)", status: "cancelled", cancellationYearInferred: false, capacityMw: 740, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2018, lat: 54.4224, lng: -3.4868, mapX: 574.61, mapY: 557.54, cluster: "sellafield", rowId: "row-09", timelineColumnX: 1274.709 },
  { id: "Sellafield (Candu) 2", name: "Sellafield (Candu) 2", site: "Sellafield (Candu)", status: "cancelled", cancellationYearInferred: false, capacityMw: 740, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2018, lat: 54.4224, lng: -3.4868, mapX: 574.61, mapY: 557.54, cluster: "sellafield", rowId: "row-10", timelineColumnX: 1246.094 },
  { id: "Wylfa SMR 1", name: "Wylfa SMR 1", site: "Wylfa SMR", status: "cancelled", cancellationYearInferred: true, capacityMw: 77, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2025, lat: 53.4116929, lng: -4.4844117, mapX: 552.29, mapY: 836.92, cluster: "wylfa", rowId: "row-11", timelineColumnX: 1226.068 },
  { id: "Wylfa SMR 10", name: "Wylfa SMR 10", site: "Wylfa SMR", status: "cancelled", cancellationYearInferred: true, capacityMw: 77, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2025, lat: 53.4116929, lng: -4.4844117, mapX: 552.29, mapY: 836.92, cluster: "wylfa", rowId: "row-12", timelineColumnX: 1214.633 },
  { id: "Wylfa SMR 11", name: "Wylfa SMR 11", site: "Wylfa SMR", status: "cancelled", cancellationYearInferred: true, capacityMw: 77, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2025, lat: 53.4116929, lng: -4.4844117, mapX: 552.29, mapY: 836.92, cluster: "wylfa", rowId: "row-13", timelineColumnX: 1203.503 },
  { id: "Wylfa SMR 12", name: "Wylfa SMR 12", site: "Wylfa SMR", status: "cancelled", cancellationYearInferred: true, capacityMw: 77, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2025, lat: 53.4116929, lng: -4.4844117, mapX: 552.29, mapY: 836.92, cluster: "wylfa", rowId: "row-14", timelineColumnX: 1191.763 },
  { id: "Wylfa SMR 2", name: "Wylfa SMR 2", site: "Wylfa SMR", status: "cancelled", cancellationYearInferred: true, capacityMw: 77, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2025, lat: 53.4116929, lng: -4.4844117, mapX: 552.29, mapY: 836.92, cluster: "wylfa", rowId: "row-15", timelineColumnX: 1180.39 },
  { id: "Wylfa SMR 3", name: "Wylfa SMR 3", site: "Wylfa SMR", status: "cancelled", cancellationYearInferred: true, capacityMw: 77, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2025, lat: 53.4116929, lng: -4.4844117, mapX: 552.29, mapY: 836.92, cluster: "wylfa", rowId: "row-16", timelineColumnX: 1168.834 },
  { id: "Wylfa SMR 4", name: "Wylfa SMR 4", site: "Wylfa SMR", status: "cancelled", cancellationYearInferred: true, capacityMw: 77, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2025, lat: 53.4116929, lng: -4.4844117, mapX: 552.29, mapY: 836.92, cluster: "wylfa", rowId: "row-17", timelineColumnX: 1157.457 },
  { id: "Wylfa SMR 5", name: "Wylfa SMR 5", site: "Wylfa SMR", status: "cancelled", cancellationYearInferred: true, capacityMw: 77, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2025, lat: 53.4116929, lng: -4.4844117, mapX: 552.29, mapY: 836.92, cluster: "wylfa", rowId: "row-18", timelineColumnX: 1146.022 },
  { id: "Wylfa SMR 6", name: "Wylfa SMR 6", site: "Wylfa SMR", status: "cancelled", cancellationYearInferred: true, capacityMw: 77, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2025, lat: 53.4116929, lng: -4.4844117, mapX: 552.29, mapY: 836.92, cluster: "wylfa", rowId: "row-19", timelineColumnX: 1134.587 },
  { id: "Wylfa SMR 7", name: "Wylfa SMR 7", site: "Wylfa SMR", status: "cancelled", cancellationYearInferred: true, capacityMw: 77, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2025, lat: 53.4116929, lng: -4.4844117, mapX: 552.29, mapY: 836.92, cluster: "wylfa", rowId: "row-20", timelineColumnX: 1123.152 },
  { id: "Wylfa SMR 8", name: "Wylfa SMR 8", site: "Wylfa SMR", status: "cancelled", cancellationYearInferred: true, capacityMw: 77, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2025, lat: 53.4116929, lng: -4.4844117, mapX: 552.29, mapY: 836.92, cluster: "wylfa", rowId: "row-21", timelineColumnX: 1111.717 },
  { id: "Wylfa SMR 9", name: "Wylfa SMR 9", site: "Wylfa SMR", status: "cancelled", cancellationYearInferred: true, capacityMw: 77, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2025, lat: 53.4116929, lng: -4.4844117, mapX: 552.29, mapY: 836.92, cluster: "wylfa", rowId: "row-22", timelineColumnX: 1100.282 },
  { id: "Sellafield (Hitachi) 1", name: "Sellafield (Hitachi) 1", site: "Sellafield (Hitachi)", status: "cancelled", cancellationYearInferred: false, capacityMw: 311, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2018, lat: 54.4224, lng: -3.4868, mapX: 574.61, mapY: 570.27, cluster: "sellafield", rowId: "row-23", timelineColumnX: 1084.716 },
  { id: "Sellafield (Hitachi) 2", name: "Sellafield (Hitachi) 2", site: "Sellafield (Hitachi)", status: "cancelled", cancellationYearInferred: false, capacityMw: 311, constructionStart: null, commercialOperation: null, shutdown: null, cancellationYear: 2018, lat: 54.4224, lng: -3.4868, mapX: 574.61, mapY: 570.27, cluster: "sellafield", rowId: "row-24", timelineColumnX: 1065.021 },
  { id: "Hinkley Point B1", name: "Hinkley Point B1", site: "Hinkley Point", status: "retired", cancellationYearInferred: false, capacityMw: 655, constructionStart: 1961, commercialOperation: 1967, shutdown: 2022, cancellationYear: null, lat: 51.2063, lng: -3.1423, mapX: 892.25, mapY: 924.58, cluster: null, rowId: "row-25", timelineColumnX: 1041.615 },
  { id: "Hinkley Point B2", name: "Hinkley Point B2", site: "Hinkley Point", status: "retired", cancellationYearInferred: false, capacityMw: 655, constructionStart: 1961, commercialOperation: 1965, shutdown: 2022, cancellationYear: null, lat: 51.2063, lng: -3.1423, mapX: 892.25, mapY: 924.58, cluster: null, rowId: "row-26", timelineColumnX: 1014.506 },
  { id: "Hinkley Point A1", name: "Hinkley Point A1", site: "Hinkley Point", status: "retired", cancellationYearInferred: false, capacityMw: 235, constructionStart: 1953, commercialOperation: 1963, shutdown: 1997, cancellationYear: null, lat: 51.2063, lng: -3.1423, mapX: 892.25, mapY: 924.58, cluster: null, rowId: "row-27", timelineColumnX: 991.699 },
  { id: "Hinkley Point A2", name: "Hinkley Point A2", site: "Hinkley Point", status: "retired", cancellationYearInferred: false, capacityMw: 235, constructionStart: 1953, commercialOperation: 1963, shutdown: 1997, cancellationYear: null, lat: 51.2063, lng: -3.1423, mapX: 892.25, mapY: 924.58, cluster: null, rowId: "row-28", timelineColumnX: 973.211 },
  { id: "Dungeness B1", name: "Dungeness B1", site: "Dungeness", status: "retired", cancellationYearInferred: false, capacityMw: 600, constructionStart: 1958, commercialOperation: 1980, shutdown: 2018, cancellationYear: null, lat: 50.9138886573521, lng: 0.962049399769726, mapX: 1106.23, mapY: 948, cluster: null, rowId: "row-29", timelineColumnX: 950.775 },
  { id: "Dungeness B2", name: "Dungeness B2", site: "Dungeness", status: "retired", cancellationYearInferred: false, capacityMw: 600, constructionStart: 1958, commercialOperation: 1985, shutdown: 2018, cancellationYear: null, lat: 50.9138886573521, lng: 0.962049399769726, mapX: 1106.23, mapY: 948, cluster: null, rowId: "row-30", timelineColumnX: 924.41 },
  { id: "Dungeness A1", name: "Dungeness A1", site: "Dungeness", status: "retired", cancellationYearInferred: false, capacityMw: 220, constructionStart: 1953, commercialOperation: 1959, shutdown: 2015, cancellationYear: null, lat: 50.9138886573521, lng: 0.962049399769726, mapX: 1106.23, mapY: 948, cluster: null, rowId: "row-31", timelineColumnX: 902.578 },
  { id: "Dungeness A2", name: "Dungeness A2", site: "Dungeness", status: "retired", cancellationYearInferred: false, capacityMw: 220, constructionStart: 1953, commercialOperation: 1959, shutdown: 2015, cancellationYear: null, lat: 50.9138886573521, lng: 0.962049399769726, mapX: 1106.23, mapY: 948, cluster: null, rowId: "row-32", timelineColumnX: 885.127 },
  { id: "Hunterston B1", name: "Hunterston B1", site: "Hunterston", status: "retired", cancellationYearInferred: false, capacityMw: 657, constructionStart: 1961, commercialOperation: 1965, shutdown: 2021, cancellationYear: null, lat: 55.7229, lng: -4.8913, mapX: 800.44, mapY: 529.26, cluster: null, rowId: "row-33", timelineColumnX: 862.964 },
  { id: "Hunterston B2", name: "Hunterston B2", site: "Hunterston", status: "retired", cancellationYearInferred: false, capacityMw: 657, constructionStart: 1961, commercialOperation: 1966, shutdown: 2022, cancellationYear: null, lat: 55.7229, lng: -4.8913, mapX: 800.44, mapY: 529.26, cluster: null, rowId: "row-34", timelineColumnX: 836.06 },
  { id: "Hunterston A1", name: "Hunterston A1", site: "Hunterston", status: "retired", cancellationYearInferred: false, capacityMw: 160, constructionStart: 1953, commercialOperation: 1962, shutdown: 1986, cancellationYear: null, lat: 55.7229, lng: -4.8913, mapX: 800.44, mapY: 529.26, cluster: null, rowId: "row-35", timelineColumnX: 814.845 },
  { id: "Hunterston A2", name: "Hunterston A2", site: "Hunterston", status: "retired", cancellationYearInferred: false, capacityMw: 160, constructionStart: 1953, commercialOperation: 1962, shutdown: 1986, cancellationYear: null, lat: 55.7229, lng: -4.8913, mapX: 800.44, mapY: 529.26, cluster: null, rowId: "row-36", timelineColumnX: 799.323 },
  { id: "Wylfa 2", name: "Wylfa 2", site: "Wylfa", status: "retired", cancellationYearInferred: false, capacityMw: 535, constructionStart: 1956, commercialOperation: 1965, shutdown: 2014, cancellationYear: null, lat: 53.4161, lng: -4.4808, mapX: 554.95, mapY: 831.49, cluster: "wylfa", rowId: "row-37", timelineColumnX: 779.115 },
  { id: "Wylfa 1", name: "Wylfa 1", site: "Wylfa", status: "retired", cancellationYearInferred: false, capacityMw: 535, constructionStart: 1956, commercialOperation: 1963, shutdown: 2011, cancellationYear: null, lat: 53.4161, lng: -4.4808, mapX: 554.95, mapY: 831.49, cluster: "wylfa", rowId: "row-38", timelineColumnX: 754.292 },
  { id: "Sizewell A1", name: "Sizewell A1", site: "Sizewell", status: "retired", cancellationYearInferred: false, capacityMw: 290, constructionStart: 1954, commercialOperation: 1959, shutdown: 2003, cancellationYear: null, lat: 52.2199, lng: 1.6203, mapX: 1213.16, mapY: 898.94, cluster: "sizewell", rowId: "row-39", timelineColumnX: 733.01 },
  { id: "Sizewell A2", name: "Sizewell A2", site: "Sizewell", status: "retired", cancellationYearInferred: false, capacityMw: 290, constructionStart: 1954, commercialOperation: 1959, shutdown: 2003, cancellationYear: null, lat: 52.2199, lng: 1.6203, mapX: 1213.16, mapY: 898.94, cluster: "sizewell", rowId: "row-40", timelineColumnX: 715.158 },
  { id: "Trawsfynydd 1", name: "Trawsfynydd 1", site: "Trawsfynydd", status: "retired", cancellationYearInferred: false, capacityMw: 235, constructionStart: 1953, commercialOperation: 1960, shutdown: 1998, cancellationYear: null, lat: 52.9252, lng: -3.9474, mapX: 849.73, mapY: 779.15, cluster: null, rowId: "row-41", timelineColumnX: 697.466 },
  { id: "Trawsfynydd 2", name: "Trawsfynydd 2", site: "Trawsfynydd", status: "retired", cancellationYearInferred: false, capacityMw: 235, constructionStart: 1953, commercialOperation: 1960, shutdown: 1998, cancellationYear: null, lat: 52.9252, lng: -3.9474, mapX: 849.73, mapY: 779.15, cluster: null, rowId: "row-42", timelineColumnX: 679.92 },
  { id: "Oldbury A1", name: "Oldbury A1", site: "Oldbury", status: "retired", cancellationYearInferred: false, capacityMw: 217, constructionStart: 1955, commercialOperation: 1959, shutdown: 2011, cancellationYear: null, lat: 51.65201, lng: -2.5674, mapX: 921.62, mapY: 887.84, cluster: null, rowId: "row-43", timelineColumnX: 662.445 },
  { id: "Oldbury A2", name: "Oldbury A2", site: "Oldbury", status: "retired", cancellationYearInferred: false, capacityMw: 217, constructionStart: 1955, commercialOperation: 1960, shutdown: 2009, cancellationYear: null, lat: 51.65201, lng: -2.5674, mapX: 921.62, mapY: 887.84, cluster: null, rowId: "row-44", timelineColumnX: 645.062 },
  { id: "Berkeley 1", name: "Berkeley 1", site: "Berkeley", status: "retired", cancellationYearInferred: false, capacityMw: 166, constructionStart: 1953, commercialOperation: 1959, shutdown: 1985, cancellationYear: null, lat: 51.6927, lng: -2.4938, mapX: 925.64, mapY: 884.12, cluster: null, rowId: "row-45", timelineColumnX: 628.727 },
  { id: "Berkeley 2", name: "Berkeley 2", site: "Berkeley", status: "retired", cancellationYearInferred: false, capacityMw: 166, constructionStart: 1953, commercialOperation: 1959, shutdown: 1984, cancellationYear: null, lat: 51.6927, lng: -2.4938, mapX: 925.64, mapY: 884.12, cluster: null, rowId: "row-46", timelineColumnX: 613.461 },
  { id: "Bradwell 1", name: "Bradwell 1", site: "Bradwell", status: "retired", cancellationYearInferred: false, capacityMw: 146, constructionStart: 1953, commercialOperation: 1959, shutdown: 1999, cancellationYear: null, lat: 51.7417, lng: 0.8994, mapX: 1112.62, mapY: 880.01, cluster: null, rowId: "row-47", timelineColumnX: 598.563 },
  { id: "Bradwell 2", name: "Bradwell 2", site: "Bradwell", status: "retired", cancellationYearInferred: false, capacityMw: 146, constructionStart: 1953, commercialOperation: 1959, shutdown: 1991, cancellationYear: null, lat: 51.7417, lng: 0.8994, mapX: 1112.62, mapY: 880.01, cluster: null, rowId: "row-48", timelineColumnX: 567.792 },
  { id: "Dounreay PFR", name: "Dounreay PFR", site: "Dounreay", status: "retired", cancellationYearInferred: false, capacityMw: 133, constructionStart: 1959, commercialOperation: 1966, shutdown: 1991, cancellationYear: null, lat: 58.5805, lng: -3.7374, mapX: 860.7, mapY: 254.78, cluster: null, rowId: "row-49", timelineColumnX: 555.361 },
  { id: "Dounreay DFR", name: "Dounreay DFR", site: "Dounreay", status: "retired", cancellationYearInferred: false, capacityMw: 133, constructionStart: 1953, commercialOperation: 1962, shutdown: 1999, cancellationYear: null, lat: 58.5805, lng: -3.7374, mapX: 860.7, mapY: 254.78, cluster: null, rowId: "row-50", timelineColumnX: 584.049 },
  { id: "Calder Hall 1", name: "Calder Hall 1", site: "Calder Hall", status: "retired", cancellationYearInferred: false, capacityMw: 60, constructionStart: 1953, commercialOperation: 1956, shutdown: 2001, cancellationYear: null, lat: 54.4184, lng: -3.4921, mapX: 570.71, mapY: 568.96, cluster: null, rowId: "row-51", timelineColumnX: 546.696 },
  { id: "Calder Hall 2", name: "Calder Hall 2", site: "Calder Hall", status: "retired", cancellationYearInferred: false, capacityMw: 60, constructionStart: 1953, commercialOperation: 1958, shutdown: 2001, cancellationYear: null, lat: 54.4184, lng: -3.4921, mapX: 570.71, mapY: 568.96, cluster: null, rowId: "row-52", timelineColumnX: 536.215 },
  { id: "Calder Hall 3", name: "Calder Hall 3", site: "Calder Hall", status: "retired", cancellationYearInferred: false, capacityMw: 60, constructionStart: 1953, commercialOperation: 1956, shutdown: 2001, cancellationYear: null, lat: 54.4184, lng: -3.4921, mapX: 570.71, mapY: 568.96, cluster: null, rowId: "row-53", timelineColumnX: 525.739 },
  { id: "Calder Hall 4", name: "Calder Hall 4", site: "Calder Hall", status: "retired", cancellationYearInferred: false, capacityMw: 60, constructionStart: 1953, commercialOperation: 1958, shutdown: 2001, cancellationYear: null, lat: 54.4184, lng: -3.4921, mapX: 570.71, mapY: 568.96, cluster: null, rowId: "row-54", timelineColumnX: 515.259 },
  { id: "Chapelcross 1", name: "Chapelcross 1", site: "Chapelcross", status: "retired", cancellationYearInferred: false, capacityMw: 60, constructionStart: 1953, commercialOperation: 1958, shutdown: 2002, cancellationYear: null, lat: 55.0169, lng: -3.22401, mapX: 887.51, mapY: 593.94, cluster: null, rowId: "row-55", timelineColumnX: 504.788 },
  { id: "Chapelcross 2", name: "Chapelcross 2", site: "Chapelcross", status: "retired", cancellationYearInferred: false, capacityMw: 60, constructionStart: 1953, commercialOperation: 1958, shutdown: 2002, cancellationYear: null, lat: 55.0169, lng: -3.22401, mapX: 887.51, mapY: 593.94, cluster: null, rowId: "row-56", timelineColumnX: 473.36 },
  { id: "Chapelcross 3", name: "Chapelcross 3", site: "Chapelcross", status: "retired", cancellationYearInferred: false, capacityMw: 60, constructionStart: 1953, commercialOperation: 1958, shutdown: 1977, cancellationYear: null, lat: 55.0169, lng: -3.22401, mapX: 887.51, mapY: 593.94, cluster: null, rowId: "row-57", timelineColumnX: 451.121 },
  { id: "Chapelcross 4", name: "Chapelcross 4", site: "Chapelcross", status: "retired", cancellationYearInferred: false, capacityMw: 60, constructionStart: 1953, commercialOperation: 1959, shutdown: 2002, cancellationYear: null, lat: 55.0169, lng: -3.22401, mapX: 887.51, mapY: 593.94, cluster: null, rowId: "row-58", timelineColumnX: 494.317 },
  { id: "Winfrith SGHWR", name: "Winfrith SGHWR", site: "Winfrith SGHWR", status: "retired", cancellationYearInferred: false, capacityMw: 100, constructionStart: 1956, commercialOperation: 1959, shutdown: 1986, cancellationYear: null, lat: 50.6825, lng: -2.2649, mapX: 937.6, mapY: 968.05, cluster: null, rowId: "row-59", timelineColumnX: 461.834 },
  { id: "Windscale AGR", name: "Windscale AGR", site: "Windscale AGR", status: "retired", cancellationYearInferred: false, capacityMw: 36, constructionStart: 1953, commercialOperation: 1959, shutdown: 2002, cancellationYear: null, lat: 54.4245, lng: -3.4952, mapX: 568.42, mapY: 561.26, cluster: null, rowId: "row-60", timelineColumnX: 483.836 },
  { id: "Heysham B1", name: "Heysham B1", site: "Heysham", status: "operating", cancellationYearInferred: false, capacityMw: 653, constructionStart: 1975, commercialOperation: 1988, shutdown: 2030, cancellationYear: null, lat: 54.03101, lng: -2.9112, mapX: 903.85, mapY: 682.4, cluster: null, rowId: "row-61", timelineColumnX: 432.909 },
  { id: "Heysham B2", name: "Heysham B2", site: "Heysham", status: "operating", cancellationYearInferred: false, capacityMw: 653, constructionStart: 1975, commercialOperation: 1988, shutdown: 2030, cancellationYear: null, lat: 54.03101, lng: -2.9112, mapX: 903.85, mapY: 682.4, cluster: null, rowId: "row-62", timelineColumnX: 405.349 },
  { id: "Heysham A1", name: "Heysham A1", site: "Heysham", status: "operating", cancellationYearInferred: false, capacityMw: 653, constructionStart: 1964, commercialOperation: 1990, shutdown: 2030, cancellationYear: null, lat: 54.03101, lng: -2.9112, mapX: 903.85, mapY: 682.4, cluster: null, rowId: "row-63", timelineColumnX: 378.285 },
  { id: "Heysham A2", name: "Heysham A2", site: "Heysham", status: "operating", cancellationYearInferred: false, capacityMw: 653, constructionStart: 1964, commercialOperation: 1990, shutdown: 2030, cancellationYear: null, lat: 54.03101, lng: -2.9112, mapX: 903.85, mapY: 682.4, cluster: null, rowId: "row-64", timelineColumnX: 351.723 },
  { id: "Torness 1", name: "Torness 1", site: "Torness", status: "operating", cancellationYearInferred: false, capacityMw: 682, constructionStart: 1975, commercialOperation: 1986, shutdown: 2030, cancellationYear: null, lat: 55.9679, lng: -2.4086, mapX: 929.13, mapY: 506.26, cluster: null, rowId: "row-65", timelineColumnX: 324.646 },
  { id: "Torness 2", name: "Torness 2", site: "Torness", status: "operating", cancellationYearInferred: false, capacityMw: 682, constructionStart: 1975, commercialOperation: 1988, shutdown: 2030, cancellationYear: null, lat: 55.9679, lng: -2.4086, mapX: 929.13, mapY: 506.26, cluster: null, rowId: "row-66", timelineColumnX: 297.039 },
  { id: "Hartlepool A1", name: "Hartlepool A1", site: "Hartlepool", status: "operating", cancellationYearInferred: false, capacityMw: 655, constructionStart: 1962, commercialOperation: 1991, shutdown: 2030, cancellationYear: null, lat: 54.6341, lng: -1.1801, mapX: 993.26, mapY: 628.4, cluster: null, rowId: "row-67", timelineColumnX: 269.681 },
  { id: "Hartlepool A2", name: "Hartlepool A2", site: "Hartlepool", status: "operating", cancellationYearInferred: false, capacityMw: 655, constructionStart: 1962, commercialOperation: 1991, shutdown: 2030, cancellationYear: null, lat: 54.6341, lng: -1.1801, mapX: 993.26, mapY: 628.4, cluster: null, rowId: "row-68", timelineColumnX: 242.561 },
  { id: "Sizewell B", name: "Sizewell B", site: "Sizewell", status: "operating", cancellationYearInferred: false, capacityMw: 1188, constructionStart: 1984, commercialOperation: 1994, shutdown: 2030, cancellationYear: null, lat: 52.2199, lng: 1.6203, mapX: 1213.16, mapY: 898.94, cluster: "sizewell", rowId: "row-69", timelineColumnX: 210.911 },
  { id: "Hinkley Point C1", name: "Hinkley Point C1", site: "Hinkley Point", status: "underConstruction", cancellationYearInferred: false, capacityMw: 1630, constructionStart: 2016, commercialOperation: 2030, shutdown: null, cancellationYear: null, lat: 51.2063, lng: -3.1423, mapX: 901.55, mapY: 924.76, cluster: null, rowId: "row-70", timelineColumnX: 171.833 },
  { id: "Hinkley Point C2", name: "Hinkley Point C2", site: "Hinkley Point", status: "underConstruction", cancellationYearInferred: false, capacityMw: 1630, constructionStart: 2018, commercialOperation: 2030, shutdown: null, cancellationYear: null, lat: 51.2063, lng: -3.1423, mapX: 901.55, mapY: 924.76, cluster: null, rowId: "row-71", timelineColumnX: 129.913 },
];

export const REACTOR_BY_ID: Record<string, Reactor> = (() => {
  const out: Record<string, Reactor> = {};
  for (const r of REACTORS) out[r.id] = r;
  return out;
})();

export function reactorsByStatus(status: ReactorStatus): Reactor[] {
  return REACTORS.filter((r) => r.status === status);
}

/** Y → year linear mapping anchors for the dendrogram-clean SVG's
 *  timeline bars. Components that render the timeline by reading
 *  reactor y-coords back from the source SVG should use this. */
export const TIMELINE_Y_TO_YEAR = {
  y0: 835.316, year0: 1953,
  y1: 993.758, year1: 2030,
} as const;

export function yearAtTimelineY(y: number): number {
  const m = TIMELINE_Y_TO_YEAR;
  const t = (y - m.y0) / (m.y1 - m.y0);
  return m.year0 + t * (m.year1 - m.year0);
}

export function timelineYAtYear(year: number): number {
  const m = TIMELINE_Y_TO_YEAR;
  const t = (year - m.year0) / (m.year1 - m.year0);
  return m.y0 + t * (m.y1 - m.y0);
}
