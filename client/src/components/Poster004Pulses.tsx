/**
 * Poster 004 — Pulses canvas overlay (v2).
 *
 * Canvas exact-overlaying the SVG, pointer-events: none. Own RAF
 * loop reads activePulses from the store directly (not via subscribe
 * — the loop runs every frame anyway).
 *
 * Each pulse is drawn as a luminous packet:
 *   1. A 14px-long linearGradient stroke from tail (transparent
 *      carrier colour) → head (full carrier colour @ alpha 0.85),
 *      lineWidth 3.5, lineCap round.
 *   2. A halo disc at head: alpha 0.25, radius 7.
 *   3. A bright disc at head: full carrier colour, radius 4.
 *
 * Pulse position resolved via Skeleton.getSpokePath(spokeId) +
 * SVGPathElement.getPointAtLength. If the spoke isn't registered
 * yet (mount race), falls back to linear interpolation between
 * pulse.fromX/Y and pulse.toX/Y.
 *
 * Court's brief: "the line stays black throughout — only the moving
 * pulse-tip is coloured." The black dashed lines are SVG paths in
 * the Skeleton; this canvas only paints the moving packets.
 */

import { memo, useEffect, useRef } from 'react';
import { DENDROGRAM_SIZE } from '@/lib/poster004Data';
import { poster004Store } from '@/lib/poster004Store';
import { getSpokePath } from '@/components/Poster004Skeleton';

const PULSE_HEAD_RADIUS = 4;
const PULSE_HALO_RADIUS = 7;
const PULSE_TAIL_LENGTH_PX = 14;
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

    const resize = () => {
      const r = parent.getBoundingClientRect();
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(r.width * DPR));
      canvas.height = Math.max(1, Math.floor(r.height * DPR));
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      // Map dendrogram-space (920×920) to canvas pixel space.
      const scale = (r.width / DENDROGRAM_SIZE) * DPR;
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
        // Resolve head + tail anchor via SVG path, falling back to
        // linear interpolation if the path isn't in the registry.
        const path = getSpokePath(p.spokeId);
        let headX: number;
        let headY: number;
        let tailX: number;
        let tailY: number;

        if (path) {
          const total = p.pathLength;
          const headDist = p.progress * total;
          const tailDist = Math.max(0, headDist - PULSE_TAIL_LENGTH_PX);
          const head = path.getPointAtLength(headDist);
          const tail = path.getPointAtLength(tailDist);
          headX = head.x;
          headY = head.y;
          tailX = tail.x;
          tailY = tail.y;
        } else {
          headX = p.fromX + (p.toX - p.fromX) * p.progress;
          headY = p.fromY + (p.toY - p.fromY) * p.progress;
          const dx = (p.toX - p.fromX) / p.pathLength;
          const dy = (p.toY - p.fromY) / p.pathLength;
          tailX = headX - dx * PULSE_TAIL_LENGTH_PX;
          tailY = headY - dy * PULSE_TAIL_LENGTH_PX;
        }

        // Tail gradient: transparent → carrier colour at head.
        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
        grad.addColorStop(0, hexToRgba(p.colour, 0));
        grad.addColorStop(1, hexToRgba(p.colour, 0.85));
        ctx.strokeStyle = grad;
        ctx.lineCap = 'round';
        ctx.lineWidth = PULSE_TAIL_WIDTH;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        // Halo disc.
        ctx.fillStyle = hexToRgba(p.colour, 0.25);
        ctx.beginPath();
        ctx.arc(headX, headY, PULSE_HALO_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Head disc.
        ctx.fillStyle = p.colour;
        ctx.beginPath();
        ctx.arc(headX, headY, PULSE_HEAD_RADIUS, 0, Math.PI * 2);
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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
