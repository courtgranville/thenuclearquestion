import { useEffect, useReducer, useRef } from 'react';
import { buildPolylines } from '@/lib/parseSvg';
import { depthWeight, resolveMotion, TUNING } from '@/lib/posterMotion';
import { TUNING as FISSION_TUNING } from '@/lib/fission';
import formsData from '@/assets/poster-006-forms.json';
import PosterControlButton from '@/components/PosterControlButton';

// ─── Canonical form trace ───────────────────────────────────────
//
// Conceptually each waste category is the same organic blob, just
// rendered at the print's category-specific size. The source SVG
// hand-traces each at its print-volume size, which means:
//   VLLW R = 359 (high fidelity, big source)
//   ILW  R = 257 (decent)
//   LLW  R = 156 (medium)
//   HLW  R =   8 (tiny - basically a dot in the print)
//
// Using each form's own source paths produces uneven fidelity:
// HLW in radioactivity mode (scale=1, fills the slot) magnifies
// the tiny source 40× - every microscopic Procreate-brush jitter
// becomes a visible jagged line.
//
// Use VLLW's high-fidelity trace as the canonical shape for all
// four forms. They share the shape concept; only size and colour
// differ. This matches Round 5's earlier approach and gives every
// form clean, consistent lines regardless of mode.

const wasteData = (formsData as unknown as {
  wasteCategories: Record<
    string,
    {
      paths: string[];
      centroid: [number, number];
      nativeRadius: number;
      volumePct: number;
      radioactivityPct: number;
    }
  >;
}).wasteCategories;

const CANONICAL = wasteData.vllw;
const { polylines: RAW_LINES } = buildPolylines(CANONICAL.paths);
const N_LINES = RAW_LINES.length;

interface PreparedLine {
  pts: Float32Array; // form-local, normalised so ±1 ≈ form half-extent
  n: number;
  depth: number;
  dw: number;        // pre-computed depthWeight; 0 → outline
}

const NUM_BUCKETS = 8;

const LINES: PreparedLine[] = (() => {
  const cx = CANONICAL.centroid[0];
  const cy = CANONICAL.centroid[1];
  const inv = 1 / Math.max(1e-3, CANONICAL.nativeRadius);
  return RAW_LINES.map((p, i) => {
    const depth = N_LINES > 1 ? i / (N_LINES - 1) : 0;
    const dw = depthWeight(depth);
    const pts = new Float32Array(p.pts.length);
    for (let k = 0; k < p.pts.length; k += 2) {
      pts[k]     = (p.pts[k] - cx) * inv;
      pts[k + 1] = (p.pts[k + 1] - cy) * inv;
    }
    return { pts, n: p.n, depth, dw };
  });
})();

const LINES_BY_BUCKET: PreparedLine[][] = Array.from(
  { length: NUM_BUCKETS },
  () => [],
);
for (const line of LINES) {
  const b = Math.min(NUM_BUCKETS - 1, Math.floor(line.depth * NUM_BUCKETS));
  LINES_BY_BUCKET[b].push(line);
}

// ─── Per-form metadata ──────────────────────────────────────────

type FormId = 'vllw' | 'llw' | 'ilw' | 'hlw';
type Mode = 'volume' | 'radioactivity';

interface FormMeta {
  id: FormId;
  shortName: string;
  longName: string;
  accent: string;
  volPct: number;
  radioPct: number;
  volumeLabel: string;
  pctLabel: string;
}

const FORMS: FormMeta[] = [
  { id: 'vllw', shortName: 'VLLW', longName: 'Very low level waste',  accent: '#7d746a', volPct: 58.6,  radioPct: 0.0005, volumeLabel: '2,610,000 m³', pctLabel: '58.6% volume · <0.001% radioactivity' },
  { id: 'llw',  shortName: 'LLW',  longName: 'Low level waste',        accent: '#4b6e70', volPct: 30.2,  radioPct: 0.0005, volumeLabel: '1,340,000 m³', pctLabel: '30.2% volume · <0.001% radioactivity' },
  { id: 'ilw',  shortName: 'ILW',  longName: 'Intermediate level waste', accent: '#1b3967', volPct: 11.1,  radioPct: 4.4,    volumeLabel: '496,000 m³',   pctLabel: '11.1% volume · 4.4% radioactivity'    },
  { id: 'hlw',  shortName: 'HLW',  longName: 'High level waste',       accent: '#a51e23', volPct: 0.033, radioPct: 95.6,   volumeLabel: '1,470 m³',     pctLabel: '<0.1% volume · 95.6% radioactivity'   },
];

