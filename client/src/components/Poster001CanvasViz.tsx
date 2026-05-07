import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPolylines, type Polyline, type BBox } from '@/lib/parseSvg';
import { resolveMotion, applyMotion, type FormMotion } from '@/lib/posterMotion';
import formsData from '@/assets/poster-001-forms.json';

// ─────────────────────────────────────────────────────────────────────
// Region metadata — copied from the original Poster001Viz.tsx so the
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
// ─────────────────────────────────────────────────────────────────────

interface PreparedForm {
  id: string;
  polylines: Polyline[];
  bbox: BBox;
  centroid: [number, number];
  motion: FormMotion;
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
  return {
    id,
    polylines,
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

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const r = container.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      canvas.width = Math.max(1, Math.floor(cssW * DPR));
      canvas.height = Math.max(1, Math.floor(cssH * DPR));
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      const scale = Math.min(cssW / SVG_VIEW_W, cssH / SVG_VIEW_H);
      const offsetX = (cssW - SVG_VIEW_W * scale) / 2;
      const offsetY = (cssH - SVG_VIEW_H * scale) / 2;
      ctx.setTransform(
        scale * DPR,
        0,
        0,
        scale * DPR,
        offsetX * DPR,
        offsetY * DPR,
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

      for (const form of FORMS) {
        const isSelected = sel === form.id;
        const isDimmed = sel !== null && !isSelected;
        const baseAlpha = isDimmed ? 0.08 : 1;

        const motion = applyMotion(form.motion, t);

        ctx.save();
        ctx.translate(form.centroid[0], form.centroid[1]);
        ctx.scale(motion.scale, motion.scale);
        ctx.translate(-form.centroid[0], -form.centroid[1]);
        ctx.translate(motion.offsetX, motion.offsetY);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0d1a1e';
        ctx.lineWidth = 0.5;

        const N = form.polylines.length;
        for (let li = 0; li < N; li++) {
          const L = form.polylines[li];
          const pts = L.pts;
          const n = L.n;
          if (n < 2) continue;

          const depth = N > 1 ? li / (N - 1) : 0;
          ctx.globalAlpha = baseAlpha * (0.5 + 0.5 * (1 - depth));

          const jx =
            form.motion.jitterAmp *
            Math.sin(t * 0.43 + li * 0.91 + form.motion.phaseDrift);
          const jy =
            form.motion.jitterAmp *
            Math.cos(t * 0.37 + li * 0.71 + form.motion.phaseDrift);

          ctx.beginPath();
          ctx.moveTo(pts[0] + jx, pts[1] + jy);
          for (let k = 1; k < n; k++) {
            ctx.lineTo(pts[k * 2] + jx, pts[k * 2 + 1] + jy);
          }
          ctx.stroke();
        }

        ctx.restore();
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
    <div className="w-full">
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
          <button
            key={r.id}
            onClick={() =>
              setSelected((prev) => (prev === r.id ? null : r.id))
            }
            className={`
              px-3 py-1.5 rounded-sm text-sm tracking-wide uppercase
              transition-all duration-200 border cursor-pointer
              active:scale-95
              ${
                selected === r.id
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
