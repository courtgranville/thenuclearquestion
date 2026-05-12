import { useEffect, useRef, useState } from 'react';

type Props = {
  size?: number;
};

// Canvas 2D preview of the nucleus form at rest. Deliberately NOT
// Three.js - the homepage entrance must not pay the ~1 MB Three.js
// bundle cost just to advertise the room. Form points are dynamically
// imported only when the preview enters the viewport, and the render
// loop pauses when scrolled out of view. About 3,000 subsampled points
// (vs the room's 28-46k) signal "particle thing" without competing
// visually with the actual room.

type FormPointsModule = { default?: { positions: number[] }; positions?: number[] };

export default function FissionEntrancePreview({ size = 280 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inView, setInView] = useState(false);
  const [points, setPoints] = useState<Float32Array | null>(null);

  // IntersectionObserver to defer loading + animation until visible.
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => setInView(e.isIntersecting)),
      { threshold: 0.1 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  // Dynamic-load form points only when the canvas enters the viewport.
  useEffect(() => {
    if (!inView || points) return;
    let cancelled = false;
    import('@/assets/fission-form-points.json').then((mod) => {
      if (cancelled) return;
      const data = mod as FormPointsModule;
      const positions =
        (data.default && data.default.positions) || data.positions || [];
      const total = positions.length / 2;
      const stride = Math.max(1, Math.floor(total / 3000));
      const sampledLen = Math.ceil(total / stride);
      const sampled = new Float32Array(sampledLen * 2);
      let j = 0;
      for (let i = 0; i < positions.length; i += stride * 2) {
        sampled[j++] = positions[i];
        sampled[j++] = positions[i + 1];
      }
      setPoints(sampled);
    });
    return () => {
      cancelled = true;
    };
  }, [inView, points]);

  // Render loop. Paused when out of viewport. Honours reduced-motion.
  useEffect(() => {
    if (!inView || !points || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    // Form spans [-1, +1] in world units; scale 0.42 of canvas size
    // gives a comfortable margin.
    const scale = size * 0.42;
    let rafId = 0;
    const start = performance.now();

    const drawFrame = (now: number) => {
      const t = (now - start) / 1000;
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#ECE7DF';

      for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i + 1];
        const phase = i * 0.013;
        const breathX = reducedMotion ? 0 : Math.sin(t * 0.6 + phase) * 0.003;
        const breathY = reducedMotion ? 0 : Math.cos(t * 0.5 + phase * 1.3) * 0.003;
        const px = cx + (x + breathX) * scale;
        const py = cy - (y + breathY) * scale;
        ctx.fillRect(px, py, 1.5, 1.5);
      }

      if (!reducedMotion) rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [inView, points, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: 'block' }}
      aria-hidden="true"
    />
  );
}
