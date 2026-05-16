import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Poster006FormsData } from '@/components/Poster006Viz';

// ─── Dose metadata ──────────────────────────────────────────────

interface DoseMeta {
  id: string;
  name: string;
  doseMSv: number;
  doseLabel: string;
  qualifier: string;
}

// Single 3×3 grid, ascending dose order left-to-right, top-to-bottom.
// The id field maps to the source SVG's dose-* group.
const ALL_DOSES: DoseMeta[] = [
  { id: 'reactor',    name: 'Near a reactor',       doseMSv: 0.003, doseLabel: '0.003 mSv', qualifier: 'Annual dose, 1 km from a UK reactor' },
  { id: 'dental',     name: 'Dental x-ray',         doseMSv: 0.005, doseLabel: '0.005 mSv', qualifier: 'Single film' },
  { id: 'chest',      name: 'Chest x-ray',          doseMSv: 0.02,  doseLabel: '0.02 mSv',  qualifier: 'Single film' },
  { id: 'llw_drum',   name: 'LLW drum',             doseMSv: 0.05,  doseLabel: '0.05 mSv',  qualifier: '1 hour at 1 m' },
  { id: 'flight',     name: 'Transatlantic flight', doseMSv: 0.08,  doseLabel: '0.08 mSv', qualifier: 'One way' },
  { id: 'ilw',        name: 'ILW package',          doseMSv: 2,     doseLabel: '2 mSv',     qualifier: '1 hour at 1 m' },
  { id: 'hlw',        name: 'HLW flask',            doseMSv: 2,     doseLabel: '2 mSv',     qualifier: '1 hour at 1 m, shielded' },
  { id: 'background', name: 'Background radiation', doseMSv: 2.7,   doseLabel: '2.7 mSv',   qualifier: 'Annual UK average' },
  { id: 'ct',         name: 'CT scan',              doseMSv: 10,    doseLabel: '10 mSv',    qualifier: 'Abdominal CT' },
];

// ─── Source line geometry ──────────────────────────────────────

interface PreparedLine {
  dx1: number; dy1: number;
  dx2: number; dy2: number;
  delay: number;
  /** 0 (line near centre, brighter) → 1 (line far from centre, fainter). */
  depth: number;
}

interface DoseRender {
  centreRadius: number;
  lines: PreparedLine[];
  /** lines bucketed by depth so the alpha-bucket draw walks each bucket once. */
  buckets: PreparedLine[][];
  formRadius: number; // farthest endpoint from centre, in source SVG units
}

const NUM_BUCKETS = 8;

type DoseSrc = Poster006FormsData['doses'];

const BURST_DURATION_MS = 1200;
const MAX_STAGGER_MS = 350;

function buildRender(id: string, doseSrc: DoseSrc): DoseRender {
  const src = doseSrc[id];
  const [cx, cy] = src.centre;
  let formRadius = src.centreRadius;
  // First pass: translate to form-local + measure formRadius.
  const raw = src.lines.map((l, i) => {
    const dx1 = l.x1 - cx;
    const dy1 = l.y1 - cy;
    const dx2 = l.x2 - cx;
    const dy2 = l.y2 - cy;
    const r1 = Math.hypot(dx1, dy1);
    const r2 = Math.hypot(dx2, dy2);
    if (r1 > formRadius) formRadius = r1;
    if (r2 > formRadius) formRadius = r2;
    const delay = ((i * 37) % 13) * (MAX_STAGGER_MS / 13);
    // Use the line's outermost endpoint distance as its depth proxy  -
    // longer rays read as "outer / fainter", shorter ones as
    // "inner / brighter". Matches Poster 001's depth-by-line-index
    // intent: alpha-bucket batching produces a transparent stack.
    const outer = Math.max(r1, r2);
    return { dx1, dy1, dx2, dy2, delay, outer };
  });
  // Normalise depth across this dose's own range.
  const minOuter = raw.reduce((m, l) => Math.min(m, l.outer), Infinity);
  const maxOuter = raw.reduce((m, l) => Math.max(m, l.outer), 0);
  const range = Math.max(1e-3, maxOuter - minOuter);
  const lines: PreparedLine[] = raw.map((l) => ({
    dx1: l.dx1, dy1: l.dy1, dx2: l.dx2, dy2: l.dy2, delay: l.delay,
    depth: (l.outer - minOuter) / range,
  }));
  const buckets: PreparedLine[][] = Array.from({ length: NUM_BUCKETS }, () => []);
  for (const line of lines) {
    const b = Math.min(NUM_BUCKETS - 1, Math.floor(line.depth * NUM_BUCKETS));
    buckets[b].push(line);
  }
  return {
    centreRadius: src.centreRadius,
    lines,
    buckets,
    formRadius,
  };
}

