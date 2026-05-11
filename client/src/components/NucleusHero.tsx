// client/src/components/NucleusHero.tsx
import { useEffect, useRef, type ReactNode } from 'react';
import { buildPolylines, type BBox, type Polyline } from '@/lib/parseSvg';
import {
  TUNING,
  isotopeToGates,
  makeFissionState,
  type FissionState,
} from '@/lib/fission';
import { spawnBurst, stepAndDrawParticles } from '@/lib/particles';
import { fitCanvasToDpr } from '@/lib/canvasUtils';
import { sampleCoalescedPointer } from '@/lib/cursorSampling';

interface NucleusHeroProps {
  /** SVG path d-strings extracted from the icon. */
  paths: string[];
  /** 0 = U-235 (stable, harder to fission); 1 = U-238 (enriched, easier). */
  isotope: 0 | 1;
  /** Children rendered absolutely on top of the canvas (e.g. tweaks anchor). */
  children?: ReactNode;
}

/**
 * Hero canvas - full-bleed wide, height-driven sizing. Draws the nucleus
 * every frame from the parsed polylines, applies cursor magnetism, breathing,
 * shake-detected fission with bounce + reform phases, and a particle burst.
 *
 * The animation is identical to the canonical vite-port: same TUNING constants,
 * same state machine, same magnetism math. The isotope prop is read through a
 * ref so toggling it never restarts the loop.
 */
