/**
 * Poster 004 — Sectors (v2).
 *
 * ~70 sector dots, grouped by parent carrier. Each dot's r ∝ √twh
 * with a 2px floor so 0.1 TWh sectors stay visible. Per-sector scale
 * (0..1) mutated via setAttribute on each dot's group ref.
 *
 * Under focusCarrier !== parent carrier:
 *   - Sector dot opacity → DIM_OPACITY (0.03)
 *   - Sector label opacity → 0
 *
 * Sector labels positioned outside each dot in the radial-outward
 * direction. textAnchor flips left/right so labels never collide
 * with their dots.
 *
 * No own pointer handlers — sectors are passive.
 */

import { memo, useEffect, useRef } from 'react';
import {
  CARRIERS,
  sectorCentre,
  sectorRadius,
  DIM_OPACITY,
} from '@/lib/poster004Data';
import { poster004Store, type State } from '@/lib/poster004Store';

const Poster004Sectors = memo(function Poster004Sectors() {
  const dotRefs = useRef<Record<string, SVGGElement | null>>({});
  const labelRefs = useRef<Record<string, SVGTextElement | null>>({});

  useEffect(() => {
    const apply = (state: State) => {
      const focused = state.focusCarrier;
      for (const c of CARRIERS) {
        const dim = focused !== null && focused !== c.id;
        const dotOpacity = dim ? DIM_OPACITY : 1;
        const labelOpacity = dim ? 0 : 1;
        for (const s of c.sectors) {
          const dot = dotRefs.current[s.id];
          const label = labelRefs.current[s.id];
          const scale = state.sectorScales[s.id];
          if (dot) {
            dot.setAttribute('transform', `scale(${scale.toFixed(4)})`);
            dot.style.opacity = dotOpacity.toFixed(3);
          }
          if (label) {
            label.style.opacity = labelOpacity.toFixed(3);
          }
        }
      }
    };
    apply(poster004Store.getState());
    return poster004Store.subscribe(apply);
  }, []);

  return (
    <g data-layer="sectors" pointerEvents="none">
      {CARRIERS.flatMap((c) =>
        c.sectors.map((s) => {
          const sc = sectorCentre(c, s);
          const r = sectorRadius(s.twh);
          const labelOffset = r + 6;
          const lx = Math.cos(s.angle) * labelOffset;
          const ly = -Math.sin(s.angle) * labelOffset;
          const textAnchor =
            Math.cos(s.angle) >= 0 ? 'start' : 'end';

          return (
            <g
              key={s.id}
              transform={`translate(${sc.x} ${sc.y})`}
            >
              <g
                ref={(el) => {
                  dotRefs.current[s.id] = el;
                }}
                style={{
                  opacity: 1,
                  transition: 'opacity 200ms ease',
                }}
              >
                <circle r={r} fill={c.colour} />
              </g>
              <text
                ref={(el) => {
                  labelRefs.current[s.id] = el;
                }}
                x={lx}
                y={ly}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fill="#0D1A1E"
                style={{
                  fontFamily: "'Playfair', Georgia, serif",
                  fontSize: 10,
                  opacity: 1,
                  transition: 'opacity 200ms ease',
                }}
              >
                {s.label}
                <tspan dx="4" style={{ opacity: 0.7 }}>
                  {s.twh} TWh
                </tspan>
              </text>
            </g>
          );
        }),
      )}
    </g>
  );
});

export default Poster004Sectors;
