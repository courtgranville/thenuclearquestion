// Poster 005 — Dendrogram sub-view (v1.1 — proportional bands,
// computed leaf positions, area-scaled form motion).
//
// Layout. The print SVG places all four blobs in a tight cluster at
// the top of its viewBox; horizontal space is not allocated by
// reactor count. We override that layout here so each blob owns
// horizontal space proportional to its reactor count, the leaves
// fan out across that space at MW-proportional radii, and the
// motion amplitude scales by sqrt(form_area) so smaller forms
// breathe within their silhouette rather than warping.
//
// Bands (left → right): Under Construction 5 % / Operating 15 % /
// Retired 40 % / Cancelled 40 %. Margins between bands are 20 px in
// the local viewBox.
//
// Form-motion fix: the v1 build used the same flowAmp for every blob,
// which deformed the smaller forms (UC, Op) out of recognisable
// shape. We now scale flowAmp by `sqrt(form_area / max_form_area)` and
// then multiply by 0.4 (the 60 % overall reduction the fix brief
// asked for).

import { useEffect, useMemo, useRef } from 'react';
import { buildPolylines, type BBox } from '@/lib/parseSvg';
import { resolveMotion, depthWeight, TUNING } from '@/lib/posterMotion';
import {
  loadPoster005Forms,
  type ReactorStatus,
  type Reactor,
} from '@/assets/poster005';
import { poster005Store, type Poster005State } from '@/lib/poster005Store';

const PAGE_BG = '#ECE7DF';
const FOCUS_DIM_BLOB = 0.25;
const SECTOR_GROW_RATE_PX_PER_MS = 0.025;
const SECTOR_GROW_MIN_MS = 250;
const SECTOR_GROW_MAX_MS = 1200;
const PULSE_TRAVEL_MS = 700;
const PULSE_GLOW_R = 8;
const PULSE_BULGE_HALF_LEN = 14;
const PULSE_GLOW_COLOR = 'rgba(255, 235, 130, 1)';
const PULSE_GLOW_EDGE = 'rgba(255, 240, 170, 0)';
const PULSE_BULGE_COLOR = 'rgba(255, 250, 220, 1)';
const PULSE_CORE_COLOR = '#ffffff';
const PULSE_CORE_R = 1.4;

const STATUS_ORDER: ReactorStatus[] = ['construction', 'operating', 'retired', 'cancelled'];
const STATUS_LABEL: Record<ReactorStatus, string> = {
  construction: 'Under Construction',
  operating:    'Operating',
  retired:      'Retired',
  cancelled:    'Cancelled',
};
const CANCELLED_CAPTION =
  '14,141 MW announced and never built — more than twice the UK fleet currently operating.';

// Local viewBox for the dendrogram render. Bands are sized as a
// fraction of (VIEWBOX.w - margins).
const VIEWBOX = { x: 0, y: 0, w: 1600, h: 700 } as const;
const BAND_MARGIN = 20;
const BAND_WIDTH_FRACTION: Record<ReactorStatus, number> = {
  construction: 0.05,
  operating:    0.15,
  retired:      0.40,
  cancelled:    0.40,
};
// y positions for the layout.
const BLOB_CENTER_Y = 200;
const LEAF_Y = 500;
const LABEL_Y = 580;
// Leaf radius range (px in the viewBox).
const LEAF_R_MIN = 3;
const LEAF_R_MAX = 15;

interface PreparedLine {
  pts: Float32Array; // already translated to the blob's new band position
  n: number;
  depth: number;
  dw: number;
}

interface Band {
  left: number;
  right: number;
  center: number;
  width: number;
}

interface PreparedBlob {
  id: ReactorStatus;
  band: Band;
  /** translated form polylines, ready to render directly */
  lines: PreparedLine[];
  /** translated bbox */
  bbox: BBox;
  silhouetteIdx: number;
  flowAmp: number;
  /** anchor where the dendrogram links emerge from */
  anchor: [number, number];
  /** reactors of this status, with computed leaf positions and radii */
  leaves: Array<{ reactor: Reactor; leafCx: number; leafCy: number; leafR: number; linkD: string }>;
}

function computeBands(): Record<ReactorStatus, Band> {
  const totalAvail = VIEWBOX.w - 5 * BAND_MARGIN; // 5 gaps total (left + 3 between + right)
  const out = {} as Record<ReactorStatus, Band>;
  let cursor = BAND_MARGIN;
  for (const id of STATUS_ORDER) {
    const w = totalAvail * BAND_WIDTH_FRACTION[id];
    const left = cursor;
    const right = cursor + w;
    out[id] = { left, right, center: (left + right) / 2, width: w };
    cursor = right + BAND_MARGIN;
  }
  return out;
}

