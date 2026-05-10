// Type-safe accessor for poster-005-forms.json (the JSON produced by
// client/scripts/extract-poster-005-forms.mjs).
//
// The JSON itself is the canonical record. This module just wraps it
// with TypeScript types so consumers get autocomplete and refactor
// safety. Vite handles the JSON import.

import data from './poster-005-forms.json';

export type ReactorStatus = 'construction' | 'operating' | 'retired' | 'cancelled';

export interface Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface StatusBlob {
  id: ReactorStatus;
  label: string;          // 'Under Construction' | 'Operating' | 'Retired' | 'Cancelled'
  color_token: string;    // locked-palette UI hex (e.g. '#A51E22')
  print_stroke: string;   // stroke value used inside the dendrogram SVG
                          // (slightly different from color_token —
                          // print SVG drift is preserved)
  total_mw: number;
  reactor_count: number;
  form_paths: string[];   // d-strings for the 256 polylines making
                          // the blob silhouette; consumed by the
                          // canvas form-motion engine
  bbox: Bbox;
  bbox_centroid: [number, number];
  anchor: [number, number]; // pulse origin — defaults to bbox_centroid;
                            // can be overridden after visual review.
}

export interface Reactor {
  id: string;             // 'row-NN', matching timeline SVG <g id="row-NN">
  name: string;           // unit name from data-unit (e.g. 'Hinkley Point B1')
  site: string | null;    // site name (matches CSV)
  status: ReactorStatus;
  cancellation_year_inferred: boolean;
  mw: number | null;
  construction_start_year: number | null;
  grid_connection_year: number | null;
  retirement_year: number | null;
  cancellation_year: number | null;
  lat: number | null;
  lng: number | null;
  dendrogram_leaf_cx: number | null;
  dendrogram_leaf_cy: number | null;
  dendrogram_leaf_r: number | null;
  timeline_row_id: string;       // = id (kept as a separate field for clarity)
  timeline_column_x: number;     // x-coord of this reactor's column in the timeline SVG
}

export interface Site {
  id: string;
  name: string;
  lat: number;
  lng: number;
  reactor_ids: string[];
  is_cluster: boolean;    // true for the three print callout circles
                          // (Sellafield, Wylfa, Sizewell — and
                          // Moorside, which is co-located with
                          // Sellafield but the print labels it as a
                          // distinct cluster).
}

export interface Timeline {
  x_min_year: number;     // 1953 (per brief)
  x_max_year: number;     // 2030 (per brief)
  y_to_year_mapping: {
    y0: number;
    year0: number;
    y1: number;
    year1: number;
  };
}

export interface MapCluster {
  id: string;             // 'clippath' / 'clippath-1' / 'clippath-2' as in source SVG
  cx: number;
  cy: number;
  r: number;
}

export interface Poster005Forms {
  meta: {
    generated_at: string;
    sources: {
      timeline_svg: string;
      dendrogram_svg: string;
      map_svg: string;
      sites_csv: string;
    };
    reactor_count: number;
    notes: string;
  };
  status_blobs: StatusBlob[];
  reactors: Reactor[];
  sites: Site[];
  timeline: Timeline;
  dendrogram_links: string[];   // Bézier d-strings
  map_clusters: MapCluster[];
}

export function loadPoster005Forms(): Poster005Forms {
  return data as unknown as Poster005Forms;
}

// Helpers used across the three sub-views.

export function yearAtY(timeline: Timeline, y: number): number {
  const m = timeline.y_to_year_mapping;
  const t = (y - m.y0) / (m.y1 - m.y0);
  return m.year0 + t * (m.year1 - m.year0);
}

export function yAtYear(timeline: Timeline, year: number): number {
  const m = timeline.y_to_year_mapping;
  const t = (year - m.year0) / (m.year1 - m.year0);
  return m.y0 + t * (m.y1 - m.y0);
}

export function reactorIsLiveAtYear(r: Reactor, year: number): boolean {
  if (r.status === 'cancelled') {
    return false;
  }
  if (r.construction_start_year === null) return false;
  if (year < r.construction_start_year) return false;
  // Operating: live until current year.
  if (r.status === 'operating') return true;
  // Retired: live up to retirement.
  if (r.status === 'retired') {
    return r.retirement_year === null ? true : year <= r.retirement_year;
  }
  // Under construction: live (in the "being built" sense) up to
  // projected grid connection.
  if (r.status === 'construction') {
    return r.grid_connection_year === null ? true : year <= r.grid_connection_year;
  }
  return false;
}
