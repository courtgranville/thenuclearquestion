import { useEffect, useRef } from 'react';
import { FissionEngine } from './fissionEngine';
import type { Quality } from './fissionTuning';

// Owns the engine instance for the component's lifetime. useRef
// rather than useState so re-renders don't recreate the engine; the
// mutable typed arrays inside the engine are the canonical state, the
// renderer reads against them via the BufferAttribute needsUpdate
// flag.
//
// Engine is constructed lazily on the first render only - the caller
// is responsible for ensuring `points` and `quality` are ready before
// invoking this hook (gate the call site with a conditional render).
export function useFissionEngine(opts: {
  points: Float32Array;
  count: number;
  quality: Quality;
}): FissionEngine {
  const engineRef = useRef<FissionEngine | null>(null);

  if (engineRef.current === null) {
    engineRef.current = new FissionEngine(opts);
  }

  useEffect(() => {
    return () => {
      engineRef.current = null;
    };
  }, []);

  return engineRef.current;
}
