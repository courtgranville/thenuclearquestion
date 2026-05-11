import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ANCHOR_FRACTIONS,
  SCENARIOS,
  snapFraction,
} from '@/lib/poster003Data';

/**
 * Poster 003 - three-stop scenario slider.
 *
 * Continuous drag, snap on release. Anchors at 0 / 0.5 / 1 - the
 * fraction is a track position, not a linear nuclear-share scale
 * (tick LABELS show the actual shares 14% / 30% / 70%).
 *
 * Numerical readouts above and below the slider live in the parent;
 * this component only emits the fraction (continuous) and the
 * commit-anchor (post-snap).
 */

export interface Poster003SliderProps {
  /** Controlled value, 0 - 1. */
  value: number;
  /** Called continuously during drag and on snap-end. */
  onChange: (fraction: number) => void;
  /** Called once when the slider settles after release. */
  onCommit?: (anchor: 's1' | 's2' | 's3') => void;
  /** Called when drag begins / ends (used by parent to gate the dots flip). */
  onDragStateChange?: (dragging: boolean) => void;
}

const TICKS: { id: 's1' | 's2' | 's3'; fraction: number; label: string; sub: string }[] = [
  { id: 's1', fraction: ANCHOR_FRACTIONS.s1, label: "Today's mix", sub: '14% nuclear' },
  { id: 's2', fraction: ANCHOR_FRACTIONS.s2, label: '30% nuclear', sub: '' },
  { id: 's3', fraction: ANCHOR_FRACTIONS.s3, label: '70% nuclear', sub: '' },
];

const SNAP_DURATION_MS = 250;

