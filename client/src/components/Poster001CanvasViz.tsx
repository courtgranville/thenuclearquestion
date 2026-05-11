import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPolylines, type BBox } from '@/lib/parseSvg';
import {
  resolveMotion,
  depthWeight,
  TUNING,
  type FormMotion,
} from '@/lib/posterMotion';
import formsData from '@/assets/poster-001-forms.json';
import PosterControlButton from '@/components/PosterControlButton';
import { fitCanvasToDpr } from '@/lib/canvasUtils';

// ─────────────────────────────────────────────────────────────────────
// Region metadata - copied from the original Poster001Viz.tsx so the
// legend buttons and info panel work without depending on the old file.
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
    description:
      'The lowest lifecycle emissions of any electricity source. Almost all of nuclear\u2019s footprint comes from construction and fuel processing \u2014 the plant itself produces no CO\u2082 during operation. The 5.6 gCO\u2082/kWh figure is the methodological floor of the comparison.',
    info: [
      { label: 'Emissions', value: '5.6 gCO\u2082/kWh' },
      { label: 'Relative to coal', value: '173\u00d7 smaller' },
    ],
  },
  {
    id: 'onshore-wind',
    name: 'Onshore Wind',
    color: '#7d746a',
    description:
      'The lowest-emission renewable in this comparison. Lifecycle emissions come almost entirely from manufacturing the turbine, blades, and concrete foundations. Operating emissions are zero.',
    info: [
      { label: 'Emissions', value: '11 gCO\u2082/kWh' },
      { label: 'Relative to coal', value: '88\u00d7 smaller' },
    ],
  },
  {
    id: 'offshore-wind',
    name: 'Offshore Wind',
    color: '#7d746a',
    description:
      'Slightly higher than onshore due to subsea cabling, marine installation, and the heavier foundations needed at sea \u2014 but still extremely low compared to fossil sources.',
    info: [
      { label: 'Emissions', value: '17 gCO\u2082/kWh' },
      { label: 'Relative to coal', value: '57\u00d7 smaller' },
    ],
  },
  {
    id: 'solar-cadmium',
    name: 'Solar PV (CdTe)',
    color: '#7d746a',
    description:
      'Cadmium telluride thin-film panels. Lower manufacturing energy than silicon panels, which is why their lifecycle emissions are about half. Cadmium is toxic and requires careful end-of-life handling.',
    info: [
      { label: 'Emissions', value: '16 gCO\u2082/kWh' },
      { label: 'Relative to coal', value: '61\u00d7 smaller' },
    ],
  },
  {
    id: 'solar-silicon',
    name: 'Solar PV (Si)',
    color: '#7d746a',
    description:
      'Crystalline silicon panels \u2014 the most common type of solar panel deployed worldwide. Higher manufacturing energy than CdTe, but no toxic heavy metals to manage at end of life.',
    info: [
      { label: 'Emissions', value: '32 gCO\u2082/kWh' },
      { label: 'Relative to coal', value: '30\u00d7 smaller' },
    ],
  },
  {
    id: 'hydropower',
    name: 'Hydropower',
    color: '#7d746a',
    description:
      'Higher than most renewables because lifecycle assessments include reservoir methane \u2014 decomposing organic matter under flooded land emits CH\u2084 for years after a dam is built. Tropical reservoirs are the worst offenders; northern reservoirs are much lower. The 117 figure is the global median.',
    info: [
      { label: 'Emissions', value: '117 gCO\u2082/kWh' },
      { label: 'Relative to coal', value: '8\u00d7 smaller' },
    ],
  },
  {
    id: 'coal-ccs',
    name: 'Coal with CCS',
    color: '#7d746a',
    description:
      'Coal-fired generation with carbon capture and storage. CCS captures most CO\u2082 from the flue gas, but the energy penalty of running the capture process \u2014 plus upstream emissions from mining and transport \u2014 means the technology still produces nearly 30\u00d7 more CO\u2082 per kWh than nuclear.',
    info: [
      { label: 'Emissions', value: '294 gCO\u2082/kWh' },
      { label: 'Relative to coal', value: '3.3\u00d7 smaller' },
    ],
  },
  {
    id: 'gas',
    name: 'Gas',
    color: '#7d746a',
    description:
      'Natural gas is the cleanest of the fossil fuels \u2014 about 45% lower than coal \u2014 but still emits roughly 78\u00d7 more CO\u2082 per kWh than nuclear. Methane leakage in the supply chain (a more potent short-term warming gas than CO\u2082) adds further to its real climate impact.',
    info: [
      { label: 'Emissions', value: '439 gCO\u2082/kWh' },
      { label: 'Relative to coal', value: '2.2\u00d7 smaller' },
    ],
  },
  {
    id: 'coal',
    name: 'Coal',
    color: '#7d746a',
    description:
      'The highest lifecycle emissions of any major electricity source. Coal produces 173 times more CO\u2082 per kWh than nuclear \u2014 the ratio that defines the visual scale of this poster.',
    info: [
      { label: 'Emissions', value: '970 gCO\u2082/kWh' },
      { label: 'Relative to nuclear', value: '173\u00d7 larger' },
    ],
  },
];

