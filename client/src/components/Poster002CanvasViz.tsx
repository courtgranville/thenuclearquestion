import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPolylines, type BBox } from '@/lib/parseSvg';
import {
  TUNING_LIQUID,
  depthWeightLiquid,
} from '@/lib/posterMotionLiquid';
import formsData from '@/assets/poster-002-forms.json';

// ─────────────────────────────────────────────────────────────────────
// Region metadata
// ─────────────────────────────────────────────────────────────────────

interface RegionInfo {
  label: string;
  value: string;
}
interface Region {
  id: string;
  name: string;
  color: string;
  description: string;
  info: RegionInfo[];
}

const REGIONS: Region[] = [
  {
    id: 'nuclear',
    name: 'Nuclear',
    color: '#237c3e',
    description: '_TBD \u2014 Court to revise after data correction_',
    info: [
      { label: 'Land use', value: '0.33 m\u00b2\u00b7yr/MWh' },
      { label: 'Water use', value: '132 m\u00b3/MWh' },
    ],
  },
  {
    id: 'gas',
    name: 'Gas',
    color: '#b4822e',
    description:
      'Gas plants are compact and fast to build, but their lifecycle land footprint includes upstream extraction infrastructure. Water consumption is lower than coal because combined-cycle plants are more thermally efficient \u2014 less waste heat to reject.',
    info: [
      { label: 'Land use', value: '1.04 m\u00b2\u00b7yr/MWh' },
      { label: 'Water use', value: '45 m\u00b3/MWh' },
    ],
  },
  {
    id: 'coal',
    name: 'Coal',
    color: '#7d746a',
    description:
      'Coal\u2019s land footprint includes open-cast mines, ash ponds, and rail corridors. Its water consumption is high because subcritical boilers reject large amounts of waste heat through evaporative cooling towers. Both measures are significantly worse than gas.',
    info: [
      { label: 'Land use', value: '14.88 m\u00b2\u00b7yr/MWh' },
      { label: 'Water use', value: '120 m\u00b3/MWh' },
    ],
  },
  {
    id: 'coal-ccs',
    name: 'Coal with CCS',
    color: '#7d746a',
    description:
      'Carbon capture roughly doubles coal\u2019s water demand. Cleaning emissions has a physical cost of its own \u2014 the energy penalty of running the capture process means more fuel burned, more cooling water consumed, and more land disturbed per MWh delivered.',
    info: [
      { label: 'Land use', value: '21.06 m\u00b2\u00b7yr/MWh' },
      { label: 'Water use', value: '214 m\u00b3/MWh' },
    ],
  },
  {
    id: 'hydropower',
    name: 'Hydropower',
    color: '#4b6e70',
    description:
      'The largest land footprint of any source on this poster \u2014 the area is the reservoir surface, not the powerhouse \u2014 but the lowest water consumption per MWh, because the water passes through. Hydropower wins on water and loses on land. No source wins on every measure.',
    info: [
      { label: 'Land use', value: '33.39 m\u00b2\u00b7yr/MWh' },
      { label: 'Water use', value: '13 m\u00b3/MWh' },
    ],
  },
  {
    id: 'solar-silicon',
    name: 'Solar PV (Si)',
    color: '#1b3967',
    description:
      'Crystalline silicon panels. A significant land footprint per MWh because of low energy density per square metre, but very low water consumption \u2014 manufacturing dominates the figure.',
    info: [
      { label: 'Land use', value: '19.23 m\u00b2\u00b7yr/MWh' },
      { label: 'Water use', value: '35 m\u00b3/MWh' },
    ],
  },
  {
    id: 'solar-cadmium',
    name: 'Solar PV (CdTe)',
    color: '#1b3967',
    description:
      'Cadmium telluride thin-film panels have a smaller land footprint than silicon and lower water consumption \u2014 materials choice can change the footprint as much as the technology does.',
    info: [
      { label: 'Land use', value: '12.65 m\u00b2\u00b7yr/MWh' },
      { label: 'Water use', value: '8 m\u00b3/MWh' },
    ],
  },
];

