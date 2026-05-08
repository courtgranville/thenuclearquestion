/**
 * Poster 004 — Carriers (v2).
 *
 * Six carrier blobs + labels. Each blob is rendered once on mount;
 * scale, pulse-scale, and dim-opacity are mutated per-carrier via
 * refs. Wrapped in memo so React never re-renders it.
 *
 * Pointer handlers:
 *   - onPointerEnter ⇒ engine.enterCarrierFocus(id)
 *     (works in POST_HUB and during CASCADE_FOCUS for re-target)
 *   - onPointerLeave ⇒ engine.exitCarrierFocus()
 *     (debounced inside the engine — 300ms grace for cross-carrier hover)
 *   - onClick ⇒ touch fallback: toggle focus on this carrier
 *
 * Under focusCarrier !== this carrier:
 *   - The blob group fades to DIM_OPACITY (0.03)
 *   - The label fades to 0
 */

import { memo, useEffect, useRef } from 'react';
import {
  CARRIERS,
  carrierCentre,
  carrierRadius,
  DIM_OPACITY,
  type CarrierId,
} from '@/lib/poster004Data';
import { poster004Store, type State } from '@/lib/poster004Store';
import {
  enterCarrierFocus,
  exitCarrierFocus,
} from '@/lib/poster004Engine';

const Poster004Carriers = memo(function Poster004Carriers() {
  const blobRefs = useRef<Record<CarrierId, SVGGElement | null>>(
    {} as Record<CarrierId, SVGGElement | null>,
  );
  const groupRefs = useRef<Record<CarrierId, SVGGElement | null>>(
    {} as Record<CarrierId, SVGGElement | null>,
  );
  const labelRefs = useRef<Record<CarrierId, SVGTextElement | null>>(
    {} as Record<CarrierId, SVGTextElement | null>,
  );

  useEffect(() => {
    const apply = (state: State) => {
      const focused = state.focusCarrier;
      const interactive =
        state.phase === 'POST_HUB' || state.phase === 'CASCADE_FOCUS';

      for (const c of CARRIERS) {
        const blob = blobRefs.current[c.id];
        const group = groupRefs.current[c.id];
        const label = labelRefs.current[c.id];

        const totalScale =
          state.carrierScales[c.id] * state.carrierPulseScales[c.id];

        if (blob) {
          blob.setAttribute(
            'transform',
            `scale(${totalScale.toFixed(4)})`,
          );
        }

        const dim = focused !== null && focused !== c.id;
        const groupOpacity = dim ? DIM_OPACITY : 1;
        const labelOpacity = dim ? 0 : 1;

        if (group) {
          group.style.opacity = groupOpacity.toFixed(3);
          group.style.pointerEvents = interactive ? 'auto' : 'none';
        }
        if (label) {
          label.style.opacity = labelOpacity.toFixed(3);
        }
      }
    };
    apply(poster004Store.getState());
    return poster004Store.subscribe(apply);
  }, []);

  return (
    <g data-layer="carriers">
      {CARRIERS.map((c) => {
        const cc = carrierCentre(c);
        const r = carrierRadius(c.twh);
        const handleEnter = () => enterCarrierFocus(c.id);
        const handleLeave = () => exitCarrierFocus();
        const handleClick = () => {
          // Touch fallback: tap toggles focus.
          const state = poster004Store.getState();
          if (state.focusCarrier === c.id) {
            exitCarrierFocus();
          } else {
            enterCarrierFocus(c.id);
          }
        };

        return (
          <g
            key={c.id}
            ref={(el) => {
              groupRefs.current[c.id] = el;
            }}
            transform={`translate(${cc.x} ${cc.y})`}
            onPointerEnter={handleEnter}
            onPointerLeave={handleLeave}
            onClick={handleClick}
            style={{
              cursor: 'pointer',
              opacity: 1,
              transition: 'opacity 200ms ease',
            }}
          >
            <g
              ref={(el) => {
                blobRefs.current[c.id] = el;
              }}
            >
              <circle r={r} fill={c.colour} />
            </g>
            <text
              ref={(el) => {
                labelRefs.current[c.id] = el;
              }}
              y={r + 18}
              textAnchor="middle"
              fill="#0D1A1E"
              style={{
                fontFamily: "'Playfair', Georgia, serif",
                fontSize: 12,
                pointerEvents: 'none',
                transition: 'opacity 200ms ease',
              }}
            >
              {c.label}
              <tspan x="0" dy="14" style={{ fontSize: 10, opacity: 0.7 }}>
                {c.twh} TWh
              </tspan>
            </text>
          </g>
        );
      })}
    </g>
  );
});

export default Poster004Carriers;