export function NucleusHero({ paths, isotope, children }: NucleusHeroProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Live ref so the loop reads the latest isotope without restarting.
  const isotopeRef = useRef<number>(isotope);
  isotopeRef.current = isotope;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Honour reduced-motion at mount time. Canvas still renders a static
    // nucleus (one frame), but breathing/drift/fission detection are off.
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;

    const resize = () => {
      const r = container.getBoundingClientRect();
      W = r.width;
      H = r.height;
      const { dpr } = fitCanvasToDpr(canvas, W, H);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Parse paths once.
    const { polylines, bbox } = buildPolylines(paths);

    // Cursor state.
    const ptr = {
      x: 0, y: 0, tx: 0, ty: 0,
      vx: 0, vy: 0, speed: 0,
      active: false,
    };
    // Raw event-level tracking for fission detection. With coalesced-
    // sample averaging (sampleCoalescedPointer above), both this raw
    // channel and the smoothed magnetism channel receive Firefox-
    // equivalent input in every browser, so the fission gate triggers
    // on the same effective gesture intensity regardless of pointer
    // device sample rate.
    const rawLast = { x: 0, y: 0, dx: 0, dy: 0, t: 0 };
    let rawSpeed = 0;     // peak normalised-units/sec, decays per frame
    let rawReversals = 0; // pending reversal bumps, drained per frame

    const onPointerMove = (e: PointerEvent) => {
      const r = container.getBoundingClientRect();
      const sample = sampleCoalescedPointer(e);
      const nx = (sample.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (sample.clientY - (r.top + r.height / 2)) / (r.height / 2);
      ptr.tx = Math.max(-1.4, Math.min(1.4, nx));
      ptr.ty = Math.max(-1.4, Math.min(1.4, ny));
      ptr.active = true;

      const now = e.timeStamp || performance.now();
      if (rawLast.t > 0) {
        const rdt = Math.max(0.001, (now - rawLast.t) / 1000);
        const rdx = nx - rawLast.x;
        const rdy = ny - rawLast.y;
        const rspd = Math.hypot(rdx, rdy) / rdt;
        if (rspd > rawSpeed) rawSpeed = rspd;
        const rdot = rdx * rawLast.dx + rdy * rawLast.dy;
        // Reversal: direction flipped between events while moving briskly.
        if (rdot < 0 && rspd > 0.8) rawReversals += 1;
        rawLast.dx = rdx;
        rawLast.dy = rdy;
      }
      rawLast.x = nx;
      rawLast.y = ny;
      rawLast.t = now;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Animation state.
    const fission: FissionState = makeFissionState();
    let smoothSpeed = 0;
    let cursorAngle = 0;
    const t0 = performance.now();
    let lastT = t0;
    let rafId = 0;

    // Dev-only diagnostic: ?frametiming in the URL logs average dt per
    // second to the console so we can compare actual RAF rates across
    // browsers. Used to diagnose the Chrome over-reactivity report -
    // see scripts/cross-browser-audit.md (Issue F.2).
    const frameTiming =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('frametiming');
    let ftFrames = 0;
    let ftAccumMs = 0;
    let ftLastReport = performance.now();

    const frame = (now: number) => {
      const dt = Math.max(0.001, Math.min(0.05, (now - lastT) / 1000));
      lastT = now;
      const t = (now - t0) / 1000;
      if (frameTiming) {
        ftFrames++;
        ftAccumMs += dt * 1000;
        if (now - ftLastReport >= 1000) {
          const avgMs = ftAccumMs / ftFrames;
          const avgHz = 1000 / avgMs;
          // eslint-disable-next-line no-console
          console.log(
            `[NucleusHero] ${ftFrames} frames in ${(now - ftLastReport).toFixed(0)}ms · ` +
            `avg dt ${avgMs.toFixed(2)}ms · ~${avgHz.toFixed(1)} Hz`,
          );
          ftFrames = 0;
          ftAccumMs = 0;
          ftLastReport = now;
        }
      }

      // Resolve isotope-driven gates per frame (ref read, no re-mount).
      const { fastSpeed: FAST_SPEED, requiredT: REQUIRED_T, shakeNeeded: SHAKE_NEEDED } =
        isotopeToGates(isotopeRef.current);

      // Ease cursor toward target; track velocity.
      const px = ptr.x, py = ptr.y;
      ptr.x += (ptr.tx - ptr.x) * 0.10;
      ptr.y += (ptr.ty - ptr.y) * 0.10;
      ptr.vx = (ptr.x - px) / dt;
      ptr.vy = (ptr.y - py) / dt;
      ptr.speed = Math.hypot(ptr.vx, ptr.vy);
      smoothSpeed += (ptr.speed - smoothSpeed) * 0.18;

      // Drain raw input signals captured between frames; decay raw peak speed
      // (~100 ms half-life) so a single brisk flick doesn't latch indefinitely.
      rawSpeed *= Math.pow(0.5, dt * 10);
      const reversalsThisFrame = rawReversals;
      rawReversals = 0;
      const effectiveSpeed = Math.max(smoothSpeed, rawSpeed);

      ctx.clearRect(0, 0, W, H);
      if (!polylines.length || !bbox) {
        rafId = requestAnimationFrame(frame);
        return;
      }

      drawFrame({
        ctx, W, H, t, dt,
        ptr, smoothSpeed, effectiveSpeed, reversalsThisFrame,
        cursorAngleRef: { get: () => cursorAngle, set: v => { cursorAngle = v; } },
        polylines, bbox,
        fission,
        FAST_SPEED, REQUIRED_T, SHAKE_NEEDED,
        reduced: prefersReduced,
      });

      stepAndDrawParticles(ctx, fission, dt, H);

      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      ro.disconnect();
    };
    // paths is stable across the page lifetime (imported JSON);
    // isotope is read through a ref so it never re-runs this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths]);

  return (
    <div className="hero-icon" ref={containerRef}>
      <canvas ref={canvasRef} />
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// drawFrame - extracted to keep the effect compact. Identical math to the
// canonical vite-port: state machine, half geometry, per-loop drawing.
// ─────────────────────────────────────────────────────────────────────────

interface DrawFrameArgs {
  ctx: CanvasRenderingContext2D;
  W: number; H: number;
  t: number; dt: number;
  ptr: { x: number; y: number; vx: number; vy: number };
  smoothSpeed: number;
  effectiveSpeed: number;
  reversalsThisFrame: number;
  cursorAngleRef: { get: () => number; set: (v: number) => void };
  polylines: Polyline[];
  bbox: BBox;
  fission: FissionState;
  FAST_SPEED: number;
  REQUIRED_T: number;
  SHAKE_NEEDED: number;
  reduced: boolean;
}

function drawFrame(a: DrawFrameArgs): void {
  const { ctx, W, H, t, dt, ptr, smoothSpeed, polylines, bbox, fission, reduced } = a;
  const ccx = W * 0.5, ccy = H * 0.5;
  const fieldR = Math.min(W, H) * TUNING.fieldRFrac;
  const restR = fieldR * TUNING.restRFrac;
  const fit = (restR * 2) / bbox.size;

  const driftMul = reduced ? 0 : 1;
  const driftStrength = fieldR * TUNING.driftStrength * TUNING.strength * driftMul;
  const driftX = ptr.x * driftStrength;
  const driftY = ptr.y * driftStrength;

  const halfSrc = bbox.size / 2;
  const cuxSrc = ptr.x * halfSrc * 1.05;
  const cuySrc = ptr.y * halfSrc * 1.05;

  // Smoothed cursor angle (kept for parity with the canonical version).
  let cursorAngle = a.cursorAngleRef.get();
  const targetAng = Math.atan2(ptr.y, ptr.x);
  let da = targetAng - cursorAngle;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  cursorAngle += da * 0.12;
  a.cursorAngleRef.set(cursorAngle);

  const impulse = Math.min(1.4, smoothSpeed * 0.45);
  const breathe = reduced ? 1 : 1 + 0.012 * Math.sin(t * 0.7);
  const baseBulge = TUNING.baseBulge * TUNING.strength;
  const bulgeGain = baseBulge * (1 + impulse * 0.6);

  // ── Fission tension & state machine ────────────────────────────────────
  // Fission is a deliberate user-input easter egg, allowed even under
  // reduced-motion: the user must shake the cursor on purpose.
  // Speed gate uses effectiveSpeed (max of smoothed and raw event speed) so
  // brisk shakes from high-DPI / high-polling mice register past the
  // animation's smoothing. Reversals are sampled raw at the event level.
  const isFast = a.effectiveSpeed > a.FAST_SPEED;
  if (fission.cooldown > 0) fission.cooldown -= dt;
  const cursorR = Math.hypot(ptr.x, ptr.y);
  const nearCentre = cursorR < TUNING.triggerRadius;

  fission.shakeScore += a.reversalsThisFrame;
  fission.shakeScore = Math.max(0, fission.shakeScore - dt * 2.5);
  fission.lastVx = ptr.vx;
  fission.lastVy = ptr.vy;

  if (fission.phase === 'idle' && fission.cooldown <= 0) {
    if (isFast && nearCentre) fission.fastT += dt;
    else fission.fastT = Math.max(0, fission.fastT - dt * 1.2);
    const tA = Math.min(1, fission.fastT / a.REQUIRED_T);
    const tB = Math.min(1, fission.shakeScore / a.SHAKE_NEEDED);
    fission.tension = Math.min(tA, tB);
    if (fission.tension >= 1) {
      fission.phase = 'splitting';
      fission.pf = 0;
      const va = 0; // horizontal split, always
      fission.splitAng = va;
      fission.splitX = ccx + driftX;
      fission.splitY = ccy + driftY;
      spawnBurst(fission, fission.splitX, fission.splitY, va, 1.4);
    }
  } else if (fission.phase !== 'idle') {
    const phaseDur =
      fission.phase === 'splitting' ? TUNING.splitTime
      : fission.phase === 'bouncing' ? TUNING.bounceTime
      : fission.phase === 'split' ? TUNING.holdTime
      : TUNING.reformTime;
    fission.pf += dt / phaseDur;
    if (fission.pf >= 1) {
      fission.pf = 0;
      if (fission.phase === 'splitting') fission.phase = 'bouncing';
      else if (fission.phase === 'bouncing') fission.phase = 'split';
      else if (fission.phase === 'split') fission.phase = 'reforming';
      else if (fission.phase === 'reforming') {
        fission.phase = 'idle';
        fission.fastT = 0;
        fission.shakeScore = 0;
        fission.tension = 0;
        fission.cooldown = TUNING.cooldown;
      }
    }
  }

  // ── Half geometry ─────────────────────────────────────────────────────
  let sep = 0;
  let halfScale = 1;
  let squashX = 1;
  let squashY = 1;
  if (fission.phase === 'splitting') {
    const p = fission.pf;
    const e = 1 - Math.pow(1 - p, 3);
    sep = e * fieldR * TUNING.sepOvershoot;
    halfScale = 1 - e * (1 - TUNING.halfScaleRest);
  } else if (fission.phase === 'bouncing') {
    const p = fission.pf;
    const wobble = Math.cos(p * Math.PI * 1.7) * Math.exp(-p * 3.2);
    sep = fieldR * (TUNING.sepRest + (TUNING.sepOvershoot - TUNING.sepRest) * wobble);
    halfScale = TUNING.halfScaleRest;
    const pulseA = Math.exp(-Math.pow((p - 0.15) / 0.10, 2));
    const pulseB = 0.35 * Math.exp(-Math.pow((p - 0.55) / 0.12, 2));
    const sq = pulseA + pulseB;
    squashX = 1 - 0.22 * sq;
    squashY = 1 + 0.16 * sq;
  } else if (fission.phase === 'split') {
    sep = fieldR * TUNING.sepRest + Math.sin(t * 1.4) * fieldR * 0.010;
    halfScale = TUNING.halfScaleRest;
  } else if (fission.phase === 'reforming') {
    const p = fission.pf;
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    sep = (1 - e) * fieldR * TUNING.sepRest;
    halfScale = TUNING.halfScaleRest + e * (1 - TUNING.halfScaleRest);
    const merge = Math.exp(-Math.pow((p - 0.85) / 0.08, 2));
    squashX = 1 + 0.10 * merge;
    squashY = 1 - 0.06 * merge;
  }

  type Half = { ox: number; oy: number; scale: number; sx: number; sy: number };
  const halves: Half[] = fission.phase === 'idle'
    ? [{ ox: 0, oy: 0, scale: 1, sx: 1, sy: 1 }]
    : [
        { ox: Math.cos(fission.splitAng) *  sep, oy: Math.sin(fission.splitAng) *  sep, scale: halfScale, sx: squashX, sy: squashY },
        { ox: Math.cos(fission.splitAng) * -sep, oy: Math.sin(fission.splitAng) * -sep, scale: halfScale, sx: squashX, sy: squashY },
      ];

  // ── Particle bursts driven by phase ───────────────────────────────────
  if (fission.phase === 'splitting') {
    fission.splitX = ccx + driftX;
    fission.splitY = ccy + driftY;
    spawnBurst(fission, fission.splitX, fission.splitY, fission.splitAng, 0.04 + fission.pf * 0.06);
  } else if (fission.phase === 'bouncing') {
    if (!fission.bouncedImpact && fission.pf >= 0.12) {
      fission.bouncedImpact = true;
      const halfRadius = fieldR * TUNING.restRFrac * TUNING.halfScaleRest;
      const sxAng = fission.splitAng;
      spawnBurst(fission, ccx + driftX +  (sep + halfRadius), ccy + driftY, sxAng, 0.45);
      spawnBurst(fission, ccx + driftX - (sep + halfRadius), ccy + driftY, sxAng + Math.PI, 0.45);
    }
  }
  if (fission.phase !== 'bouncing') fission.bouncedImpact = false;

  // ── Soft circular rim squish (tanh) ───────────────────────────────────
  const squish = (x: number, y: number): [number, number] => {
    const rx = x - ccx, ry = y - ccy;
    const r = Math.hypot(rx, ry);
    if (r < 1e-3) return [x, y];
    const r2 = fieldR * Math.tanh(r / fieldR);
    const k = r2 / r;
    return [ccx + rx * k, ccy + ry * k];
  };

  // ── Draw nucleus polylines ────────────────────────────────────────────
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const N = polylines.length;

  for (let hi = 0; hi < halves.length; hi++) {
    const Hh = halves[hi];
    const halfFit = fit * Hh.scale;
    const halfBreathe = reduced
      ? 1
      : breathe * (1 + (hi ? -0.01 : 0.01) * Math.sin(t * 1.7));

    for (let li = 0; li < N; li++) {
      const L = polylines[li];
      const pts = L.pts;
      const n = L.n;
      const depth = li / (N - 1);

      const alpha = 0.38 + 0.55 * (1 - depth);
      const width = 0.42 + 0.55 * (1 - depth);
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.strokeStyle = '#0d1a1e';

      const jx = reduced ? 0 : 0.18 * Math.sin(t * 0.43 + li * 0.91);
      const jy = reduced ? 0 : 0.18 * Math.cos(t * 0.37 + li * 0.71);

      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        let dx = pts[k * 2] - bbox.cx;
        let dy = pts[k * 2 + 1] - bbox.cy;

        const ddx = dx - cuxSrc;
        const ddy = dy - cuySrc;
        const distSq = ddx * ddx + ddy * ddy;
        const sigma = halfSrc * 0.50;
        const g = Math.exp(-distSq / (2 * sigma * sigma));
        const distLen = Math.sqrt(distSq) + 1e-3;
        const push = g * bulgeGain * halfSrc * 0.50;
        dx += (ddx / distLen) * push;
        dy += (ddy / distLen) * push;

        const dragScale = fission.phase === 'idle' ? 1 : 0.15;
        const drag = g * impulse * halfSrc * 0.18 * (0.4 + depth * 0.9) * dragScale;
        dx += ptr.vx * drag * 0.6;
        dy += ptr.vy * drag * 0.6;

        const wob = reduced
          ? 0
          : 0.0055 * Math.sin(t * 0.55 + li * 0.13 + k * 0.045);
        dx *= halfBreathe * (1 + wob);
        dy *= halfBreathe * (1 + wob);

        const xx = ccx + dx * halfFit * Hh.sx + driftX + Hh.ox + jx;
        const yy = ccy + dy * halfFit * Hh.sy + driftY + Hh.oy + jy;
        const [x, y] = squish(xx, yy);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}
