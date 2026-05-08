/**
 * Poster 004 — hover instruction.
 *
 * A single small italic line below the canvas, centred. Fades in
 * INSTRUCTION_FADE_IN_DELAY_MS after page load (the engine schedules
 * this on Viz mount). Fades out and never returns the moment any
 * cascade fires.
 *
 * Touch-device users see "Tap to begin" instead of "Hover the centre"
 * — detected via `(pointer: coarse)` matchMedia.
 */

import { memo, useEffect, useRef, useState } from 'react';
import { DENDROGRAM_SIZE, HUB_CX } from '@/lib/poster004Data';
import { poster004Store, type State } from '@/lib/poster004Store';

function copyForDevice(): string {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  ) {
    return 'Tap to begin';
  }
  return 'Hover the centre';
}

const Poster004HoverInstruction = memo(function Poster004HoverInstruction() {
  const textRef = useRef<SVGTextElement | null>(null);
  const [copy] = useState(() => copyForDevice());

  useEffect(() => {
    const apply = (state: State) => {
      if (!textRef.current) return;
      textRef.current.style.opacity = state.hoverInstructionVisible
        ? '0.7'
        : '0';
    };
    apply(poster004Store.getState());
    return poster004Store.subscribe(apply);
  }, []);

  return (
    <text
      ref={textRef}
      x={HUB_CX}
      y={DENDROGRAM_SIZE - 25}
      textAnchor="middle"
      fill="#0D1A1E"
      style={{
        fontFamily: "'Playfair', Georgia, serif",
        fontSize: 13,
        fontStyle: 'italic',
        opacity: 0,
        transition: 'opacity 200ms ease',
        pointerEvents: 'none',
      }}
    >
      {copy}
    </text>
  );
});

export default Poster004HoverInstruction;