function prepareBlobs(data: ReturnType<typeof loadPoster005Forms>): PreparedBlob[] {
  const bands = computeBands();

  // Compute each blob's bbox area to scale form motion.
  const areas: Record<ReactorStatus, number> = {
    construction: 0, operating: 0, retired: 0, cancelled: 0,
  };
  for (const blob of data.status_blobs) {
    const b = blob.bbox;
    areas[blob.id] = (b.maxX - b.minX) * (b.maxY - b.minY);
  }
  const maxArea = Math.max(...(Object.values(areas) as number[]));

  const out: PreparedBlob[] = [];

  for (const blob of data.status_blobs) {
    const band = bands[blob.id];
    const { polylines, bbox: origBbox } = buildPolylines(blob.form_paths);

    // Translation that maps the original blob centroid to the band centre.
    const tx = band.center - blob.bbox_centroid[0];
    const ty = BLOB_CENTER_Y - blob.bbox_centroid[1];

    // Translate polylines.
    const N = polylines.length;
    const lines: PreparedLine[] = polylines.map((L, li) => {
      const out = new Float32Array(L.n * 2);
      for (let k = 0; k < L.n; k++) {
        out[k * 2] = L.pts[k * 2] + tx;
        out[k * 2 + 1] = L.pts[k * 2 + 1] + ty;
      }
      const depth = N > 1 ? li / (N - 1) : 0;
      return { pts: out, n: L.n, depth, dw: depthWeight(depth) };
    });
    const newBbox: BBox = {
      minX: origBbox.minX + tx,
      minY: origBbox.minY + ty,
      maxX: origBbox.maxX + tx,
      maxY: origBbox.maxY + ty,
      cx: 0, cy: 0, size: 0,
    };

    // Silhouette = single largest-bbox-area polyline.
    let silIdx = 0, silMaxArea = -Infinity;
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
      for (let k = 0; k < L.n; k++) {
        const x = L.pts[k * 2], y = L.pts[k * 2 + 1];
        if (x < mnX) mnX = x; if (x > mxX) mxX = x;
        if (y < mnY) mnY = y; if (y > mxY) mxY = y;
      }
      const a = (mxX - mnX) * (mxY - mnY);
      if (a > silMaxArea) { silMaxArea = a; silIdx = i; }
    }

    // Form motion amp: sqrt(area / maxArea) × 0.4 (60% reduction baseline).
    const baseFlow = resolveMotion(blob.total_mw).flowAmp;
    const ampScale = Math.sqrt(areas[blob.id] / maxArea) * 0.4;
    const flowAmp = baseFlow * ampScale;

    // Anchor where dendrogram links emerge: bottom-centre of the
    // (translated) blob bbox.
    const anchor: [number, number] = [band.center, newBbox.maxY + 4];

    // Leaves: reactors of this status, sorted by row id (matches
    // timeline ordering) so the dendrogram visually mirrors the
    // timeline's left-to-right reactor order.
    const myReactors = data.reactors
      .filter((r) => r.status === blob.id)
      .sort((a, b) => a.id.localeCompare(b.id));
    const maxMw = Math.max(...myReactors.map((r) => r.mw ?? 0), 1);
    const n = myReactors.length;
    const stepX = band.width / (n + 1);
    const leaves = myReactors.map((reactor, i) => {
      const leafCx = band.left + (i + 1) * stepX;
      const leafCy = LEAF_Y;
      const leafR = Math.max(LEAF_R_MIN, Math.sqrt((reactor.mw ?? 0) / maxMw) * LEAF_R_MAX);
      // Q-curve from anchor down to the leaf, dipping ~50px below
      // anchor at the midpoint for a soft visual flow.
      const mid = ((anchor[0] + leafCx) / 2);
      const ctrlY = anchor[1] + 60;
      const linkD = `M ${anchor[0]} ${anchor[1]} Q ${mid} ${ctrlY} ${leafCx} ${leafCy}`;
      return { reactor, leafCx, leafCy, leafR, linkD };
    });

    out.push({
      id: blob.id,
      band,
      lines,
      bbox: newBbox,
      silhouetteIdx: silIdx,
      flowAmp,
      anchor,
      leaves,
    });
  }
  return out;
}

