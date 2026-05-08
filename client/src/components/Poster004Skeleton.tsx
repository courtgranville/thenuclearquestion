/**
 * Poster 004 — Skeleton (v2).
 *
 * Renders all spokes once on mount and never re-renders. Each spoke
 * is a black dashed straight line; opacity is mutated per-spoke via
 * refs as state changes. The lines stay black throughout — only the
 * Pulses canvas overlay carries colour during cascades.
 *
 * Per-spoke opacity rules (all phase-driven, applied in one pass):
 *   - hub→X spoke:
 *       phase === DEFAULT                       → 0
 *       focusCarrier set and !== X              → DIM_OPACITY
 *       otherwise                                → 1
 *   - X→sector spoke:
 *       hasSeen[X] === false                    → 0
 *       focusCarrier set and !== X              → DIM_OPACITY
 *       otherwise                                → 1
 *
 * hasSeen is marked true at the start of CASCADE_FOCUS / CASCADE_ALL
 * for the cascading carrier(s), so sector spokes fade in with the
 * cascade rather than after it.
 *
 * Path registry: each spoke registers itself by id so the Pulses
 * canvas can call getPointAtLength on the SVGPathElement.
 */

import { memo, useEffect, useRef } from 'react';
import {
  CARRIERS,
  HUB_CX,
  HUB_CY,
  carrierCentre,
  sectorCentre,
  DIM_OPACITY,
  type CarrierId,
} from '@/lib/poster004Data';
import { poster004Store, type State } from '@/lib/poster004Store';

interface SpokeDef {
  id: string;
  carrierId: CarrierId;
  sectorId: string | null; // null = hub→carrier spoke
  d: string;
}

const HUB_TO_CARRIER_SPOKES: SpokeDef[] = CARRIERS.map((c) => {
  const cc = carrierCentre(c);
  return {
    id: `hub-${c.id}`,
    carrierId: c.id,
    sectorId: null,
    d: `M${HUB_CX} ${HUB_CY} L${cc.x} ${cc.y}`,
  };
});

const CARRIER_TO_SECTOR_SPOKES: SpokeDef[] = CARRIERS.flatMap((c) => {
  const cc = carrierCentre(c);
  return c.sectors.map((s) => {
    const sc = sectorCentre(c, s);
    return {
      id: `${c.id}-${s.id}`,
      carrierId: c.id,
      sectorId: s.id,
      d: `M${cc.x} ${cc.y} L${sc.x} ${sc.y}`,
    };
  });
});

const ALL_SPOKES: SpokeDef[] = [
  ...HUB_TO_CARRIER_SPOKES,
  ...CARRIER_TO_SECTOR_SPOKES,
];

const pathRegistry = new Map<string, SVGPathElement>();

export function getSpokePath(id: string): SVGPathElement | null {
  return pathRegistry.get(id) ?? null;
}

function spokeOpacity(spoke: SpokeDef, state: State): number {
  // Hub→carrier spoke: hidden in DEFAULT.
  if (spoke.sectorId === null && state.phase === 'DEFAULT') return 0;

  // Carrier→sector spoke: hidden until parent has been seen.
  if (
    spoke.sectorId !== null &&
    !state.hasSeenCarrier[spoke.carrierId]
  ) {
    return 0;
  }

  // Dim mask for non-focused branches.
  if (
    state.focusCarrier !== null &&
    state.focusCarrier !== spoke.carrierId
  ) {
    return DIM_OPACITY;
  }

  return 1;
}

const Poster004Skeleton = memo(function Poster004Skeleton() {
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});

  useEffect(() => {
    const apply = (state: State) => {
      for (const spoke of ALL_SPOKES) {
        const el = pathRefs.current[spoke.id];
        if (!el) continue;
        el.style.opacity = spokeOpacity(spoke, state).toFixed(3);
      }
    };
    apply(poster004Store.getState());
    return poster004Store.subscribe(apply);
  }, []);

  return (
    <g pointerEvents="none" data-layer="skeleton">
      {/* Hub → carrier spokes: slightly heavier visual weight. */}
      <g
        stroke="#0D1A1E"
        strokeOpacity={0.4}
        strokeWidth={0.6}
        strokeDasharray="3 4"
        fill="none"
      >
        {HUB_TO_CARRIER_SPOKES.map((s) => (
          <path
            key={s.id}
            d={s.d}
            ref={(el) => {
              pathRefs.current[s.id] = el;
              if (el) pathRegistry.set(s.id, el);
              else pathRegistry.delete(s.id);
            }}
            style={{
              opacity: 0,
              transition: 'opacity 200ms ease',
            }}
          />
        ))}
      </g>

      {/* Carrier → sector spokes: thinner. */}
      <g
        stroke="#0D1A1E"
        strokeOpacity={0.3}
        strokeWidth={0.5}
        strokeDasharray="2 3"
        fill="none"
      >
        {CARRIER_TO_SECTOR_SPOKES.map((s) => (
          <path
            key={s.id}
            d={s.d}
            ref={(el) => {
              pathRefs.current[s.id] = el;
              if (el) pathRegistry.set(s.id, el);
              else pathRegistry.delete(s.id);
            }}
            style={{
              opacity: 0,
              transition: 'opacity 200ms ease',
            }}
          />
        ))}
      </g>
    </g>
  );
});

export default Poster004Skeleton;
