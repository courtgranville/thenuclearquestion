/**
 * Poster 004 — Pulses canvas overlay.
 *
 * A canvas sized and positioned to overlay the SVG viewport
 * exactly. Pointer-events: none — purely decorative. Subscribes to
 * the store via its RAF loop (no React re-renders).
 *
 * Each pulse is rendered as a luminous packet: a short trailing
 * gradient line plus a small filled head in the carrier's colour.
 * Background is the cream #ECE7DF, so colours that read luminous
 * against cream (the carrier accent palette) work directly without
 * compositing tricks.
 *
 * Wrapped in memo(); the only thing that re-renders is the canvas
 * pixels themselves, driven by the engine's pulse positions.
 */

import { memo, useEffect, useRef } from 'react';
import { DENDROGRAM_SIZE } from '@/lib/poster004Data';
import { poster004Store } from '@/lib/poster004Store';

const PULSE_HEAD_RADIUS = 4;
const PULSE_TAIL_LENGTH = 14;
const PULSE_TAIL_WIDTH = 3.5;

const Poster004Pulses = memo(function Poster004Pulses() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    let scale = 1;

    const resize = () => {
      const r = parent.getBoundingClientRect();
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(r.width * DPR));
      canvas.height = Math.max(1, Math.floor(r.height * DPR));
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      // The store's pulse coordinates are in dendrogram-space (920
      // × 920). Map that to the canvas's pixel space.
      scale = (r.width / DENDROGRAM_SIZE) * DPR;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    let raf = 0;
    const draw = () => {
      const state = poster004Store.getState();
      ctx.clearRect(0, 0, DENDROGRAM_SIZE, DENDROGRAM_SIZE);

      for (const p of state.activePulses) {
        const px = p.fromX + (p.toX - p.fromX) * p.progress;
        const py = p.fromY + (p.toY - p.fromY) * p.progress;

        // Tail direction = unit vector from origin toward head.
        const dx = (p.toX - p.fromX) / p.pathLength;
        const dy = (p.toY - p.fromY) / p.pathLength;
        const tailX = px - dx * PULSE_TAIL_LENGTH;
        const tailY = py - dy * PULSE_TAIL_LENGTH;

        // Trailing gradient — fades from transparent at tail to
        // full carrier colour at head.
        const grad = ctx.createLinearGradient(tailX, tailY, px, py);
        grad.addColorStop(0, hexToRgba(p.colour, 0));
        grad.addColorStop(1, hexToRgba(p.colour, 0.85));
        ctx.strokeStyle = grad;
        ctx.lineCap = 'round';
        ctx.lineWidth = PULSE_TAIL_WIDTH;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Head — filled circle at full saturation. Slight alpha
        // halo via a second wider, low-alpha disc for the
        // luminous-packet feel.
        ctx.fillStyle = hexToRgba(p.colour, 0.25);
        ctx.beginPath();
        ctx.arc(px, py, PULSE_HEAD_RADIUS * 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.colour;
        ctx.beginPath();
        ctx.arc(px, py, PULSE_HEAD_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
});

export default Poster004Pulses;

// ─────────────────────────────────────────────────────────────────────
// Tiny hex→rgba helper. Carrier hexes from the palette are always
// 7-char #rrggbb form, so the simple parse is sufficient here.
// ─────────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
