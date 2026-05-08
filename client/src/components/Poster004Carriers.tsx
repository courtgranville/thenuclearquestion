/**
 * Poster 004 — Carriers.
 *
 * Six carrier blobs + labels. Each blob's r ∝ √twh; current scale
 * (carrierScales × carrierPulseScales) applied via setAttribute on
 * an inner ref. Outer ref carries the translate to the carrier's
 * resting position.
 *
 * Hover targets in FULL and CARRIER_FOCUS — pointerEnter starts
 * carrier-focus, pointerLeave ends it. Touch tap mirrors hover for
 * mobile.
 *
 * In CARRIER_FOCUS, non-focused carriers and their labels fade to
 * DIM_OPACITY; the focused carrier stays at full opacity.
 *
 * Wrapped in memo(); no React re-renders during animations.
 */

import { memo, useEffect, useRef } from 'react';
import {
  CARRIERS,
  carrierCentre,
  carrierRadius,
  type CarrierId,
} from '@/lib/poster004Data';
import { poster004Store, type State } from '@/lib/poster004Store';
import {
  startCarrierFocus,
  endCarrierFocus,
  DIM_OPACITY,
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
      for (const c of CARRIERS) {
        const blob = blobRefs.current[c.id];
        const group = groupRefs.current[c.id];
        const label = labelRefs.current[c.id];

        const baseScale = state.carrierScales[c.id];
        const pulseScale = state.carrierPulseScales[c.id];
        const totalScale = baseScale * pulseScale;

        if (blob) {
          blob.setAttribute(
            'transform',
            `scale(${totalScale.toFixed(4)})`,
          );
        }

        // Opacity rules.
        const inFocus = state.phase === 'CARRIER_FOCUS';
        const isFocused = state.hoveredCarrier === c.id;
        const groupOpacity = inFocus && !isFocused ? DIM_OPACITY : 1;
        const labelOpacity = inFocus && !isFocused ? 0 : 1;

        if (group) {
          group.style.opacity = groupOpacity.toFixed(3);
          // Hide the carrier entirely in DEFAULT — show from
          // CASCADE_1 onwards. Pointer events also disabled in
          // STATIC and during cascades (only enabled in FULL/FOCUS).
          group.style.pointerEvents =
            state.phase === 'FULL' || state.phase === 'CARRIER_FOCUS'
              ? 'auto'
              : 'none';
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
        return (
          <g
            key={c.id}
            ref={(el) => {
              groupRefs.current[c.id] = el;
            }}
            transform={`translate(${cc.x} ${cc.y})`}
            onPointerEnter={() => startCarrierFocus(c.id)}
            onPointerLeave={() => endCarrierFocus()}
            onClick={() => {
              // Touch fallback: tap toggles focus.
              const state = poster004Store.getState();
              if (
                state.phase === 'CARRIER_FOCUS' &&
                state.hoveredCarrier === c.id
              ) {
                endCarrierFocus();
              } else {
                startCarrierFocus(c.id);
              }
            }}
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