const SVG_URL = '/assets/001-processed_da2eb390.svg';

// SVG native viewBox dimensions (from the source SVG file).
const SVG_VIEW_W = 2714.21;
const SVG_VIEW_H = 1674.75;

// ─────────────────────────────────────────────────────────────────────
// Pre-parse all form polylines + resolve motion ONCE at module level.
// Path2D objects are pre-built for OUTLINE lines only (depth < threshold).
// Interior lines keep raw Float32Array points for per-frame deformation.
// ─────────────────────────────────────────────────────────────────────

interface PreparedLine {
  // For outline lines (dw === 0): pre-built Path2D.
  // For interior lines: null, and pts/n carry the data instead.
  path: Path2D | null;
  pts: Float32Array;
  n: number;
  depth: number;
  dw: number;        // pre-computed depthWeight, used per-frame
}

interface PreparedForm {
  id: string;
  lines: PreparedLine[];
  bbox: BBox;
  centroid: [number, number];
  motion: FormMotion;
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

const FORMS: PreparedForm[] = Object.entries(
  formsData as unknown as Record<
    string,
    {
      paths: string[];
      bbox: { minX: number; minY: number; maxX: number; maxY: number };
      centroid: [number, number];
      emissions: number;
    }
  >,
).map(([id, data]) => {
  const { polylines, bbox } = buildPolylines(data.paths);
  const N = polylines.length;
  const lines: PreparedLine[] = polylines.map((L, li) => {
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
  return {
    id,
    lines,
    bbox,
    centroid: data.centroid,
    motion: resolveMotion(data.emissions),
  };
});

// ─────────────────────────────────────────────────────────────────────
// Strip form-* groups from the SVG markup so we can render the
// remaining content (labels, values, dots, connectors) as the overlay.
// ─────────────────────────────────────────────────────────────────────

function stripFormGroups(svgText: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgText;

  // Remove every g whose id starts with "form-".
  svg.querySelectorAll('g[id^="form-"]').forEach((el) => el.remove());

  // Make the SVG fill its container responsively.
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Disable pointer events on the overlay so legend clicks below
  // (and any future interaction) reach the canvas / page.
  svg.setAttribute(
    'style',
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;',
  );

  return new XMLSerializer().serializeToString(svg);
}

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export default function Poster001CanvasViz() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [overlaySvg, setOverlaySvg] = useState<string | null>(null);
  const [overlayError, setOverlayError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // Live ref so the RAF loop reads the latest selection without restarting.
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;

  // ─── Dev-only FPS counter ────────────────────────────────────────
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
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch and prepare the SVG overlay once.
  useEffect(() => {
    let cancelled = false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', SVG_URL, true);
    xhr.responseType = 'text';
    xhr.onload = () => {
      if (cancelled) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          setOverlaySvg(stripFormGroups(xhr.responseText));
        } catch {
          setOverlayError(true);
        }
      } else {
        setOverlayError(true);
      }
    };
    xhr.onerror = () => {
      if (!cancelled) setOverlayError(true);
    };
    xhr.send();
    return () => {
      cancelled = true;
    };
  }, []);

  // Canvas RAF loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const r = container.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      // Cap DPR at 1.5 - restores the pre-migration value. Poster 001's
      // per-frame stroke work tipped Firefox/Safari from usable into 4-9 Hz
      // at DPR 2.0 on retina. fitCanvasToDpr reads window.devicePixelRatio
      // fresh each call so display changes refresh correctly. Returned dpr
      // is composed with the viewBox-fit scale into the final transform.
      const { dpr } = fitCanvasToDpr(canvas, cssW, cssH, 1.5);
      const scale = Math.min(cssW / SVG_VIEW_W, cssH / SVG_VIEW_H);
      const offsetX = (cssW - SVG_VIEW_W * scale) / 2;
      const offsetY = (cssH - SVG_VIEW_H * scale) / 2;
      ctx.setTransform(
        scale * dpr,
        0,
        0,
        scale * dpr,
        offsetX * dpr,
        offsetY * dpr,
      );
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const t0 = performance.now();
    let rafId = 0;

    const frame = (now: number) => {
      const t = (now - t0) / 1000;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      const sel = selectedRef.current;

      // Pull TUNING locals into the closure so the hot loop can hit
      // them without property access overhead.
      const k1 = TUNING.flowK1;
      const w1 = TUNING.flowW1;
      const k2 = TUNING.flowK2;
      const w2 = TUNING.flowW2;
      const a2w = TUNING.flowAmp2Weight;

      // Number of alpha buckets - 8 is enough that the per-line
      // alpha gradient still reads as smooth, but few enough that
      // we make 8 stroke calls per form instead of ~270.
      const NUM_BUCKETS = 8;

      for (const form of FORMS) {
        const isSelected = sel === form.id;
        const isDimmed = sel !== null && !isSelected;
        const baseAlpha = isDimmed ? 0.08 : 1;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0d1a1e';
        ctx.lineWidth = 0.5;

        const flowAmp = form.motion.flowAmp;
        const N = form.lines.length;

        const t1off = w1 * t;
        const t1offY = w1 * t * 1.3;
        const t2off = w2 * t * 1.7;
        const t2offY = w2 * t * 0.7;

        // Walk lines in NUM_BUCKETS passes, drawing all lines in each
        // alpha bucket as a single path (one beginPath → many
        // moveTo+lineTo → one stroke).
        for (let bucket = 0; bucket < NUM_BUCKETS; bucket++) {
          const bucketDepthMid = (bucket + 0.5) / NUM_BUCKETS;
          ctx.globalAlpha = baseAlpha * (0.5 + 0.5 * (1 - bucketDepthMid));

          ctx.beginPath();

          for (let li = 0; li < N; li++) {
            const line = form.lines[li];
            const lineBucket = Math.min(
              NUM_BUCKETS - 1,
              Math.floor(line.depth * NUM_BUCKETS),
            );
            if (lineBucket !== bucket) continue;

            // OUTLINE LINE: push raw points into the current path
            // (no displacement for outlines).
            if (line.path !== null) {
              const pts = line.pts;
              const n = line.n;
              if (n < 2) continue;
              ctx.moveTo(pts[0], pts[1]);
              for (let kk = 1; kk < n; kk++) {
                ctx.lineTo(pts[kk * 2], pts[kk * 2 + 1]);
              }
              continue;
            }

            // INTERIOR LINE: per-point flow displacement.
            const pts = line.pts;
            const n = line.n;
            if (n < 2) continue;

            const a = flowAmp * line.dw;

            {
              const x = pts[0];
              const y = pts[1];
              const ax1 = k1 * x + t1off;
              const ay1 = k1 * y + t1offY;
              const ax2 = k2 * x + t2off;
              const ay2 = k2 * y + t2offY;
              const dx =
                Math.sin(ax1) * Math.cos(ay1) +
                a2w * Math.sin(ax2) * Math.cos(ay2);
              const dy =
                -Math.cos(ax1) * Math.sin(ay1) -
                a2w * Math.cos(ax2) * Math.sin(ay2);
              ctx.moveTo(x + a * dx, y + a * dy);
            }
            for (let kk = 1; kk < n; kk++) {
              const x = pts[kk * 2];
              const y = pts[kk * 2 + 1];
              const ax1 = k1 * x + t1off;
              const ay1 = k1 * y + t1offY;
              const ax2 = k2 * x + t2off;
              const ay2 = k2 * y + t2offY;
              const dx =
                Math.sin(ax1) * Math.cos(ay1) +
                a2w * Math.sin(ax2) * Math.cos(ay2);
              const dy =
                -Math.cos(ax1) * Math.sin(ay1) -
                a2w * Math.cos(ax2) * Math.sin(ay2);
              ctx.lineTo(x + a * dx, y + a * dy);
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

  // Render

  const selectedRegion = useMemo(
    () => REGIONS.find((r) => r.id === selected) ?? null,
    [selected],
  );

  return (
    <div className="w-full relative">
      {!import.meta.env.PROD && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 14,
            padding: '2px 6px',
            background: 'rgba(13,26,30,0.85)',
            color: '#ece7df',
            borderRadius: 3,
            pointerEvents: 'none',
          }}
        >
          {fps} fps
        </div>
      )}
      <div
        ref={containerRef}
        className="relative w-full mx-auto"
        style={{
          aspectRatio: `${SVG_VIEW_W} / ${SVG_VIEW_H}`,
          // Cap the stage so the legend buttons + info panel stay
          // visible alongside the canvas on desktop. Capping max-width
          // (rather than max-height) keeps the aspect ratio intact.
          // 65vh height ceiling → max-width = 65vh × (W/H).
          maxWidth: `calc(65vh * ${SVG_VIEW_W} / ${SVG_VIEW_H})`,
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
        />
        {overlaySvg && (
          <div
            className="absolute inset-0 w-full h-full pointer-events-none"
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

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {REGIONS.map((r) => (
          <PosterControlButton
            key={r.id}
            label={r.name}
            isActive={selected === r.id}
            accentColour={r.color}
            leadingDot
            revealsContentBelow
            onClick={() =>
              setSelected((prev) => (prev === r.id ? null : r.id))
            }
          />
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