const MAX_VOL   = Math.max(...FORMS.map((f) => f.volPct));
const MAX_RADIO = Math.max(...FORMS.map((f) => f.radioPct));
const SCALE_FLOOR = 0.04;

function targetScale(form: FormMeta, mode: Mode): number {
  const v = mode === 'volume'
    ? form.volPct / MAX_VOL
    : form.radioPct / MAX_RADIO;
  return Math.max(Math.sqrt(v), SCALE_FLOOR);
}

// Quieter flow profile so the lines stay legible as a trace rather
// than reading as dense fill.
const FLOW = resolveMotion(40);

// ─── State machine ──────────────────────────────────────────────

interface State {
  mode: Mode;
  fromMode: Mode;
  transitioning: boolean;
  transitionStart: number;
}

type Action =
  | { type: 'TOGGLE'; mode: Mode; now: number }
  | { type: 'FINISH' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'TOGGLE':
      return {
        mode: action.mode,
        fromMode: state.mode,
        transitioning: true,
        transitionStart: action.now,
      };
    case 'FINISH':
      return { ...state, transitioning: false };
    default:
      return state;
  }
}

const TRANSITION_MS = 1200;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Dev-only FPS overlay - visible behind the ?fps query string.
function useFpsCounter(): number | null {
  const [fps, setFps] = useReducer(
    (_: number | null, n: number | null) => n,
    null as number | null,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!new URLSearchParams(window.location.search).has('fps')) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

// ─── Component ──────────────────────────────────────────────────

export default function Poster006WasteInversion() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const labelRefs = useRef<Record<FormId, HTMLDivElement | null>>({
    vllw: null, llw: null, ilw: null, hlw: null,
  });
  const fps = useFpsCounter();

  const [state, dispatch] = useReducer(reducer, {
    mode: 'volume',
    fromMode: 'volume',
    transitioning: false,
    transitionStart: 0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const reducedRef = useRef<boolean>(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  const ptrRef = useRef({
    txCss: -1e6, tyCss: -1e6,
    xCss:  -1e6, yCss:  -1e6,
    vxCss: 0, vyCss: 0,
    smoothSpeed: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    let cssW = 0;
    let cssH = 0;
    // Per-form slot centres. Indexed in FORMS order: VLLW, LLW, ILW, HLW.
    const slotCx: number[] = [0, 0, 0, 0];
    const slotCy: number[] = [0, 0, 0, 0];
    // Per-form slot bbox - used to determine which form the cursor is
    // "inside". Each form's magnetism only activates when the cursor
    // is inside its own slot rectangle, matching NucleusHero's
    // single-form-single-bbox interaction model rather than a global
    // magnetism field across all four forms.
    const slotMinX: number[] = [0, 0, 0, 0];
    const slotMinY: number[] = [0, 0, 0, 0];
    const slotMaxX: number[] = [0, 0, 0, 0];
    const slotMaxY: number[] = [0, 0, 0, 0];
    let baseRadiusCss = 1; // form half-extent in CSS px at scale=1

    const resize = () => {
      const r = container.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      canvas.width  = Math.max(1, Math.floor(cssW * DPR));
      canvas.height = Math.max(1, Math.floor(cssH * DPR));
      canvas.style.width  = cssW + 'px';
      canvas.style.height = cssH + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      const isStacked = cssW < 560;
      if (isStacked) {
        const rowH = cssH / 4;
        for (let i = 0; i < 4; i++) {
          slotCx[i] = cssW / 2;
          slotCy[i] = rowH * (i + 0.5);
          slotMinX[i] = 0;
          slotMaxX[i] = cssW;
          slotMinY[i] = rowH * i;
          slotMaxY[i] = rowH * (i + 1);
        }
        baseRadiusCss = Math.min(cssW / 2, rowH / 2) * 0.84;
      } else {
        const colW = cssW / 2;
        const rowH = cssH / 2;
        // FORMS order = vllw, llw, ilw, hlw mapped to (col, row).
        const layout: Array<[number, number]> = [
          [0, 0], [1, 0], [0, 1], [1, 1],
        ];
        for (let i = 0; i < 4; i++) {
          const [col, row] = layout[i];
          slotCx[i] = colW * (col + 0.5);
          slotCy[i] = rowH * (row + 0.5);
          slotMinX[i] = colW * col;
          slotMaxX[i] = colW * (col + 1);
          slotMinY[i] = rowH * row;
          slotMaxY[i] = rowH * (row + 1);
        }
        baseRadiusCss = Math.min(colW, rowH) / 2 * 0.84;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const onPointerMove = (e: PointerEvent) => {
      const r = container.getBoundingClientRect();
      const ptr = ptrRef.current;
      const nx = e.clientX - r.left;
      const ny = e.clientY - r.top;
      // First entry from "parked" state - snap the eased position to
      // the new target so the velocity calc doesn't see a -1e6 → real
      // jump and the magnetism centre starts where the cursor is.
      if (ptr.xCss < -1000) {
        ptr.xCss = nx;
        ptr.yCss = ny;
      }
      ptr.txCss = nx;
      ptr.tyCss = ny;
    };
    const onPointerLeave = () => {
      const ptr = ptrRef.current;
      ptr.txCss = -1e6;
      ptr.tyCss = -1e6;
      ptr.xCss = -1e6;
      ptr.yCss = -1e6;
    };
    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave, { passive: true });

    const t0 = performance.now();
    let lastT = t0;
    let rafId = 0;
    let loopGuard = false;
    let prevActiveIdx = -1;

    const frame = (now: number) => {
      const dt = Math.max(0.001, Math.min(0.05, (now - lastT) / 1000));
      lastT = now;
      const t = (now - t0) / 1000;

      // Cursor easing - match NucleusHero exactly (10% per frame).
      // The "stops working" feel earlier was a side-effect of one
      // global magnetism field across all four forms; that's fixed
      // below by giving each form its own bbox-keyed activation.
      const ptr = ptrRef.current;
      const pxC = ptr.xCss;
      const pyC = ptr.yCss;
      ptr.xCss += (ptr.txCss - ptr.xCss) * 0.10;
      ptr.yCss += (ptr.tyCss - ptr.yCss) * 0.10;
      ptr.vxCss = (ptr.xCss - pxC) / dt;
      ptr.vyCss = (ptr.yCss - pyC) / dt;
      const speed = Math.hypot(ptr.vxCss, ptr.vyCss);
      ptr.smoothSpeed += (speed - ptr.smoothSpeed) * 0.18;

      // Per-form scale (interpolated if transitioning).
      const s = stateRef.current;
      const scales: number[] = [0, 0, 0, 0];
      if (s.transitioning) {
        const p = Math.min(1, (now - s.transitionStart) / TRANSITION_MS);
        const e = easeOutCubic(p);
        for (let i = 0; i < 4; i++) {
          const fromS = targetScale(FORMS[i], s.fromMode);
          const toS   = targetScale(FORMS[i], s.mode);
          scales[i] = fromS + (toS - fromS) * e;
        }
        if (p >= 1 && !loopGuard) {
          loopGuard = true;
          queueMicrotask(() => dispatch({ type: 'FINISH' }));
        }
      } else {
        loopGuard = false;
        for (let i = 0; i < 4; i++) {
          scales[i] = targetScale(FORMS[i], s.mode);
        }
      }

      // Form-unit → CSS px multiplier per form. Form points are
      // normalised to ±1, so this just scales up.
      const px: number[] = [
        baseRadiusCss * scales[0],
        baseRadiusCss * scales[1],
        baseRadiusCss * scales[2],
        baseRadiusCss * scales[3],
      ];

      // Flow constants. Note flowK1/K2 operate in "form units" now
      // (since points are normalised), so the spatial wavelength is
      // form-relative - divide by px to keep wavelength CSS-px-stable.
      const k1 = TUNING.flowK1 * 25; // empirical: matches Poster 001 feel after normalisation
      const w1 = TUNING.flowW1;
      const k2 = TUNING.flowK2 * 25;
      const w2 = TUNING.flowW2;
      const a2w = TUNING.flowAmp2Weight;
      const flowAmp = reducedRef.current ? 0 : FLOW.flowAmp / 360;
      const t1off  = w1 * t;
      const t1offY = w1 * t * 1.3;
      const t2off  = w2 * t * 1.7;
      const t2offY = w2 * t * 0.7;

      // Per-form bbox-keyed magnetism. The activation decision uses
      // the RAW cursor position so fast cursor moves register the
      // moment they cross a slot boundary.
      let activeIdx = -1;
      const rawX = ptr.txCss;
      const rawY = ptr.tyCss;
      for (let i = 0; i < 4; i++) {
        if (
          rawX >= slotMinX[i] && rawX < slotMaxX[i] &&
          rawY >= slotMinY[i] && rawY < slotMaxY[i]
        ) {
          activeIdx = i;
          break;
        }
      }
      // When the active form changes, snap the eased cursor position
      // to the raw target. Without this snap the new active form's
      // bulge centre would be ~150 ms behind the cursor (and possibly
      // entirely outside the new slot) until easing caught up. With
      // it, the new form responds at the correct cursor location
      // from the first frame.
      if (activeIdx !== prevActiveIdx && activeIdx !== -1) {
        ptr.xCss = rawX;
        ptr.yCss = rawY;
      }
      prevActiveIdx = activeIdx;

      const baseBulge = FISSION_TUNING.baseBulge * FISSION_TUNING.strength;
      const formMagnetism: { ddCx: number; ddCy: number; twoSig2: number; bulgeGain: number; impulse: number; halfCss: number }[] = [];
      for (let i = 0; i < 4; i++) {
        const halfCss = px[i];
        // Bulge centre uses the EASED cursor position - that's what
        // NucleusHero does and what gives the form its "weight" feel
        // (slight lag as the deformation follows the cursor rather
        // than snapping instantly). The activation gate above uses
        // the raw position, and the eased position is snapped to
        // raw on slot-change, so the lag never causes the form to
        // miss the cursor; it just smooths the bulge motion within
        // a single form.
        const ddCx = ptr.xCss - slotCx[i];
        const ddCy = ptr.yCss - slotCy[i];
        const speedNorm = Math.min(1.4, ptr.smoothSpeed / Math.max(1, halfCss * 0.9));
        const impulse = Math.min(1.4, speedNorm);
        const bulgeGain = (i === activeIdx && !reducedRef.current)
          ? baseBulge * (1 + impulse * 0.6)
          : 0;
        const sigma = Math.max(1, halfCss * 0.5);
        const twoSig2 = 2 * sigma * sigma;
        formMagnetism.push({
          ddCx, ddCy, twoSig2, bulgeGain, impulse, halfCss,
        });
      }

      // Clear.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Draw - alpha-bucket batched per form. Poster 001 line/alpha
      // values: lineWidth 0.5, alpha 0.5..1.0 across buckets - gives
      // the transparent traced-line appearance Court wants.
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = FORMS[i].accent;
        const buckets = LINES_BY_BUCKET;
        const mag = formMagnetism[i];
        const cx = slotCx[i];
        const cy = slotCy[i];
        const pxi = px[i];

        for (let bucket = 0; bucket < NUM_BUCKETS; bucket++) {
          const bucketLines = buckets[bucket];
          if (bucketLines.length === 0) continue;
          const bMid = (bucket + 0.5) / NUM_BUCKETS;
          ctx.globalAlpha = 0.5 + 0.5 * (1 - bMid);

          ctx.beginPath();

          for (const line of bucketLines) {
            const pts = line.pts;
            const n = line.n;
            if (n < 2) continue;
            // Outline lines (dw=0): no flow displacement. Interior
            // lines: full flow.
            const a = line.dw === 0 ? 0 : flowAmp * line.dw;

            for (let kk = 0; kk < n; kk++) {
              // Form-local normalised point (range ±1).
              let lx = pts[kk * 2];
              let ly = pts[kk * 2 + 1];

              // Flow (interior only).
              if (a > 0) {
                const ax1 = k1 * lx + t1off;
                const ay1 = k1 * ly + t1offY;
                const ax2 = k2 * lx + t2off;
                const ay2 = k2 * ly + t2offY;
                const fdx = Math.sin(ax1) * Math.cos(ay1)
                          + a2w * Math.sin(ax2) * Math.cos(ay2);
                const fdy = -Math.cos(ax1) * Math.sin(ay1)
 - a2w * Math.cos(ax2) * Math.sin(ay2);
                lx += a * fdx;
                ly += a * fdy;
              }

              // Project to CSS px relative to slot centre.
              let dispX = lx * pxi;
              let dispY = ly * pxi;

              // Magnetism - Gaussian-only; no per-form gate so the
              // form deforms continuously as the cursor approaches
              // rather than switching modes at a cutoff radius.
              if (mag.bulgeGain > 0) {
                const ddx = dispX - mag.ddCx;
                const ddy = dispY - mag.ddCy;
                const distSq = ddx * ddx + ddy * ddy;
                const g = Math.exp(-distSq / mag.twoSig2);
                if (g > 1e-4) {
                  const distLen = Math.sqrt(distSq) + 1e-3;
                  const push = g * mag.bulgeGain * mag.halfCss * 0.50;
                  dispX += (ddx / distLen) * push;
                  dispY += (ddy / distLen) * push;
                  const drag = g * mag.impulse * mag.halfCss * 0.18 * (0.4 + line.depth * 0.9);
                  dispX += ptr.vxCss * drag * (0.6 / Math.max(1, mag.halfCss));
                  dispY += ptr.vyCss * drag * (0.6 / Math.max(1, mag.halfCss));
                }
              }

              const screenX = cx + dispX;
              const screenY = cy + dispY;

              if (kk === 0) ctx.moveTo(screenX, screenY);
              else ctx.lineTo(screenX, screenY);
            }
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Update label positions.
      for (let i = 0; i < 4; i++) {
        const node = labelRefs.current[FORMS[i].id];
        if (!node) continue;
        const halfCss = px[i];
        node.style.left = `${slotCx[i]}px`;
        node.style.top = `${slotCy[i] + halfCss + 8}px`;
      }

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  const handleToggle = (next: Mode) => {
    if (state.mode === next || state.transitioning) return;
    dispatch({ type: 'TOGGLE', mode: next, now: performance.now() });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8">
      <div
        ref={containerRef}
        className="relative w-full aspect-[1/4] sm:aspect-square"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

        {fps !== null && (
          <div
            className="absolute top-2 right-2 z-30 px-2 py-1 rounded-sm pointer-events-none"
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 14,
              background: 'rgba(13,26,30,0.85)',
              color: '#ece7df',
            }}
          >
            {fps} fps
          </div>
        )}

        {/* Per-form labels - driven by the RAF loop via refs. */}
        {FORMS.map((f) => (
          <div
            key={f.id}
            ref={(node) => { labelRefs.current[f.id] = node; }}
            className="absolute pointer-events-none text-center"
            style={{
              willChange: 'left, top',
              transform: 'translate(-50%, 0)',
              maxWidth: 200,
            }}
          >
            <p
              className="font-serif text-sm leading-tight"
              style={{ color: f.accent, fontWeight: 600 }}
            >
              {f.longName}
            </p>
            <p
              className="text-sm font-medium mt-0.5"
              style={{ color: f.accent, fontFamily: "'Playfair', Georgia, serif" }}
            >
              {f.volumeLabel}
            </p>
            <p
              className="text-sm text-muted-foreground italic mt-0.5"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              {f.pctLabel}
            </p>
          </div>
        ))}
      </div>

      {/* Toggle - segmented pair so the two modes read as a single
          choice rather than separate links. */}
      <div className="flex justify-center mt-8">
        <div className="inline-flex" role="group" aria-label="Display mode">
          <PosterControlButton
            label="By Volume"
            isActive={state.mode === 'volume'}
            onClick={() => handleToggle('volume')}
            disabled={state.transitioning}
            segmentedPosition="first"
          />
          <PosterControlButton
            label="By Radioactivity"
            isActive={state.mode === 'radioactivity'}
            onClick={() => handleToggle('radioactivity')}
            disabled={state.transitioning}
            segmentedPosition="last"
          />
        </div>
      </div>

      <p
        className="text-center text-sm text-muted-foreground mt-4 max-w-2xl mx-auto px-4 leading-relaxed"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        Forms scaled by the square root of value to preserve visibility - strict area scaling
        would hide HLW in volume mode and VLLW in radioactivity mode.
      </p>
    </div>
  );
}
