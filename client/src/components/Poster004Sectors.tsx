/**
 * Poster 004 — Sectors.
 *
 * ~70 sector dots, grouped by parent carrier. Each dot's r ∝ √twh
 * with a 2px floor so 0.1 TWh sectors stay visible/clickable. Per-
 * sector scale (0..1) applied via setAttribute on each dot's group
 * ref — drives the cascade-2 grow-on-arrival animation.
 *
 * In CARRIER_FOCUS, only the focused carrier's branch retains full
 * opacity; other branches' dots fade to DIM_OPACITY and labels fade
 * to 0%.
 *
 * Wrapped in memo(). No interaction handlers — sectors are passive
 * targets the user reads. Hover for sector tooltips can be a polish
 * item.
 */

import { memo, useEffect, useRef } from 'react';
import {
  CARRIERS,
  sectorCentre,
  sectorRadius,
} from '@/lib/poster004Data';
import { poster004Store, type State } from '@/lib/poster004Store';
import { DIM_OPACITY } from '@/lib/poster004Engine';

const Poster004Sectors = memo(function Poster004Sectors() {
  const dotRefs = useRef<Record<string, SVGGElement | null>>({});
  const labelRefs = useRef<Record<string, SVGTextElement | null>>({});

  useEffect(() => {
    const apply = (state: State) => {
      const inFocus = state.phase === 'CARRIER_FOCUS';
      for (const c of CARRIERS) {
        const branchFocused = state.hoveredCarrier === c.id;
        const dotOpacity = inFocus && !branchFocused ? DIM_OPACITY : 1;
        const labelOpacity = inFocus && !branchFocused ? 0 : 1;

        for (const s of c.sectors) {
          const dot = dotRefs.current[s.id];
          const label = labelRefs.current[s.id];
          const scale = state.sectorScales[s.id];

          if (dot) {
            dot.setAttribute(
              'transform',
              `scale(${scale.toFixed(4)})`,
            );
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
          // Label sits outside the dot in the radial direction
          // (same angle as the spoke). Position computed once at
          // render time; angle is stored on the sector.
          const labelOffset = r + 6;
          const lx = Math.cos(s.angle) * labelOffset;
          const ly = -Math.sin(s.angle) * labelOffset;
          // Right of dot ⇒ left-anchored text; left of dot ⇒ right-
          // anchored. This keeps labels from running into their dots.
          const textAnchor =
            Math.cos(s.angle) >= 0 ? 'start' : 'end';

          return (
            <g
              key={s.id}
              transform={`translate(${sc.x} ${sc.y})`}
              style={{ transition: 'opacity 200ms ease' }}
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
                  fontSize: 9,
                  opacity: 1,
                  transition: 'opacity 200ms ease',
                }}
              >
                {s.label} {s.twh} TWh
              </text>
            </g>
          );
        }),
      )}
    </g>
  );
});

export default Poster004Sectors;
