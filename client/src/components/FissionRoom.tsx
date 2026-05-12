import { useEffect, useMemo } from 'react';
import { QUALITY, type Quality } from '@/lib/fissionTuning';
import { useFissionEngine } from '@/lib/useFissionEngine';
import FissionScene from './FissionScene';

export type FormPoints = {
  count: number;
  boundingRadius: number;
  viewBox: {
    width: number;
    height: number;
    centroid: { x: number; y: number };
    boundingRadiusInViewBox: number;
  };
  positions: number[];
};

type Props = {
  formPoints: FormPoints;
  quality: Quality;
  onEnergyChange: (mev: number) => void;
};

// Builds a thinned Float32Array of points at this quality, by even-
// stride sampling of the base cloud. Outline survives because srcIdx
// walks the source array uniformly rather than removing a contiguous
// chunk.
function thinPoints(
  formPoints: FormPoints,
  quality: Quality,
): { points: Float32Array; count: number } {
  const baseCount = formPoints.count;
  const { particleScale } = QUALITY[quality];
  const effectiveCount = Math.max(1, Math.floor(baseCount * particleScale));
  const points = new Float32Array(effectiveCount * 2);
  const src = formPoints.positions;
  for (let i = 0; i < effectiveCount; i++) {
    const srcIdx = Math.floor((i * baseCount) / effectiveCount);
    points[i * 2] = src[srcIdx * 2];
    points[i * 2 + 1] = src[srcIdx * 2 + 1];
  }
  return { points, count: effectiveCount };
}

// Owns the engine for the duration the cloud is mounted. Plumbs
// engine.energyMeV back to the parent at 4 Hz via callback so the
// energy counter overlay can stay React-stateful without React
// touching the engine's mutable arrays.
//
// Parent renders this only when formPoints AND quality are both set;
// keying it on `quality` makes a quality switch tear down the engine
// and rebuild from scratch.
export default function FissionRoom({ formPoints, quality, onEnergyChange }: Props) {
  const { points, count } = useMemo(
    () => thinPoints(formPoints, quality),
    [formPoints, quality],
  );

  const engine = useFissionEngine({ points, count, quality });

  useEffect(() => {
    const id = window.setInterval(() => {
      onEnergyChange(engine.energyMeV);
    }, 250);
    return () => window.clearInterval(id);
  }, [engine, onEnergyChange]);

  return <FissionScene engine={engine} quality={quality} />;
}
