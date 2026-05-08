/**
 * Poster 004 — Hub.
 *
 * Centre form + label. Hover target in DEFAULT (starts cascade-1)
 * and CARRIERS_ONLY (sustained hover starts cascade-2). After
 * CASCADE_2 the hub becomes purely decorative.
 *
 * Subscribes to the store for phase + hubPulseScale; applies the
 * transform via ref + setAttribute. Wrapped in memo() so React
 * never re-renders it.
 */

import { memo, useEffect, useRef } from 'react';
import { HUB_CX, HUB_CY, HUB_RADIUS } from '@/lib/poster004Data';
import { poster004Store, type State } from '@/lib/poster004Store';
import { startCascade1, startCascade2 } from '@/lib/poster004Engine';

const HUB_FILL = '#0D1A1E';
const LABEL_COLOUR = '#0D1A1E';

const Poster004Hub = memo(function Poster004Hub() {
  const innerRef = useRef<SVGGElement | null>(null);
  const labelRef = useRef<SVGGElement | null>(null);
  const hoverActiveRef = useRef(false);

  useEffect(() => {
    const apply = (state: State) => {
      // Pulse scale applied to the inner group (the form), not the
      // outer group (which provides the translate).
      if (innerRef.current) {
        innerRef.current.setAttribute(
          'transform',
          `scale(${state.hubPulseScale.toFixed(4)})`,
        );
      }

      // Sustained-hover transition: if cascade-1 has just landed in
      // CARRIERS_ONLY and the user is still hovering, fire cascade-2
      // immediately. This lets a held hover walk all the way to FULL
      // without releasing.
      if (state.phase === 'CARRIERS_ONLY' && hoverActiveRef.current) {
        startCascade2();
      }

      // Hide the label entirely in STATIC (no animation, no
      // affordance) — visual-only label matches the print exactly.
      if (labelRef.current) {
        labelRef.current.style.opacity =
          state.phase === 'STATIC' ? '1' : '1';
      }
    };
    apply(poster004Store.getState());
    return poster004Store.subscribe(apply);
  }, []);

  const handlePointerEnter = () => {
    hoverActiveRef.current = true;
    const phase = poster004Store.getState().phase;
    if (phase === 'DEFAULT') startCascade1();
    else if (phase === 'CARRIERS_ONLY') startCascade2();
  };

  const handlePointerLeave = () => {
    hoverActiveRef.current = false;
  };

  // Touch fallback — tap anywhere on the hub triggers progression.
  const handleClick = () => {
    const phase = poster004Store.getState().phase;
    if (phase === 'DEFAULT') startCascade1();
    else if (phase === 'CARRIERS_ONLY') startCascade2();
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
        {/* Hub form. A simple filled circle for now; the print's
            metallic-textured blob is decorative. The scale tween is
            what carries the "physical pulse" affordance. */}
        <circle r={HUB_RADIUS} fill={HUB_FILL} />
      </g>

      <g ref={labelRef} style={{ pointerEvents: 'none' }}>
        <text
          y={HUB_RADIUS + 22}
          textAnchor="middle"
          fill={LABEL_COLOUR}
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
          fill={LABEL_COLOUR}
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
