// ─────────────────────────────────────────────────────────────────
// poster005Hubs.ts — prepared hub-form data for the canvas overlay.
//
// Reads status_blobs.form_paths (space-separated x y x y ... pairs)
// from poster-005-forms.json and converts them to the same prepared-
// form shape used by Poster001CanvasViz: a list of Polylines per
// status with pre-computed depth, dw, and a Path2D for outline lines.
//
// Hub centroids are taken from the JSON's bbox_centroid (the print's
// rendered visual centre of each blob). Leaves are positioned at
// dendrogram_leaf_cx / cy from each reactor.
//
// The motion magnitude per hub is derived from total_mw_sourced —
// larger fleets get more vigorous interior flow. We reuse posterMotion's
// resolveMotion by passing the MW through a log-scale similar to
// emissions; the absolute numbers are different but the shape of the
// curve matches.
// ─────────────────────────────────────────────────────────────────

import { TUNING, depthWeight } from '@/lib/posterMotion';
import { STATUS_COLOUR, type ReactorStatus } from '@/lib/poster005Data';
import formsData from '@/assets/poster-005-forms.json';

export interface PreparedHubLine {
  path: Path2D | null;
  pts: Float32Array;
  n: number;
  depth: number;
  dw: number;
}

export interface PreparedHub {
  status: ReactorStatus;
  label: string;
  colour: string;
  centroid: [number, number];      // SVG-units (x, y)
  anchor: [number, number];        // bottom-of-hub anchor for pulse origin
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  lines: PreparedHubLine[];
  flowAmp: number;
  mw: number;
  reactorCount: number;
}

/** Convert a space-separated "x y x y" point list into a Float32Array. */
function parsePolylinePoints(s: string): Float32Array {
  const toks = s.trim().split(/\s+/);
  const out = new Float32Array(toks.length);
  for (let i = 0; i < toks.length; i++) out[i] = parseFloat(toks[i]);
  return out;
}

function buildPath(pts: Float32Array, n: number): Path2D {
  const p = new Path2D();
  if (n < 2) return p;
  p.moveTo(pts[0], pts[1]);
  for (let k = 1; k < n; k++) {
    p.lineTo(pts[k * 2], pts[k * 2 + 1]);
  }
  return p;
}

// Flow amplitude must stay tiny relative to the hub bbox or the
// breathing animation visibly warps the form. Print hub bbox sizes:
//   UC          37 × 37
//   Operating   58 × 58
//   Retired    123 × 123
//   Cancelled  119 × 119
// At ~2% of bbox short side, the displacement is subtle and the
// strokes don't collide into a solid blob. Court round-5:
// "animations are really extreme and are warping the forms too much."
function flowAmpForBbox(bboxShortSide: number): number {
  return Math.max(0.6, bboxShortSide * 0.022);
}

function preparedHubFromBlob(blob: {
  id: string;
  label: string;
  print_stroke: string;
  form_paths: string[];
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  bbox_centroid: [number, number];
  anchor: [number, number];
  reactor_count: number;
  total_mw_sourced: number;
}): PreparedHub {
  const status = blob.id as ReactorStatus;
  const polylines = blob.form_paths.map((s) => {
    const pts = parsePolylinePoints(s);
    return { pts, n: pts.length >> 1 };
  });
  const N = polylines.length;
  const lines: PreparedHubLine[] = polylines.map((L, li) => {
    const depth = N > 1 ? li / (N - 1) : 0;
    const dw = depthWeight(depth);
    return {
      path: dw === 0 ? buildPath(L.pts, L.n) : null,
      pts: L.pts,
      n: L.n,
      depth,
      dw,
    };
  });

  const bboxShortSide = Math.min(
    blob.bbox.maxX - blob.bbox.minX,
    blob.bbox.maxY - blob.bbox.minY,
  );
  const flowAmp = flowAmpForBbox(bboxShortSide);
  return {
    status,
    label: blob.label,
    colour: STATUS_COLOUR[status],
    centroid: blob.bbox_centroid,
    anchor: blob.anchor,
    bbox: blob.bbox,
    lines,
    flowAmp,
    mw: blob.total_mw_sourced,
    reactorCount: blob.reactor_count,
  };
}

export const HUBS: PreparedHub[] = (
  formsData as unknown as {
    status_blobs: {
      id: string;
      label: string;
      print_stroke: string;
      form_paths: string[];
      bbox: { minX: number; minY: number; maxX: number; maxY: number };
      bbox_centroid: [number, number];
      anchor: [number, number];
      reactor_count: number;
      total_mw_sourced: number;
    }[];
  }
).status_blobs.map(preparedHubFromBlob);

export const HUB_BY_STATUS: Record<ReactorStatus, PreparedHub> = (() => {
  const out = {} as Record<ReactorStatus, PreparedHub>;
  for (const h of HUBS) out[h.status] = h;
  return out;
})();

// Re-export TUNING so the canvas loop doesn't need to import from
// two places.
export { TUNING };

// ─── Leaf positions per reactor ─────────────────────────────────

export interface HubLeaf {
  reactorId: string;
  status: ReactorStatus;
  x: number;
  y: number;
}

// The dendrogram's leaf row sits at SVG y=800.993 — every leaf
// circle (72 of them) is on this line in the print. The JSON
// extractor mistakenly stored the cancellation-dot y (which lives
// on the timeline strip below) into dendrogram_leaf_cy for cancelled
// reactors, so we anchor on this constant rather than that field.
const DENDROGRAM_LEAF_Y = 800.993;

export const LEAVES_BY_STATUS: Record<ReactorStatus, HubLeaf[]> = (() => {
  const out: Record<ReactorStatus, HubLeaf[]> = {
    underConstruction: [],
    operating: [],
    retired: [],
    cancelled: [],
  };
  const reactors = (
    formsData as unknown as {
      reactors: {
        id: string;
        status: ReactorStatus;
        dendrogram_leaf_cx: number | null;
      }[];
    }
  ).reactors;
  for (const r of reactors) {
    if (r.dendrogram_leaf_cx === null) continue;
    out[r.status].push({
      reactorId: r.id,
      status: r.status,
      x: r.dendrogram_leaf_cx,
      y: DENDROGRAM_LEAF_Y,
    });
  }
  return out;
})();