// Cubic in-out ease - serious register (no overshoot, no spring).
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function Poster003Slider({
  value,
  onChange,
  onCommit,
  onDragStateChange,
}: Poster003SliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  // Track ID of the active pointer so multitouch can't desync.
  const activePointerRef = useRef<number | null>(null);
  // Animation handle for snap-on-release.
  const rafRef = useRef<number | null>(null);

  // Notify parent when drag state changes (used by dots layer).
  useEffect(() => {
    onDragStateChange?.(dragging);
  }, [dragging, onDragStateChange]);

  const cancelSnapAnim = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelSnapAnim(), [cancelSnapAnim]);

  const fractionFromClientX = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const r = track.getBoundingClientRect();
    if (r.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  }, []);

  // Animate the value from `from` to `to` over SNAP_DURATION_MS ms,
  // calling onChange each frame and onCommit at the end.
  const animateSnap = useCallback(
    (from: number, to: number, anchorId: 's1' | 's2' | 's3') => {
      cancelSnapAnim();
      const t0 = performance.now();
      const tick = (now: number) => {
        const elapsed = now - t0;
        const tt = Math.min(1, elapsed / SNAP_DURATION_MS);
        const eased = easeInOutCubic(tt);
        const v = from + (to - from) * eased;
        onChange(v);
        if (tt < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          onCommit?.(anchorId);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [cancelSnapAnim, onChange, onCommit],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerRef.current !== null) return;
      activePointerRef.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      cancelSnapAnim();
      setDragging(true);
      onChange(fractionFromClientX(e.clientX));
    },
    [cancelSnapAnim, fractionFromClientX, onChange],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerRef.current !== e.pointerId) return;
      onChange(fractionFromClientX(e.clientX));
    },
    [fractionFromClientX, onChange],
  );

  const finishDrag = useCallback(
    (currentValue: number) => {
      const target = snapFraction(currentValue);
      const anchorId =
        target === 0 ? 's1' : target === 0.5 ? 's2' : 's3';
      setDragging(false);
      animateSnap(currentValue, target, anchorId);
    },
    [animateSnap],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerRef.current !== e.pointerId) return;
      activePointerRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // releasePointerCapture can throw if the pointer was already lost.
      }
      finishDrag(fractionFromClientX(e.clientX));
    },
    [finishDrag, fractionFromClientX],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerRef.current !== e.pointerId) return;
      activePointerRef.current = null;
      // Snap to current location.
      finishDrag(value);
    },
    [finishDrag, value],
  );

  // ─── Keyboard ───────────────────────────────────────────────────
  // Discrete step between anchors. No continuous keyboard drag.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const currentTickIdx =
        value < 0.25 ? 0 : value < 0.75 ? 1 : 2;
      let nextIdx = currentTickIdx;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        nextIdx = Math.min(2, currentTickIdx + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        nextIdx = Math.max(0, currentTickIdx - 1);
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = 2;
      } else {
        return;
      }
      e.preventDefault();
      if (nextIdx === currentTickIdx) return;
      const target = TICKS[nextIdx].fraction;
      const anchorId = TICKS[nextIdx].id;
      animateSnap(value, target, anchorId);
    },
    [animateSnap, value],
  );

  // ─── Render ──────────────────────────────────────────────────────

  const thumbPct = useMemo(() => `${(value * 100).toFixed(3)}%`, [value]);
  const activeAnchor = useMemo(() => {
    if (value < 0.25) return 's1';
    if (value < 0.75) return 's2';
    return 's3';
  }, [value]);
  const activeScenario = SCENARIOS.find((s) => s.id === activeAnchor)!;

  return (
    <div className="w-full select-none">
      {/* Track region */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Nuclear share scenario"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={
          activeAnchor === 's1' ? 0 : activeAnchor === 's2' ? 1 : 2
        }
        aria-valuetext={`${activeScenario.label} (${activeScenario.nuclearSharePct}% nuclear)`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="relative w-full cursor-pointer touch-none"
        style={{
          height: 32,
          padding: '12px 12px',
          outline: 'none',
        }}
      >
        {/* Track base */}
        <div
          className="absolute left-3 right-3 top-1/2 -translate-y-1/2 rounded-full"
          style={{
            height: 8,
            backgroundColor: 'rgba(125, 115, 106, 0.35)',
          }}
        />
        {/* Active section (left of thumb) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: 12,
            width: `calc((100% - 24px) * ${value})`,
            height: 8,
            backgroundColor: '#0D1A1E',
            transition: dragging ? 'none' : 'width 0s',
          }}
        />
        {/* Tick markers */}
        {TICKS.map((tick) => (
          <div
            key={tick.id}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full"
            style={{
              left: `calc(12px + (100% - 24px) * ${tick.fraction})`,
              width: 4,
              height: 16,
              backgroundColor: '#0D1A1E',
              opacity: value >= tick.fraction - 0.001 ? 1 : 0.5,
            }}
          />
        ))}
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full"
          style={{
            left: `calc(12px + (100% - 24px) * ${value})`,
            width: 20,
            height: 20,
            backgroundColor: '#0D1A1E',
            boxShadow: focused
              ? '0 0 0 3px rgba(13,26,30,0.18)'
              : '0 1px 3px rgba(13,26,30,0.25)',
            transition: dragging ? 'none' : 'box-shadow 200ms',
          }}
        />
      </div>

      {/* Tick labels - endpoint labels anchor to the inside of their
          tick (left fans right, right fans left) so they don't extend
          past the track and crowd the panel edge. */}
      <div className="relative w-full mt-2 px-3" style={{ height: 32 }}>
        {TICKS.map((tick) => {
          const isActive = activeAnchor === tick.id;
          const isFirst = tick.fraction === 0;
          const isLast = tick.fraction === 1;
          const transform = isFirst
            ? 'translateX(0)'
            : isLast
              ? 'translateX(-100%)'
              : 'translateX(-50%)';
          const textAlign: 'left' | 'right' | 'center' = isFirst
            ? 'left'
            : isLast
              ? 'right'
              : 'center';
          return (
            <div
              key={tick.id}
              className="absolute"
              style={{
                left: `calc(12px + (100% - 24px) * ${tick.fraction})`,
                top: 0,
                transform,
                textAlign,
                color: '#0D1A1E',
                fontFamily: "'Playfair', Georgia, serif",
                fontSize: 12,
                letterSpacing: '0.05em',
                opacity: isActive ? 1 : 0.55,
                fontWeight: isActive ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'opacity 200ms, font-weight 200ms',
              }}
            >
              <div>{tick.label}</div>
              {tick.sub && (
                <div style={{ opacity: 0.6, fontSize: 10, marginTop: 1 }}>
                  {tick.sub}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dev-only diagnostic */}
      {!import.meta.env.PROD && (
        <div
          className="mt-3 mx-auto inline-block"
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            color: '#0D1A1E',
            opacity: 0.55,
            padding: '2px 8px',
            border: '1px solid rgba(13,26,30,0.2)',
            borderRadius: 3,
            background: 'rgba(236,231,223,0.6)',
          }}
        >
          fraction={thumbPct} · anchor={activeAnchor} ·{' '}
          {dragging ? 'dragging' : 'idle'}
        </div>
      )}
    </div>
  );
}
