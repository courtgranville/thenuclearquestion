// Poster 005 — Dendrogram sub-view (canonical hybrid SVG + canvas).
//
// Three stacked layers (zIndex bottom→top):
//   1. SVG dendrogram links (Bézier paths, pointer-events none)
//   2. Canvas — 4 status-blob forms with always-on form motion
//      (posterMotion.ts flow noise; DPR 2.0; silhouette-singleton
//      occlusion fill)
//   3. SVG — status-blob hit-areas, leaf circles (sector-grow tween
//      on focus), labels, pulse cascade circles (traveling along
//      the link Béziers)
//
// Status focus interactions:
//   - hover any blob to focus; click to lock; click outside clears.
//   - focused blob full opacity; others to 25%.
//   - focused blob's leaves tween to MW-proportional radii (cubic
//     ease-out, 250–1200ms based on MW magnitude).
//   - pulse cascade fires from blob anchor outward along its links.
//   - cancelled blob: editorial overlay caption fades in.

import { useEffect, useMemo, useRef } from 'react';
import { buildPolylines, type BBox } from '@/lib/parseSvg';
import { resolveMotion, depthWeight, TUNING } from '@/lib/posterMotion';
import {
  loadPoster005Forms,
  type ReactorStatus,
  type StatusBlob,
  type Reactor,
} from '@/assets/poster005';
import { poster005Store, type Poster005State } from '@/lib/poster005Store';

const PAGE_BG = '#ECE7DF';
const FOCUS_DIM_BLOB = 0.25;
const FOCUS_DIM_LEAF = 0.25;
const SECTOR_GROW_RATE_PX_PER_MS = 0.025;
const SECTOR_GROW_MIN_MS = 250;
const SECTOR_GROW_MAX_MS = 1200;
const PULSE_TRAVEL_MS = 700;
const PULSE_CORE_R = 1.4;
const PULSE_GLOW_R = 8;
const PULSE_BULGE_HALF_LEN = 14;
const PULSE_GLOW_COLOR = 'rgba(255, 235, 130, 1)';
const PULSE_GLOW_EDGE = 'rgba(255, 240, 170, 0)';
const PULSE_BULGE_COLOR = 'rgba(255, 250, 220, 1)';
const PULSE_CORE_COLOR = '#ffffff';

const STATUS_ORDER: ReactorStatus[] = ['construction', 'operating', 'retired', 'cancelled'];
const STATUS_LABEL: Record<ReactorStatus, string> = {
  construction: 'Under Construction',
  operating:    'Operating',
  retired:      'Retired',
  cancelled:    'Cancelled',
};
const CANCELLED_CAPTION =
  '14,141 MW announced and never built — more than twice the UK fleet currently operating.';

interface PreparedLine {
  pts: Float32Array;
  n: number;
  depth: number;
  dw: number;
}

interface PreparedBlob {
  id: ReactorStatus;
  blob: StatusBlob;
  lines: PreparedLine[];
  bbox: BBox;
  silhouetteIdx: number;
  motion: { flowAmp: number };
  links: { d: string; reactorId: string }[];
}

// Pre-compute polylines and silhouette for each blob.
function prepareBlobs(blobs: StatusBlob[], reactors: Reactor[], links: string[]): PreparedBlob[] {
  // Distribute the 98 dendrogram links across the 4 blobs by which
  // blob's anchor each link starts at (leftmost x of d-string).
  // For v1 we just attach all links to all blobs and filter by
  // status when rendering pulses — simpler and correct.
  void links;
  const out: PreparedBlob[] = [];
  for (const blob of blobs) {
    const { polylines, bbox } = buildPolylines(blob.form_paths);
    const N = polylines.length;
    const lines: PreparedLine[] = polylines.map((L, li) => {
      const depth = N > 1 ? li / (N - 1) : 0;
      return {
        pts: L.pts,
        n: L.n,
        depth,
        dw: depthWeight(depth),
      };
    });
    let silIdx = 0, maxArea = -Infinity;
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
      for (let k = 0; k < L.n; k++) {
        const x = L.pts[k * 2], y = L.pts[k * 2 + 1];
        if (x < mnX) mnX = x; if (x > mxX) mxX = x;
        if (y < mnY) mnY = y; if (y > mxY) mxY = y;
      }
      const a = (mxX - mnX) * (mxY - mnY);
      if (a > maxArea) { maxArea = a; silIdx = i; }
    }
    // Reactor leaves for this status, sorted by leaf cx ascending.
    const myReactors = reactors
      .filter((r) => r.status === blob.id && r.dendrogram_leaf_cx !== null)
      .sort((a, b) => (a.dendrogram_leaf_cx ?? 0) - (b.dendrogram_leaf_cx ?? 0));
    const blobLinks = myReactors.map((r) => ({
      d: `M ${blob.anchor[0]} ${blob.anchor[1]} Q ${(blob.anchor[0] + (r.dendrogram_leaf_cx ?? 0)) / 2} ${blob.anchor[1] + 80} ${r.dendrogram_leaf_cx} ${r.dendrogram_leaf_cy}`,
      reactorId: r.id,
    }));
    out.push({
      id: blob.id,
      blob,
      lines,
      bbox,
      silhouetteIdx: silIdx,
      motion: resolveMotion(blob.total_mw),
      links: blobLinks,
    });
  }
  return out;
}

