import type { FissionState, Particle } from './fission';
import { TUNING } from './fission';

const { burstColors, maxParticles, burstCount } = TUNING;

export function spawnBurst(
  state: FissionState,
  x: number, y: number,
  ang: number,
  intensity = 1,
): void {
  const N = Math.floor(burstCount * intensity);
  const room = maxParticles - state.particles.length;
  const count = Math.min(N, Math.max(0, room));
  for (let i = 0; i < count; i++) {
    const radial = Math.random() < 0.55;
    const a = radial
      ? Math.random() * Math.PI * 2
      : ang + (Math.random() - 0.5) * 1.4 + (Math.random() < 0.5 ? 0 : Math.PI);
    const speed = 120 + Math.random() * 1080;
    const ci = Math.min(
      burstColors.length - 1,
      Math.floor(Math.pow(Math.random(), 1.6) * burstColors.length),
    );
    state.particles.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 1,
      maxLife: 1.6 + Math.random() * 2.6,
      size: 0.7 + Math.random() * 1.8,
      ci,
    });
  }
}

/**
 * Step + draw all particles. Mutates state.particles (compaction).
 * Batched fills (one path per color) for performance.
 */
export function stepAndDrawParticles(
  ctx: CanvasRenderingContext2D,
  state: FissionState,
  dt: number,
  H: number,
): void {
  if (state.particles.length === 0) return;
  const GRAVITY = TUNING.particleGravity;
  const FLOOR = H - 1;
  const NC = burstColors.length;
  const fullPaths: (Path2D | null)[] = new Array(NC).fill(null);
  const fadeList: Particle[] = [];

  const arr = state.particles;
  let write = 0;
  for (let i = 0; i < arr.length; i++) {
    const p = arr[i];
    p.vy += GRAVITY * dt;
    p.vx *= Math.pow(0.78, dt);
    p.vy *= Math.pow(0.985, dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y > FLOOR) {
      p.y = FLOOR;
      p.vy = -p.vy * 0.28;
      p.vx *= 0.55;
      if (Math.abs(p.vy) < 12) p.vy = 0;
    }
    p.life -= dt / p.maxLife;
    if (p.life <= 0) continue;
    arr[write++] = p;
    if (p.life > 0.3) {
      let path = fullPaths[p.ci];
      if (!path) {
        path = new Path2D();
        fullPaths[p.ci] = path;
      }
      path.moveTo(p.x + p.size, p.y);
      path.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    } else {
      fadeList.push(p);
    }
  }
  arr.length = write;

  ctx.globalAlpha = 1;
  for (let c = 0; c < NC; c++) {
    const path = fullPaths[c];
    if (!path) continue;
    ctx.fillStyle = burstColors[c];
    ctx.fill(path);
  }
  for (let i = 0; i < fadeList.length; i++) {
    const p = fadeList[i];
    ctx.globalAlpha = p.life / 0.3;
    ctx.fillStyle = burstColors[p.ci];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
