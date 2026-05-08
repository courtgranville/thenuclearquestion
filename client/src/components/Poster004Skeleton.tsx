/**
 * Poster 004 — Skeleton (dashed spokes).
 *
 * Renders two groups of paths once on mount and never re-renders:
 *   - hub → carrier (6 paths)
 *   - carrier → sector (~70 paths)
 *
 * Subscribes to the store for VISIBILITY only — applies opacity
 * changes via direct DOM mutation through refs. The actual path
 * geometry is computed once at module scope from poster004Data.
 *
 * Exposes a path registry through the global module so the Pulses
 * canvas (commit 5) can call getPointAtLength on real SVG path
 * elements. For straight-line spokes the registry is currently
 * cosmetic — the engine's straight-line interpolation gives the
 * same result — but using the SVG paths keeps the door open for
 * curved spokes in a polish pass without re-wiring the engine.
 */

import { memo, useEffect, useMemo, useRef } from 'react';
import {
  CARRIERS,
  HUB_CX,
  HUB_CY,
  carrierCentre,
  sectorCentre,
} from '@/lib/poster004Data';
import { poster004Store } from '@/lib/poster004Store';

interface SpokeDef {
  id: string;
  d: string;
}

const HUB_TO_CARRIER_SPOKES: SpokeDef[] = CARRIERS.map((c) => {
  const cc = carrierCentre(c);
  return {
    id: `hub-${c.id}`,
    d: `M${HUB_CX} ${HUB_CY} L${cc.x} ${cc.y}`,
  };
});

const CARRIER_TO_SECTOR_SPOKES: SpokeDef[] = CARRIERS.flatMap((c) => {
  const cc = carrierCentre(c);
  return c.sectors.map((s) => {
    const sc = sectorCentre(c, s);
    return {
      id: `${c.id}-${s.id}`,
      d: `M${cc.x} ${cc.y} L${sc.x} ${sc.y}`,
    };
  });
});

// ─────────────────────────────────────────────────────────────────────
// Path registry — keyed by spoke id so the Pulses overlay (commit 5)
// or future curved-spoke variant can use real getPointAtLength.
// Populated by ref callbacks in render and cleared on unmount.
// ─────────────────────────────────────────────────────────────────────

const pathRegistry = new Map<string, SVGPathElement>();

export function getSpokePath(id: string): SVGPathElement | null {
  return pathRegistry.get(id) ?? null;
}

// Visibility rules per phase. Each tuple is
// [hub→carrier opacity, carrier→sector opacity].
function spokeOpacities(phase: ReturnType<typeof poster004Store.getState>['phase']): [number, number] {
  switch (phase) {
    case 'DEFAULT':
      return [0, 0];
    case 'CASCADE_1':
      return [1, 0];
    case 'CARRIERS_ONLY':
      return [1, 0];
    case 'CASCADE_2':
      return [1, 1];
    case 'FULL':
    case 'CARRIER_FOCUS':
    case 'STATIC':
      return [1, 1];
  }
}

const Poster004Skeleton = memo(function Poster004Skeleton() {
  const hubGroupRef = useRef<SVGGElement | null>(null);
  const sectorGroupRef = useRef<SVGGElement | null>(null);

  // useMemo so the JSX path arrays are stable across re-renders.
  const hubSpokes = useMemo(() => HUB_TO_CARRIER_SPOKES, []);
  const sectorSpokes = useMemo(() => CARRIER_TO_SECTOR_SPOKES, []);

  useEffect(() => {
    const apply = (state: ReturnType<typeof poster004Store.getState>) => {
      const [hubOp, sectorOp] = spokeOpacities(state.phase);
      if (hubGroupRef.current) {
        hubGroupRef.current.style.opacity = hubOp.toFixed(3);
      }
      if (sectorGroupRef.current) {
        sectorGroupRef.current.style.opacity = sectorOp.toFixed(3);
      }
    };
    apply(poster004Store.getState());
    return poster004Store.subscribe(apply);
  }, []);

  return (
    <g pointerEvents="none">
      <g
        ref={hubGroupRef}
        data-spokes="hub-to-carrier"
        stroke="#0D1A1E"
        strokeOpacity={0.35}
        strokeWidth={0.6}
        strokeDasharray="3 4"
        fill="none"
        style={{
          opacity: 0,
          transition: 'opacity 200ms ease',
        }}
      >
        {hubSpokes.map((s) => (
          <path
            key={s.id}
            d={s.d}
            ref={(el) => {
              if (el) pathRegistry.set(s.id, el);
              else pathRegistry.delete(s.id);
            }}
          />
        ))}
      </g>

      <g
        ref={sectorGroupRef}
        data-spokes="carrier-to-sector"
        stroke="#0D1A1E"
        strokeOpacity={0.25}
        strokeWidth={0.5}
        strokeDasharray="2 3"
        fill="none"
        style={{
          opacity: 0,
          transition: 'opacity 200ms ease',
        }}
      >
        {sectorSpokes.map((s) => (
          <path
            key={s.id}
            d={s.d}
            ref={(el) => {
              if (el) pathRegistry.set(s.id, el);
              else pathRegistry.delete(s.id);
            }}
          />
        ))}
      </g>
    </g>
  );
});

export default Poster004Skeleton;