export function Poster005Dendrogram() {
  const data = useMemo(() => loadPoster005Forms(), []);
  const prepared = useMemo(
    () => prepareBlobs(data.status_blobs, data.reactors, data.dendrogram_links),
    [data],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlaySvgRef = useRef<SVGSVGElement | null>(null);
  const linksSvgRef = useRef<SVGSVGElement | null>(null);
  const leafRefs = useRef<Map<string, SVGCircleElement>>(new Map());
  const pulseElsRef = useRef<SVGGElement | null>(null);
  const captionRef = useRef<HTMLDivElement | null>(null);

  // Compute viewbox covering all blob bboxes + links + leaves.
  const viewbox = useMemo(() => {
    let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
    for (const p of prepared) {
      mnX = Math.min(mnX, p.bbox.minX);
      mnY = Math.min(mnY, p.bbox.minY);
      mxX = Math.max(mxX, p.bbox.maxX);
      mxY = Math.max(mxY, p.bbox.maxY);
    }
    for (const r of data.reactors) {
      if (r.dendrogram_leaf_cx !== null && r.dendrogram_leaf_cy !== null) {
        const cx = r.dendrogram_leaf_cx, cy = r.dendrogram_leaf_cy;
        mnX = Math.min(mnX, cx - 10);
        mnY = Math.min(mnY, cy - 10);
        mxX = Math.max(mxX, cx + 10);
        mxY = Math.max(mxY, cy + 10);
      }
    }
    const padX = (mxX - mnX) * 0.04;
    const padY = (mxY - mnY) * 0.04;
    return { x: mnX - padX, y: mnY - padY, w: (mxX - mnX) + padX * 2, h: (mxY - mnY) + padY * 2 };
  }, [prepared, data]);

  // Animation loop.
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

    // Per-leaf scale tween state.
    const leafTween: Record<string, { from: number; to: number; start: number; durMs: number }> = {};
    function startLeafTween(reactorId: string, target: number) {
      const el = leafRefs.current.get(reactorId);
      if (!el) return;
      const cur = parseFloat(el.getAttribute('r') ?? '2.67');
      const delta = Math.abs(target - cur);
      const durMs = Math.max(SECTOR_GROW_MIN_MS, Math.min(SECTOR_GROW_MAX_MS, delta / SECTOR_GROW_RATE_PX_PER_MS));
      leafTween[reactorId] = { from: cur, to: target, start: performance.now(), durMs };
    }

    // Pulse cascade state (one entry per active pulse).
    interface Pulse { d: string; pathLen: number; start: number; durMs: number; pathEl: SVGPathElement }
    const pulses: Pulse[] = [];
    function startPulseCascade(status: ReactorStatus) {
      // Build temporary path elements offscreen so getTotalLength /
      // getPointAtLength work; use them for pulse motion.
      const pb = prepared.find((p) => p.id === status);
      if (!pb) return;
      const ns = 'http://www.w3.org/2000/svg';
      const now = performance.now();
      for (let i = 0; i < pb.links.length; i++) {
        const link = pb.links[i];
        const el = document.createElementNS(ns, 'path');
        el.setAttribute('d', link.d);
        // Append temporarily (need to be in document for getTotalLength).
        document.body.appendChild(el);
        el.style.position = 'absolute';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        const pathLen = el.getTotalLength();
        // Stagger 30 ms per leaf so the cascade reads as a sweep.
        pulses.push({ d: link.d, pathLen, start: now + i * 30, durMs: PULSE_TRAVEL_MS, pathEl: el });
      }
    }
    function clearPulses() {
      for (const p of pulses) p.pathEl.remove();
      pulses.length = 0;
    }

    let lastFocusStatus: ReactorStatus | null = null;
    function applyState(state: Poster005State) {
      const focus = state.focusStatus;
      // Leaf scale tweens.
      if (focus !== lastFocusStatus) {
        // Find max MW in focused status to normalize.
        if (focus) {
          const focused = data.reactors.filter((r) => r.status === focus);
          const maxMw = Math.max(...focused.map((r) => r.mw ?? 0), 1);
          for (const r of focused) {
            const norm = (r.mw ?? 0) / maxMw;
            const target = 2.67 + norm * 7; // 2.67 → ~9.67 max
            startLeafTween(r.id, target);
          }
          // Other statuses: shrink to baseline.
          for (const r of data.reactors) {
            if (r.status === focus) continue;
            startLeafTween(r.id, 2.67);
          }
          // Pulse cascade for focused status.
          clearPulses();
          startPulseCascade(focus);
        } else {
          // Cleared: reset all leaves.
          for (const r of data.reactors) startLeafTween(r.id, 2.67);
          clearPulses();
        }
        lastFocusStatus = focus;

        // Cancelled caption.
        if (captionRef.current) {
          captionRef.current.style.opacity = focus === 'cancelled' ? '1' : '0';
        }
      }
    }

    applyState(poster005Store.getCurrent());
    const unsub = poster005Store.subscribe(applyState);

    // Render loop.
    let running = true;
    function frame(now: number) {
      if (!running) return;
      ctx!.save();
      ctx!.scale(DPR, DPR);
      const rect = stage!.getBoundingClientRect();
      ctx!.clearRect(0, 0, rect.width, rect.height);

      // Map SVG viewbox → CSS pixels.
      const sx = rect.width / viewbox.w;
      const sy = rect.height / viewbox.h;
      const scale = Math.min(sx, sy);
      const offX = (rect.width - viewbox.w * scale) / 2 - viewbox.x * scale;
      const offY = (rect.height - viewbox.h * scale) / 2 - viewbox.y * scale;
      ctx!.translate(offX, offY);
      ctx!.scale(scale, scale);

      const t = now / 1000;
      const focus = poster005Store.getCurrent().focusStatus;

      for (const p of prepared) {
        const dim = focus && focus !== p.id ? FOCUS_DIM_BLOB : 1;
        const stroke = p.blob.print_stroke;
        ctx!.globalAlpha = dim;

        // Pass A — silhouette occlusion fill (single largest polyline).
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

        // Pass B — strokes, with depth-weighted noise displacement.
        ctx!.strokeStyle = stroke;
        ctx!.lineWidth = 0.45 / scale;
        for (const L of p.lines) {
          if (L.n < 2) continue;
          const amp = p.motion.flowAmp * L.dw;
          ctx!.beginPath();
          for (let k = 0; k < L.n; k++) {
            const px = L.pts[k * 2];
            const py = L.pts[k * 2 + 1];
            // Two-layer noise-ish perturbation (sin-based for cheapness).
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
      for (const [id, tw] of Object.entries(leafTween)) {
        const el = leafRefs.current.get(id);
        if (!el) { delete leafTween[id]; continue; }
        const tt = Math.min(1, (now - tw.start) / tw.durMs);
        const eased = 1 - Math.pow(1 - tt, 3);
        const r = tw.from + (tw.to - tw.from) * eased;
        el.setAttribute('r', String(r));
        if (tt >= 1) delete leafTween[id];
      }

      // Render pulses on canvas.
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
        // Bell-curve bulge: small thicker stroke segment around the head.
        const tangent = pulse.pathEl.getPointAtLength(Math.min(pulse.pathLen, len + 1));
        const tx = tangent.x - cx, ty = tangent.y - cy;
        const tlen = Math.hypot(tx, ty) || 1;
        const ux = tx / tlen, uy = ty / tlen;
        // Bulge stroke
        ctx!.strokeStyle = PULSE_BULGE_COLOR;
        ctx!.lineWidth = 2.5 / scale;
        ctx!.beginPath();
        ctx!.moveTo(cx - ux * PULSE_BULGE_HALF_LEN, cy - uy * PULSE_BULGE_HALF_LEN);
        ctx!.lineTo(cx + ux * PULSE_BULGE_HALF_LEN, cy + uy * PULSE_BULGE_HALF_LEN);
        ctx!.stroke();
        // Glow (radial gradient)
        const grd = ctx!.createRadialGradient(cx, cy, 0, cx, cy, PULSE_GLOW_R);
        grd.addColorStop(0, PULSE_GLOW_COLOR);
        grd.addColorStop(1, PULSE_GLOW_EDGE);
        ctx!.fillStyle = grd;
        ctx!.beginPath();
        ctx!.arc(cx, cy, PULSE_GLOW_R, 0, Math.PI * 2);
        ctx!.fill();
        // Core white
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
  }, [prepared, viewbox, data]);

  // Click handler on overlay SVG: track blob hit-areas + outside-click clear.
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
        // Click on empty SVG area — clear focus.
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
        style={{ minHeight: 480 }}
      >
        {/* Layer 1 — link Béziers (SVG) */}
        <svg
          ref={linksSvgRef}
          viewBox={`${viewbox.x} ${viewbox.y} ${viewbox.w} ${viewbox.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none', zIndex: 1 }}
        >
          {data.dendrogram_links.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#0d1a1e" strokeWidth="0.5" opacity="0.5" />
          ))}
        </svg>

        {/* Layer 2 — canvas with form motion */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 2 }} />

        {/* Layer 3 — overlay SVG (hit-areas, leaves, labels, pulses) */}
        <svg
          ref={overlaySvgRef}
          viewBox={`${viewbox.x} ${viewbox.y} ${viewbox.w} ${viewbox.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 3 }}
        >
          {/* Hit-area rectangles per blob */}
          {prepared.map((p) => (
            <rect
              key={p.id}
              data-blob-id={p.id}
              x={p.bbox.minX - 14}
              y={p.bbox.minY - 14}
              width={p.bbox.maxX - p.bbox.minX + 28}
              height={p.bbox.maxY - p.bbox.minY + 28}
              fill="transparent"
              stroke="transparent"
              style={{ cursor: 'pointer' }}
            />
          ))}
          {/* Leaf circles, one per reactor */}
          {data.reactors.map((r) =>
            r.dendrogram_leaf_cx !== null && r.dendrogram_leaf_cy !== null ? (
              <circle
                key={r.id}
                ref={(el) => {
                  if (el) leafRefs.current.set(r.id, el);
                  else leafRefs.current.delete(r.id);
                }}
                cx={r.dendrogram_leaf_cx}
                cy={r.dendrogram_leaf_cy}
                r={r.dendrogram_leaf_r ?? 2.67}
                fill={(data.status_blobs.find((b) => b.id === r.status))?.print_stroke ?? '#0d1a1e'}
                fillOpacity={0.55}
                style={{ pointerEvents: 'none' }}
              />
            ) : null,
          )}
          {/* Labels for each blob */}
          {prepared.map((p) => {
            const cx = (p.bbox.minX + p.bbox.maxX) / 2;
            const cy = p.bbox.maxY + 18;
            return (
              <text
                key={`lbl-${p.id}`}
                x={cx}
                y={cy}
                textAnchor="middle"
                fontFamily="Playfair, Georgia, serif"
                fontSize="11"
                fill="#0D1A1E"
                style={{ pointerEvents: 'none' }}
              >
                {STATUS_LABEL[p.id]} · {p.blob.reactor_count} · {Math.round(p.blob.total_mw).toLocaleString()} MW
              </text>
            );
          })}
          <g ref={pulseElsRef} />
        </svg>

        {/* Cancelled-blob editorial caption */}
        <div
          ref={captionRef}
          className="absolute pointer-events-none px-3 py-2 max-w-xs text-sm transition-opacity duration-300"
          style={{
            top: '12%',
            right: '4%',
            opacity: 0,
            fontFamily: "'Playfair', Georgia, serif",
            color: '#A51E22',
            borderLeft: '2px solid #A51E22',
            background: '#ECE7DF',
            zIndex: 4,
          }}
        >
          {CANCELLED_CAPTION}
        </div>
      </div>
    </div>
  );
}

void STATUS_ORDER;
