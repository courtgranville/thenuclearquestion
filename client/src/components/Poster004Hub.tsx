/**
 * Poster 004 — Hub (v2).
 *
 * Centre form + label. Hover target in DEFAULT (starts CASCADE_HUB)
 * and POST_HUB (sustained hover starts CASCADE_ALL after a 700ms
 * threshold). Touch-tap mirrors hover for mobile.
 *
 * Subscribes to hubPulseScale (applies via transform: scale) and
 * phase (drives the sustained-hover timer logic).
 *
 * Hover instruction is rendered separately (Poster004HoverInstruction).
 */

import { memo, useEffect, useRef } from 'react';
import { HUB_CX, HUB_CY, HUB_RADIUS } from '@/lib/poster004Data';
import { poster004Store, type State } from '@/lib/poster004Store';
import {
  triggerHubCascade,
  triggerAllCascade,
  HOVER_EXTEND_THRESHOLD_MS,
} from '@/lib/poster004Engine';

const Poster004Hub = memo(function Poster004Hub() {
  const innerRef = useRef<SVGGElement | null>(null);
  const hoverActiveRef = useRef(false);
  const extendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPhaseRef = useRef<State['phase']>('DEFAULT');

  useEffect(() => {
    const cancelTimer = () => {
      if (extendTimerRef.current !== null) {
        clearTimeout(extendTimerRef.current);
        extendTimerRef.current = null;
      }
    };

    const apply = (state: State) => {
      // Hub physical pulse — scale transform on inner ref.
      if (innerRef.current) {
        innerRef.current.setAttribute(
          'transform',
          `scale(${state.hubPulseScale.toFixed(4)})`,
        );
      }

      // Sustained-hover threshold logic. When the phase transitions
      // INTO POST_HUB and the mouse is still over the hub, schedule
      // a timer to trigger CASCADE_ALL.
      const prev = lastPhaseRef.current;
      lastPhaseRef.current = state.phase;

      if (state.phase === 'POST_HUB' && prev !== 'POST_HUB') {
        cancelTimer();
        if (hoverActiveRef.current) {
          extendTimerRef.current = setTimeout(() => {
            extendTimerRef.current = null;
            // Only fire if still hovering and still in POST_HUB.
            if (
              hoverActiveRef.current &&
              poster004Store.getState().phase === 'POST_HUB'
            ) {
              triggerAllCascade();
            }
          }, HOVER_EXTEND_THRESHOLD_MS);
        }
      } else if (state.phase !== 'POST_HUB' && prev === 'POST_HUB') {
        cancelTimer();
      }
    };

    apply(poster004Store.getState());
    const unsub = poster004Store.subscribe(apply);
    return () => {
      unsub();
      cancelTimer();
    };
  }, []);

  const handlePointerEnter = () => {
    hoverActiveRef.current = true;
    const phase = poster004Store.getState().phase;
    if (phase === 'DEFAULT') {
      triggerHubCascade();
    } else if (phase === 'POST_HUB') {
      // Schedule the extend timer if not already.
      if (extendTimerRef.current === null) {
        extendTimerRef.current = setTimeout(() => {
          extendTimerRef.current = null;
          if (
            hoverActiveRef.current &&
            poster004Store.getState().phase === 'POST_HUB'
          ) {
            triggerAllCascade();
          }
        }, HOVER_EXTEND_THRESHOLD_MS);
      }
    }
  };

  const handlePointerLeave = () => {
    hoverActiveRef.current = false;
    if (extendTimerRef.current !== null) {
      clearTimeout(extendTimerRef.current);
      extendTimerRef.current = null;
    }
  };

  const handleClick = () => {
    // Touch fallback. Tap = trigger the cascade for the current phase.
    const phase = poster004Store.getState().phase;
    if (phase === 'DEFAULT') triggerHubCascade();
    else if (phase === 'POST_HUB') triggerAllCascade();
  };

  return (
    <g
      transform={`translate(${HUB_CX} ${HUB_CY})`}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <g ref={innerRef}>
        {/* The hub form. A simple filled circle in foreground colour;
            scale tween via transform carries the physical-pulse
            affordance. */}
        <circle r={HUB_RADIUS} fill="#0D1A1E" />
      </g>

      {/* Label group — outside the scaled inner so labels don't pulse. */}
      <g style={{ pointerEvents: 'none' }}>
        <text
          y={HUB_RADIUS + 22}
          textAnchor="middle"
          fill="#0D1A1E"
          style={{
            fontFamily: "'Playfair', Georgia, serif",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          1,542 TWh
        </text>
        <text
          y={HUB_RADIUS + 38}
          textAnchor="middle"
          fill="#0D1A1E"
          style={{
            fontFamily: "'Playfair', Georgia, serif",
            fontSize: 11,
            opacity: 0.7,
          }}
        >
          UK final energy, 2024
        </text>
      </g>
    </g>
  );
});

export default Poster004Hub;
