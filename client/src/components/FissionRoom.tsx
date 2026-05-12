import { useEffect, useMemo } from 'react';
import { QUALITY, type Quality } from '@/lib/fissionTuning';
import { useFissionEngine } from '@/lib/useFissionEngine';
import { enrichmentFromSliderValue } from './FissionEnrichmentSlider';
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
  neutronSpeed: number;
  enrichment: number;
  onEnergyChange: (mev: number) => void;
};

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

// Owns the engine. Mirrors both slider values into the engine each
// time they change. Polls engine.energyMeV at 4 Hz and bubbles it
// back so the energy counter overlay stays React-stateful without
// React touching the engine's mutable arrays.
export default function FissionRoom({
  formPoints,
  quality,
  neutronSpeed,
  enrichment,
  onEnergyChange,
}: Props) {
  const { points, count } = useMemo(
    () => thinPoints(formPoints, quality),
    [formPoints, quality],
  );

  const engine = useFissionEngine({ points, count, quality });

  // Mirror neutron-speed slider into the engine.
  useEffect(() => {
    engine.setNeutronSpeedRatio(neutronSpeed);
  }, [engine, neutronSpeed]);

  // Mirror enrichment slider into the engine. The slider value is a
  // normalised 0..1; the engine takes an actual fissile fraction.
  useEffect(() => {
    engine.setEnrichmentLevel(enrichmentFromSliderValue(enrichment));
  }, [engine, enrichment]);

  useEffect(() => {
    const id = window.setInterval(() => {
      onEnergyChange(engine.energyMeV);
    }, 250);
    return () => window.clearInterval(id);
  }, [engine, onEnergyChange]);

  return <FissionScene engine={engine} quality={quality} />;
}