export function Poster005Dendrogram() {
  const data = useMemo(() => loadPoster005Forms(), []);
  const prepared = useMemo(() => prepareBlobs(data), [data]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlaySvgRef = useRef<SVGSVGElement | null>(null);
  const leafRefs = useRef<Map<string, SVGCircleElement>>(new Map());
  const captionRef = useRef<HTMLDivElement | null>(null);

  // Render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = containerRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const DPR = 2.0;
    function sizeCanvas() {
      const rect = stage!.getBoundingClientRect();
      canvas!.width = Math.round(rect.width * DPR);
      canvas!.height = Math.round(rect.height * DPR);
      canvas!.style.width = rect.width + 'px';
      canvas!.style.height = rect.height + 'px';
    }
    sizeCanvas();
    const onResize = () => sizeCanvas();
    window.addEventListener('resize', onResize);

    // Per-leaf scale tween.
    const leafTween: Record<string, { from: number; to: number; start: number; durMs: number }> = {};
    function startLeafTween(reactorId: string, target: number) {
      const el = leafRefs.current.get(reactorId);
      if (!el) return;
      const cur = parseFloat(el.getAttribute('r') ?? '3');
      const delta = Math.abs(target - cur);
      const durMs = Math.max(SECTOR_GROW_MIN_MS, Math.min(SECTOR_GROW_MAX_MS, delta / SECTOR_GROW_RATE_PX_PER_MS));
      leafTween[reactorId] = { from: cur, to: target, start: performance.now(), durMs };
    }

    // Per-blob baseline leaf radii (used when focus is cleared).
    const baselineR: Record<string, number> = {};
    for (const p of prepared) {
      for (const lf of p.leaves) {
        baselineR[lf.reactor.id] = lf.leafR;
      }
    }

    interface Pulse { d: string; pathLen: number; start: number; durMs: number; pathEl: SVGPathElement }
    const pulses: Pulse[] = [];
    function startPulseCascade(status: ReactorStatus) {
      const pb = prepared.find((p) => p.id === status);
      if (!pb) return;
      const ns = 'http://www.w3.org/2000/svg';
      const now = performance.now();
      for (let i = 0; i < pb.leaves.length; i++) {
        const lf = pb.leaves[i];
        const el = document.createElementNS(ns, 'path');
        el.setAttribute('d', lf.linkD);
        document.body.appendChild(el);
        el.style.position = 'absolute';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        const pathLen = el.getTotalLength();
        pulses.push({
          d: lf.linkD,
          pathLen,
          start: now + i * 25,
          durMs: PULSE_TRAVEL_MS,
          pathEl: el,
        });
      }
    }
    function clearPulses() {
      for (const p of pulses) p.pathEl.remove();
      pulses.length = 0;
    }

    let lastFocus: ReactorStatus | null = null;
    function onState(state: Poster005State) {
      const focus = state.focusStatus;
      if (focus !== lastFocus) {
        if (focus) {
          // Focused status: leaves grow to MW-proportional radii
          // (already at baseline); other statuses' leaves shrink to
          // baseline LEAF_R_MIN to recede.
          for (const p of prepared) {
            for (const lf of p.leaves) {
              const target = p.id === focus ? lf.leafR : LEAF_R_MIN;
              startLeafTween(lf.reactor.id, target);
            }
          }
          clearPulses();
          startPulseCascade(focus);
        } else {
          for (const id in baselineR) startLeafTween(id, baselineR[id]);
          clearPulses();
        }
        lastFocus = focus;
        if (captionRef.current) {
          captionRef.current.style.opacity = focus === 'cancelled' ? '1' : '0';
        }
      }
    }
    onState(poster005Store.getCurrent());
    const unsub = poster005Store.subscribe(onState);

    let running = true;
    function frame(now: number) {
      if (!running) return;
      ctx!.save();
      ctx!.scale(DPR, DPR);
      const rect = stage!.getBoundingClientRect();
      ctx!.clearRect(0, 0, rect.width, rect.height);
      // Map our local viewBox to CSS pixels.
      const sx = rect.width / VIEWBOX.w;
      const sy = rect.height / VIEWBOX.h;
      const scale = Math.min(sx, sy);
      const offX = (rect.width - VIEWBOX.w * scale) / 2;
      const offY = (rect.height - VIEWBOX.h * scale) / 2;
      ctx!.translate(offX, offY);
      ctx!.scale(scale, scale);

      const t = now / 1000;
      const focus = poster005Store.getCurrent().focusStatus;
      for (const p of prepared) {
        const dim = focus && focus !== p.id ? FOCUS_DIM_BLOB : 1;
        ctx!.globalAlpha = dim;
        const stroke = (data.status_blobs.find((b) => b.id === p.id))?.print_stroke ?? '#0d1a1e';

        // Silhouette occlusion fill.
        const sil = p.lines[p.silhouetteIdx];
        if (sil && sil.n > 1) {
          ctx!.fillStyle = PAGE_BG;
          ctx!.beginPath();
          ctx!.moveTo(sil.pts[0], sil.pts[1]);
          for (let k = 1; k < sil.n; k++) {
            ctx!.lineTo(sil.pts[k * 2], sil.pts[k * 2 + 1]);
          }
          ctx!.closePath();
          ctx!.fill();
        }

        // Strokes with depth-weighted noise.
        ctx!.strokeStyle = stroke;
        ctx!.lineWidth = 0.45 / scale;
        for (const L of p.lines) {
          if (L.n < 2) continue;
          const amp = p.flowAmp * L.dw;
          ctx!.beginPath();
          for (let k = 0; k < L.n; k++) {
            const px = L.pts[k * 2];
            const py = L.pts[k * 2 + 1];
            const dx = amp * (
              Math.sin(t * TUNING.flowW1 + px * TUNING.flowK1 + py * TUNING.flowK1 * 0.6) +
              TUNING.flowAmp2Weight * Math.sin(t * TUNING.flowW2 + px * TUNING.flowK2 + py * TUNING.flowK2 * 0.7)
            );
            const dy = amp * (
              Math.cos(t * TUNING.flowW1 * 0.8 + py * TUNING.flowK1 + px * TUNING.flowK1 * 0.5) +
              TUNING.flowAmp2Weight * Math.cos(t * TUNING.flowW2 * 0.9 + py * TUNING.flowK2 + px * TUNING.flowK2 * 0.6)
            );
            if (k === 0) ctx!.moveTo(px + dx, py + dy);
            else ctx!.lineTo(px + dx, py + dy);
          }
          ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
      }

      // Apply leaf tweens (write SVG circle r attributes).
      for (const id of Object.keys(leafTween)) {
        const tw = leafTween[id];
        const el = leafRefs.current.get(id);
        if (!el) { delete leafTween[id]; continue; }
        const tt = Math.min(1, (now - tw.start) / tw.durMs);
        const eased = 1 - Math.pow(1 - tt, 3);
        const r = tw.from + (tw.to - tw.from) * eased;
        el.setAttribute('r', String(r));
        if (tt >= 1) delete leafTween[id];
      }

      // Pulses on canvas.
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pulse = pulses[i];
        const elapsed = now - pulse.start;
        if (elapsed < 0) continue;
        const tt = elapsed / pulse.durMs;
        if (tt >= 1) {
          pulse.pathEl.remove();
          pulses.splice(i, 1);
          continue;
        }
        const eased = 1 - Math.pow(1 - tt, 2);
        const len = pulse.pathLen * eased;
        const pt = pulse.pathEl.getPointAtLength(len);
        const cx = pt.x;
        const cy = pt.y;
        const tangent = pulse.pathEl.getPointAtLength(Math.min(pulse.pathLen, len + 1));
        const tx = tangent.x - cx, ty = tangent.y - cy;
        const tlen = Math.hypot(tx, ty) || 1;
        const ux = tx / tlen, uy = ty / tlen;
        ctx!.strokeStyle = PULSE_BULGE_COLOR;
        ctx!.lineWidth = 2.5 / scale;
        ctx!.beginPath();
        ctx!.moveTo(cx - ux * PULSE_BULGE_HALF_LEN, cy - uy * PULSE_BULGE_HALF_LEN);
        ctx!.lineTo(cx + ux * PULSE_BULGE_HALF_LEN, cy + uy * PULSE_BULGE_HALF_LEN);
        ctx!.stroke();
        const grd = ctx!.createRadialGradient(cx, cy, 0, cx, cy, PULSE_GLOW_R);
        grd.addColorStop(0, PULSE_GLOW_COLOR);
        grd.addColorStop(1, PULSE_GLOW_EDGE);
        ctx!.fillStyle = grd;
        ctx!.beginPath();
        ctx!.arc(cx, cy, PULSE_GLOW_R, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = PULSE_CORE_COLOR;
        ctx!.beginPath();
        ctx!.arc(cx, cy, PULSE_CORE_R, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.restore();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return () => {
      running = false;
      unsub();
      window.removeEventListener('resize', onResize);
      clearPulses();
    };
  }, [prepared, data]);

  // Click handlers on overlay (status focus toggling).
  useEffect(() => {
    const overlay = overlaySvgRef.current;
    if (!overlay) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Element | null;
      const hit = target?.closest('[data-blob-id]');
      if (hit) {
        const id = hit.getAttribute('data-blob-id') as ReactorStatus | null;
        if (id) {
          const cur = poster005Store.getCurrent().focusStatus;
          poster005Store.setFocusStatus(cur === id ? null : id);
        }
        e.stopPropagation();
      } else {
        poster005Store.setFocusStatus(null);
      }
    }
    overlay.addEventListener('pointerdown', onPointerDown);
    return () => overlay.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <div className="w-full">
      <p
        className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-3"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        Status Dendrogram
      </p>
      <div
        ref={containerRef}
        className="relative bg-[#f5f1eb]/50 rounded-sm border border-border/30 overflow-hidden"
        style={{ minHeight: 540 }}
      >
        {/* Layer 1 — link Q-curves (computed) */}
        <svg
          viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none', zIndex: 1 }}
        >
          {prepared.flatMap((p) =>
            p.leaves.map((lf) => (
              <path
                key={`${p.id}-${lf.reactor.id}`}
                d={lf.linkD}
                fill="none"
                stroke="#0d1a1e"
                strokeWidth="0.6"
                opacity="0.45"
              />
            )),
          )}
        </svg>

        {/* Layer 2 — canvas (form motion) */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 2 }} />

        {/* Layer 3 — overlay SVG (hit-areas, leaves, labels) */}
        <svg
          ref={overlaySvgRef}
          viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 3 }}
        >
          {/* Hit-rect spanning each band, anchored at the blob's
              vertical area + leaf row. Generous padding so users can
              hover without precision. */}
          {prepared.map((p) => (
            <rect
              key={`hit-${p.id}`}
              data-blob-id={p.id}
              x={p.band.left - 4}
              y={p.bbox.minY - 24}
              width={p.band.width + 8}
              height={LEAF_Y - p.bbox.minY + 60}
              fill="transparent"
              stroke="transparent"
              style={{ cursor: 'pointer' }}
            />
          ))}

          {/* Leaf circles, one per reactor (R is set initially to
              its computed leafR; updated imperatively on focus). */}
          {prepared.flatMap((p) =>
            p.leaves.map((lf) => (
              <circle
                key={lf.reactor.id}
                ref={(el) => {
                  if (el) leafRefs.current.set(lf.reactor.id, el);
                  else leafRefs.current.delete(lf.reactor.id);
                }}
                cx={lf.leafCx}
                cy={lf.leafCy}
                r={lf.leafR}
                fill={(data.status_blobs.find((b) => b.id === p.id))?.print_stroke ?? '#0d1a1e'}
                fillOpacity={0.65}
                style={{ pointerEvents: 'none' }}
              />
            )),
          )}

          {/* Labels per blob */}
          {prepared.map((p) => (
            <g key={`lbl-${p.id}`} pointerEvents="none">
              <text
                x={p.band.center}
                y={LABEL_Y}
                textAnchor="middle"
                fontFamily="Playfair, Georgia, serif"
                fontSize="14"
                fontWeight="500"
                fill="#0D1A1E"
              >
                {STATUS_LABEL[p.id]}
              </text>
              <text
                x={p.band.center}
                y={LABEL_Y + 18}
                textAnchor="middle"
                fontFamily="Playfair, Georgia, serif"
                fontSize="11"
                fill="#0D1A1E"
                opacity="0.7"
              >
                {(data.status_blobs.find((b) => b.id === p.id))?.reactor_count ?? 0} ·{' '}
                {Math.round((data.status_blobs.find((b) => b.id === p.id))?.total_mw ?? 0).toLocaleString()} MW
              </text>
            </g>
          ))}
        </svg>

        {/* Cancelled-blob editorial caption */}
        <div
          ref={captionRef}
          className="absolute pointer-events-none px-3 py-2 max-w-xs text-sm transition-opacity duration-300"
          style={{
            top: '8%',
            right: '4%',
            opacity: 0,
            fontFamily: "'Playfair', Georgia, serif",
            color: '#A51E22',
            borderLeft: '2px solid #A51E22',
            background: '#ECE7DF',
            zIndex: 10,
          }}
        >
          {CANCELLED_CAPTION}
        </div>
      </div>
      <p
        className="text-xs text-muted-foreground mt-2 text-center"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        Hover or tap any status to focus · click outside or press Escape to clear · Tab cycles
      </p>
    </div>
  );
}