const SVG_URL = '/assets/002-processed_1cd7e58f.svg';
const SVG_VIEW_W = 2714.21;
const SVG_VIEW_H = 1674.75;

type Mode = 'combined' | 'land' | 'water';

// ─────────────────────────────────────────────────────────────────────
// Pre-parse geometry at module level
// ─────────────────────────────────────────────────────────────────────

interface PreparedWaterLine {
  path: Path2D | null;
  pts: Float32Array;
  n: number;
  depth: number;
  dw: number;
}

interface PreparedLandLine {
  pts: Float32Array;
  n: number;
  dist: number; // dist_from_centre, precomputed
}

interface PreparedForm {
  id: string;
  waterLines: PreparedWaterLine[];
  landLines: PreparedLandLine[];
  formBbox: BBox;
  formCentroid: [number, number];
  landBbox: { minX: number; minY: number; maxX: number; maxY: number };
  landCentroid: [number, number];
  formBboxMaxDim: number;
}

function buildPath2D(pts: Float32Array, n: number): Path2D {
  const p = new Path2D();
  if (n < 2) return p;
  p.moveTo(pts[0], pts[1]);
  for (let k = 1; k < n; k++) {
    p.lineTo(pts[k * 2], pts[k * 2 + 1]);
  }
  return p;
}

function parseLandPoints(pointsStr: string): Float32Array {
  const nums = pointsStr.trim().split(/[\s,]+/).map(Number);
  return new Float32Array(nums);
}

const FORMS: PreparedForm[] = Object.entries(
  formsData as unknown as Record<
    string,
    {
      form_paths: string[];
      land_lines: { points: string; dist_from_centre: number }[];
      form_bbox: { minX: number; minY: number; maxX: number; maxY: number };
      form_centroid: [number, number];
      land_bbox: { minX: number; minY: number; maxX: number; maxY: number };
      land_centroid: [number, number];
      land_m2y: number;
      water_m3: number;
    }
  >,
).map(([id, data]) => {
  // Water blob lines
  const { polylines: waterPolys, bbox: formBbox } = buildPolylines(data.form_paths);
  const N = waterPolys.length;
  const waterLines: PreparedWaterLine[] = waterPolys.map((L, li) => {
    const depth = N > 1 ? li / (N - 1) : 0;
    const dw = depthWeightLiquid(depth);
    return {
      path: dw === 0 ? buildPath2D(L.pts, L.n) : null,
      pts: L.pts,
      n: L.n,
      depth,
      dw,
    };
  });

  // Land surface lines
  const landLines: PreparedLandLine[] = data.land_lines.map((ll) => {
    const pts = parseLandPoints(ll.points);
    return {
      pts,
      n: pts.length >> 1,
      dist: ll.dist_from_centre,
    };
  });

  const fb = data.form_bbox;
  const formBboxMaxDim = Math.max(fb.maxX - fb.minX, fb.maxY - fb.minY);

  return {
    id,
    waterLines,
    landLines,
    formBbox,
    formCentroid: data.form_centroid,
    landBbox: data.land_bbox,
    landCentroid: data.land_centroid,
    formBboxMaxDim,
  };
});

// ─────────────────────────────────────────────────────────────────────
// Strip form-* and land-* groups from SVG for the overlay
// ─────────────────────────────────────────────────────────────────────