interface DoseRenderData {
  render: Record<string, DoseRender>;
  referenceRadius: number;
}

function buildRenderData(formsData: Poster006FormsData): DoseRenderData {
  const render: Record<string, DoseRender> = {};
  for (const meta of ALL_DOSES) {
    render[meta.id] = buildRender(meta.id, formsData.doses);
  }
  // CT scan defines the cell-fill scale - every other dose is rendered
  // proportionally smaller using its source formRadius / CT's formRadius.
  return { render, referenceRadius: render.ct.formRadius || 1 };
}

// ─── Per-cell canvas component ──────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface DoseCellProps {
  dose: DoseMeta;
  reduced: boolean;
  renderData: DoseRenderData;
}

function DoseCell({ dose, reduced, renderData }: DoseCellProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stateRef = useRef<{
    cssW: number; cssH: number;
    scale: number; ox: number; oy: number;
    burstStart: number | null;
    rafId: number;
  }>({ cssW: 0, cssH: 0, scale: 1, ox: 0, oy: 0, burstStart: null, rafId: 0 });

  const data = renderData.render[dose.id];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const s = stateRef.current;
    ctx.clearRect(0, 0, s.cssW, s.cssH);

    const animating = !reduced && s.burstStart !== null;
    const elapsed = animating ? performance.now() - (s.burstStart as number) : Infinity;
    const totalDuration = BURST_DURATION_MS + MAX_STAGGER_MS;

    // Centre red dot - sized to the source's centreRadius scaled to
    // the cell. Smaller doses' centre dots stay proportionally small.
    const dotR = Math.max(1.5, data.centreRadius * s.scale);
    ctx.beginPath();
    ctx.arc(s.ox, s.oy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = '#a51e23';
    ctx.fill();

    // Source-extracted rays, drawn with Poster 001's transparent
    // line-trace technique - alpha-bucket batched (8 buckets), thin
    // strokes, depth-graded alpha. The smallest doses (reactor,
    // dental) genuinely have no ray geometry in the print and render
    // as a centre dot only.
    if (data.lines.length > 0) {
      ctx.strokeStyle = '#a51e23';
      ctx.lineWidth = 0.5;
      ctx.lineCap = 'round';
      for (let bucket = 0; bucket < NUM_BUCKETS; bucket++) {
        const bucketLines = data.buckets[bucket];
        if (bucketLines.length === 0) continue;
        const bMid = (bucket + 0.5) / NUM_BUCKETS;
        // Inner rays (low depth) read as more solid; outer rays fade
        // to roughly 35% alpha. This produces the layered transparent
        // stack visible in the print artwork.
        ctx.globalAlpha = 0.35 + 0.55 * (1 - bMid);
        ctx.beginPath();
        for (const l of bucketLines) {
          let t = 1;
          if (animating) {
            const localElapsed = elapsed - l.delay;
            if (localElapsed < 0) t = 0;
            else t = Math.min(1, localElapsed / BURST_DURATION_MS);
          }
          const e = easeOutCubic(t);
          const x1 = s.ox + l.dx1 * s.scale * e;
          const y1 = s.oy + l.dy1 * s.scale * e;
          const x2 = s.ox + l.dx2 * s.scale * e;
          const y2 = s.oy + l.dy2 * s.scale * e;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    if (animating && elapsed < totalDuration + 50) {
      s.rafId = requestAnimationFrame(draw);
    } else {
      s.burstStart = null;
      s.rafId = 0;
    }
  }, [data, reduced]);

  // Mount: set up canvas + initial static draw + resize observer.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const CELL_PADDING = 0.92;
    const s = stateRef.current;

    const resize = () => {
      const r = container.getBoundingClientRect();
      s.cssW = r.width;
      s.cssH = r.height;
      canvas.width = Math.max(1, Math.floor(s.cssW * DPR));
      canvas.height = Math.max(1, Math.floor(s.cssH * DPR));
      canvas.style.width = s.cssW + 'px';
      canvas.style.height = s.cssH + 'px';
      const halfMin = Math.min(s.cssW, s.cssH) / 2;
      const cellHalf = halfMin * CELL_PADDING;
      // CT (largest source formRadius) fills the cell. Every other
      // dose is rendered at its own source extent / CT's source extent.
      // This preserves the print's proportional sizing exactly.
      s.scale = cellHalf / renderData.referenceRadius;
      s.ox = s.cssW / 2;
      s.oy = s.cssH / 2;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      draw();
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(s.rafId);
      s.rafId = 0;
      ro.disconnect();
    };
  }, [data, draw]);

  const triggerBurst = useCallback(() => {
    if (reduced) return;
    const s = stateRef.current;
    if (s.burstStart !== null) {
      const elapsed = performance.now() - s.burstStart;
      if (elapsed < BURST_DURATION_MS + MAX_STAGGER_MS) return;
    }
    s.burstStart = performance.now();
    if (s.rafId === 0) {
      s.rafId = requestAnimationFrame(draw);
    }
  }, [draw, reduced]);

  return (
    // Each cell uses fixed-height label rows so the labels align
    // across the grid regardless of qualifier text length.
    <div className="flex flex-col items-center text-center w-full">
      <div
        ref={containerRef}
        className="relative w-full cursor-default"
        style={{ aspectRatio: '1 / 1', maxWidth: 380 }}
        onMouseEnter={triggerBurst}
        onFocus={triggerBurst}
        tabIndex={0}
        role="button"
        aria-label={`${dose.name}, ${dose.doseLabel}. Hover to replay burst.`}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Label block - fixed-height rows lock the vertical baseline
          across cells. Qualifier reserves two lines of height even
          when the text is short, so neighbouring cells line up. */}
      <h4
        className="font-serif text-base mt-4"
        style={{
          color: '#0d1a1e',
          fontWeight: 600,
          minHeight: '1.5rem',
          lineHeight: 1.25,
        }}
      >
        {dose.name}
      </h4>
      <p
        className="text-sm font-medium mt-1"
        style={{
          color: '#a51e23',
          fontFamily: "'Playfair', Georgia, serif",
          minHeight: '1.25rem',
        }}
      >
        {dose.doseLabel}
      </p>
      <p
        className="text-sm text-muted-foreground mt-1 max-w-[180px]"
        style={{
          fontFamily: "'Playfair', Georgia, serif",
          minHeight: '2.4rem',
          lineHeight: 1.35,
        }}
      >
        {dose.qualifier}
      </p>
    </div>
  );
}

// ─── Section component ─────────────────────────────────────────

interface Poster006RadiationDosesProps {
  formsData: Poster006FormsData | null;
}

export default function Poster006RadiationDoses({ formsData }: Poster006RadiationDosesProps) {
  const reduced = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const renderData = useMemo(
    () => (formsData ? buildRenderData(formsData) : null),
    [formsData],
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Tighter row gap (gap-y-2..4) than column gap (gap-x-6..10)
          so rows squeeze together - bursts of adjacent rows don't
          overlap because the cells are square and the rays stay
          inside the cell radius. */}
      <div className="grid grid-cols-3 gap-y-2 gap-x-6 sm:gap-y-4 sm:gap-x-10 justify-items-stretch">
        {renderData && ALL_DOSES.map((dose) => (
          <DoseCell key={dose.id} dose={dose} reduced={reduced} renderData={renderData} />
        ))}
      </div>
      <p
        className="text-center text-sm text-muted-foreground mt-8"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        Hover any form to replay the burst from its centre. The smallest
        doses (reactor, dental) appear as a centre dot only - the print
        artwork has no rays for them, and the web preserves that honestly.
      </p>
    </div>
  );
}