function stripCanvasGroups(svgText: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgText;
  svg.querySelectorAll('g[id^="form-"]').forEach((el) => el.remove());
  // Strip land-* geometry groups but keep land-val-*, land-rect-* overlay elements
  svg.querySelectorAll('g[id^="land-"]:not([id^="land-val-"]):not([id^="land-rect-"])').forEach((el) => el.remove());
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute(
    'style',
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;',
  );
  return new XMLSerializer().serializeToString(svg);
}

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export default function Poster002CanvasViz() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [overlaySvg, setOverlaySvg] = useState<string | null>(null);
  const [overlayError, setOverlayError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('combined');

  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;
  const modeRef = useRef<Mode>('combined');
  modeRef.current = mode;

  // Cursor tracking — tx/ty are raw target, x/y are smoothed (eased per frame)
  const cursorRef = useRef({ x: -9999, y: -9999, tx: -9999, ty: -9999, speed: 0, smoothSpeed: 0 });
  const transformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

  // Dev-only tuning refs
  const tuningRef = useRef({
    flowAmp: TUNING_LIQUID.flowAmp,
    flowK1: TUNING_LIQUID.flowK1,
    flowW1: TUNING_LIQUID.flowW1,
    cursorAmpMax: TUNING_LIQUID.cursorAmpMax,
    cursorFalloffPad: TUNING_LIQUID.cursorFalloffPad,
    cycleLen: 7.0,
    drawDur: 1.0,
    holdDur: 4.5,
    fadeDur: 1.5,
    phaseCoeff: 0.015,
  });

  // Dev FPS counter
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (import.meta.env.PROD) return;
    let frames = 0;
    let lastReport = performance.now();
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      frames++;
      const now = performance.now();
      if (now - lastReport >= 500) {
        setFps(Math.round((frames * 1000) / (now - lastReport)));
        frames = 0;
        lastReport = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { cancelled = true; };
  }, []);

  // Fetch SVG overlay
  useEffect(() => {
    let cancelled = false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', SVG_URL, true);
    xhr.responseType = 'text';
    xhr.onload = () => {
      if (cancelled) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try { setOverlaySvg(stripCanvasGroups(xhr.responseText)); }
        catch { setOverlayError(true); }
      } else { setOverlayError(true); }
    };
    xhr.onerror = () => { if (!cancelled) setOverlayError(true); };
    xhr.send();
    return () => { cancelled = true; };
  }, []);

  // Pointer tracking — writes to tx/ty; RAF loop smooths to x/y
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: PointerEvent) => {
      const r = container.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const tf = transformRef.current;
      cursorRef.current.tx = (px - tf.offsetX) / tf.scale;
      cursorRef.current.ty = (py - tf.offsetY) / tf.scale;
    };

    const onLeave = () => {
      const cur = cursorRef.current;
      cur.tx = -9999;
      cur.ty = -9999;
      cur.x = -9999;
      cur.y = -9999;
      cur.speed = 0;
      cur.smoothSpeed = 0;
    };

    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerleave', onLeave);
    return () => {
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  // Canvas RAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      const r = container.getBoundingClientRect();
      const cssW = r.width;
      const cssH = r.height;
      canvas.width = Math.max(1, Math.floor(cssW * DPR));
      canvas.height = Math.max(1, Math.floor(cssH * DPR));
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      const scale = Math.min(cssW / SVG_VIEW_W, cssH / SVG_VIEW_H);
      const offsetX = (cssW - SVG_VIEW_W * scale) / 2;
      const offsetY = (cssH - SVG_VIEW_H * scale) / 2;
      transformRef.current = { scale, offsetX, offsetY };
      ctx.setTransform(
        scale * DPR, 0, 0, scale * DPR,
        offsetX * DPR, offsetY * DPR,
      );
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const t0 = performance.now();
    let rafId = 0;

    const NUM_BUCKETS = 8;

    const frame = (now: number) => {
      const t = (now - t0) / 1000;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      const sel = selectedRef.current;
      const curMode = modeRef.current;
      const ptr = cursorRef.current;
      const tune = tuningRef.current;

      // Smooth cursor position per frame (NucleusHero pattern)
      if (ptr.tx > -9000) {
        if (ptr.x < -9000) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
        const prevX = ptr.x;
        const prevY = ptr.y;
        ptr.x += (ptr.tx - ptr.x) * 0.10;
        ptr.y += (ptr.ty - ptr.y) * 0.10;
        const dt = 1 / 60; // approximate
        ptr.speed = Math.hypot((ptr.x - prevX) / dt, (ptr.y - prevY) / dt);
        ptr.smoothSpeed += (ptr.speed - ptr.smoothSpeed) * 0.18;
      }

      const k1 = tune.flowK1;
      const w1 = tune.flowW1;
      const t1off = w1 * t;
      const t1offY = w1 * t * 1.3;

      // ── DRAW LAND SURFACES ──
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 0.5;

      for (const form of FORMS) {
        const isSelected = sel === form.id;
        const isDimmed = sel !== null && !isSelected;

        let landBaseAlpha: number;
        if (curMode === 'water') {
          landBaseAlpha = 0.10;
        } else if (isDimmed) {
          landBaseAlpha = 0.10;
        } else {
          landBaseAlpha = 1;
        }

        ctx.strokeStyle = '#217b3d';

        for (const ll of form.landLines) {
          const pts = ll.pts;
          const n = ll.n;
          if (n < 2) continue;

          let alpha: number;
          if (curMode === 'water' || isDimmed) {
            alpha = landBaseAlpha;
          } else {
            // Draw-on → hold → fade-out cycle
            const phaseShift = ll.dist * tune.phaseCoeff;
            const localT = ((t + phaseShift) % tune.cycleLen + tune.cycleLen) % tune.cycleLen;
            let opacity: number;
            if (localT < tune.drawDur) {
              opacity = localT / tune.drawDur;
            } else if (localT < tune.drawDur + tune.holdDur) {
              opacity = 1.0;
            } else if (localT < tune.drawDur + tune.holdDur + tune.fadeDur) {
              opacity = 1 - (localT - tune.drawDur - tune.holdDur) / tune.fadeDur;
            } else {
              opacity = 0;
            }
            alpha = landBaseAlpha * opacity;
          }
          ctx.globalAlpha = alpha;

          ctx.beginPath();
          ctx.moveTo(pts[0], pts[1]);
          for (let k = 1; k < n; k++) {
            ctx.lineTo(pts[k * 2], pts[k * 2 + 1]);
          }
          ctx.stroke();
        }
      }

      // ── DRAW WATER BLOBS ──
      ctx.strokeStyle = '#1c3867';
      ctx.lineWidth = 0.65;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 2;

      for (const form of FORMS) {
        const isSelected = sel === form.id;
        const isDimmed = sel !== null && !isSelected;

        const isLandMode = curMode === 'land';
        let waterBaseAlpha: number;
        if (isLandMode) {
          waterBaseAlpha = 0.10;
        } else if (isDimmed) {
          waterBaseAlpha = 0.08;
        } else {
          waterBaseAlpha = 1;
        }

        // Per-form cursor bulge parameters (form-local coords)
        let cursorActive = false;
        let cuxLocal = 0;
        let cuyLocal = 0;
        let cursorBulgeAmp = 0;
        let sigma = 1;
        if (!isLandMode && ptr.x > -9000) {
          const halfMaxDim = form.formBboxMaxDim / 2;
          const reach = halfMaxDim * (1 + tune.cursorFalloffPad);
          cuxLocal = ptr.x - form.formCentroid[0];
          cuyLocal = ptr.y - form.formCentroid[1];
          const cursorDist = Math.hypot(cuxLocal, cuyLocal);
          if (cursorDist < reach) {
            const falloff = 1 - cursorDist / reach;
            const normSpeed = Math.min(
              1,
              Math.max(0, (ptr.smoothSpeed / 1000 - TUNING_LIQUID.cursorSpeedFloor) /
                (TUNING_LIQUID.cursorSpeedSat - TUNING_LIQUID.cursorSpeedFloor)),
            );
            cursorBulgeAmp = tune.cursorAmpMax * falloff * normSpeed;
            sigma = halfMaxDim * 0.75;
            cursorActive = cursorBulgeAmp > 0.01;
          }
        }

        const flowAmp = isLandMode ? 0 : tune.flowAmp;
        const N = form.waterLines.length;
        const cx = form.formCentroid[0];
        const cy = form.formCentroid[1];
        const sigmaInv2 = 1 / (2 * sigma * sigma);

        // Bucket-batched strokes
        for (let bucket = 0; bucket < NUM_BUCKETS; bucket++) {
          const bucketDepthMid = (bucket + 0.5) / NUM_BUCKETS;
          ctx.globalAlpha = waterBaseAlpha * (0.5 + 0.5 * (1 - bucketDepthMid));

          ctx.beginPath();

          for (let li = 0; li < N; li++) {
            const line = form.waterLines[li];
            const lineBucket = Math.min(
              NUM_BUCKETS - 1,
              Math.floor(line.depth * NUM_BUCKETS),
            );
            if (lineBucket !== bucket) continue;

            // Outline — static
            if (line.path !== null || isLandMode) {
              const pts = line.pts;
              const n = line.n;
              if (n < 2) continue;
              ctx.moveTo(pts[0], pts[1]);
              for (let kk = 1; kk < n; kk++) {
                ctx.lineTo(pts[kk * 2], pts[kk * 2 + 1]);
              }
              continue;
            }

            // Interior — flow field + per-point cursor bulge
            const pts = line.pts;
            const n = line.n;
            if (n < 2) continue;
            const a = flowAmp * line.dw;
            const ca = cursorActive ? cursorBulgeAmp * line.dw : 0;

            for (let kk = 0; kk < n; kk++) {
              const x = pts[kk * 2];
              const y = pts[kk * 2 + 1];

              // Flow field displacement
              const ax1 = k1 * x + t1off;
              const ay1 = k1 * y + t1offY;
              let dx = a * Math.sin(ax1) * Math.cos(ay1);
              let dy = a * (-Math.cos(ax1) * Math.sin(ay1));

              // Per-point cursor bulge (form-local Gaussian push)
              if (ca > 0) {
                const plx = (x - cx) - cuxLocal;
                const ply = (y - cy) - cuyLocal;
                const distSq = plx * plx + ply * ply;
                const g = Math.exp(-distSq * sigmaInv2);
                const distLen = Math.sqrt(distSq) + 1e-3;
                const push = g * ca;
                dx += (plx / distLen) * push;
                dy += (ply / distLen) * push;
              }

              if (kk === 0) {
                ctx.moveTo(x + dx, y + dy);
              } else {
                ctx.lineTo(x + dx, y + dy);
              }
            }
          }

          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  // CSS custom properties for SVG overlay opacity
  const overlayStyle = useMemo(() => {
    const base: Record<string, string> = {};
    if (mode === 'land') {
      base['--water-val-opacity'] = '0.20';
      base['--annotation-opacity'] = '0.10';
      base['--land-val-opacity'] = '1';
    } else if (mode === 'water') {
      base['--land-val-opacity'] = '0.20';
      base['--annotation-opacity'] = '0.10';
      base['--water-val-opacity'] = '1';
    } else {
      base['--water-val-opacity'] = '1';
      base['--land-val-opacity'] = '1';
      base['--annotation-opacity'] = '1';
    }
    return base;
  }, [mode]);

  const selectedRegion = useMemo(
    () => REGIONS.find((r) => r.id === selected) ?? null,
    [selected],
  );

  return (
    <div className="w-full relative">
      {/* Dev-only debug overlay */}
      {import.meta.env.DEV && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 20,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 10,
            padding: '6px 8px',
            background: 'rgba(13,26,30,0.90)',
            color: '#ece7df',
            borderRadius: 4,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            width: 200,
          }}
        >
          <div style={{ marginBottom: 2, fontWeight: 600 }}>{fps} fps</div>
          {([
            ['flowAmp', 0, 20],
            ['flowK1', 0, 0.03],
            ['flowW1', 0, 1],
            ['cursorAmpMax', 0, 100],
            ['cursorFalloffPad', 0, 0.5],
            ['cycleLen', 2, 15],
            ['drawDur', 0.1, 3],
            ['holdDur', 1, 10],
            ['fadeDur', 0.1, 4],
            ['phaseCoeff', 0, 0.05],
          ] as [keyof typeof tuningRef.current, number, number][]).map(
            ([key, min, max]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 80, fontSize: 9 }}>{key}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={(max - min) / 200}
                  defaultValue={tuningRef.current[key]}
                  onChange={(e) => {
                    (tuningRef.current as Record<string, number>)[key] = parseFloat(e.target.value);
                  }}
                  style={{ flex: 1, height: 12 }}
                />
                <span style={{ width: 36, fontSize: 9, textAlign: 'right' }}>
                  {tuningRef.current[key].toFixed(3)}
                </span>
              </label>
            ),
          )}
        </div>
      )}

      {/* Canvas stage */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ aspectRatio: `${SVG_VIEW_W} / ${SVG_VIEW_H}` }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
        />
        {overlaySvg && (
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={overlayStyle}
            dangerouslySetInnerHTML={{ __html: overlaySvg }}
          />
        )}
        {overlayError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-base text-muted-foreground">
              Unable to load the visualisation overlay.
            </p>
          </div>
        )}
      </div>

      {/* Mode toggle */}
      <div className="mt-4 flex gap-2 justify-center">
        {(['combined', 'land', 'water'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`
              px-4 py-1.5 rounded-sm text-sm tracking-wide uppercase
              transition-all duration-200 border cursor-pointer
              ${mode === m
                ? 'border-foreground shadow-sm bg-foreground/5'
                : 'border-border/50 hover:border-foreground/50'
              }
            `}
            style={{ fontFamily: "'Playfair', Georgia, serif" }}
          >
            {m === 'combined' ? 'Combined' : m === 'land' ? 'Land' : 'Water'}
          </button>
        ))}
      </div>

      {/* Source legend */}
      <div className="mt-3 flex flex-wrap gap-2 justify-center">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() =>
              setSelected((prev) => (prev === r.id ? null : r.id))
            }
            className={`
              px-3 py-1.5 rounded-sm text-sm tracking-wide uppercase
              transition-all duration-200 border cursor-pointer
              active:scale-95
              ${selected === r.id
                ? 'border-current shadow-sm'
                : 'border-border/50 hover:border-current'
              }
            `}
            style={{
              fontFamily: "'Playfair', Georgia, serif",
              color: r.color,
              backgroundColor:
                selected === r.id ? `${r.color}12` : 'transparent',
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
              style={{ backgroundColor: r.color }}
            />
            {r.name}
          </button>
        ))}
      </div>

      {/* Info panel */}
      {selectedRegion && (
        <div
          className="mt-4 p-4 rounded-sm border border-border/60 bg-card max-w-2xl mx-auto"
          style={{
            borderLeftColor: selectedRegion.color,
            borderLeftWidth: 3,
          }}
        >
          <h4
            className="font-serif text-base mb-2"
            style={{ color: selectedRegion.color, fontWeight: 600 }}
          >
            {selectedRegion.name}
          </h4>
          {selectedRegion.info.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {selectedRegion.info.map((item, i) => (
                <div key={i}>
                  <p
                    className="text-sm uppercase tracking-wider text-muted-foreground mb-0.5"
                    style={{ fontFamily: "'Playfair', Georgia, serif" }}
                  >
                    {item.label}
                  </p>
                  <p className="text-base font-medium text-foreground">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}
          <p className="text-base text-muted-foreground leading-relaxed">
            {selectedRegion.description}
          </p>
        </div>
      )}

      {/* Hint */}
      <p
        className="text-center text-sm text-muted-foreground mt-3"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        {selected
          ? 'Tap the same legend button or another to deselect'
          : 'Tap a legend button to highlight a source'}
      </p>
    </div>
  );
}
