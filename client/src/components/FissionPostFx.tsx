import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { QUALITY, BLOOM, VIGNETTE, type Quality } from '@/lib/fissionTuning';

type Props = {
  quality: Quality;
};

// Post-processing stack. Bloom makes the cream particles glow into
// the surrounding dark; vignette adds photographic depth without
// reading as a filter. Both gated per-quality in fissionTuning.ts.
//
// multisampling={0} disables MSAA on the composer's render target.
// With additive-blended points, MSAA helps very little and costs
// measurably; the aliasing at point-sprite edges is hidden under
// the bloom anyway.
export default function FissionPostFx({ quality }: Props) {
  const cfg = QUALITY[quality].postfx;

  return (
    <EffectComposer multisampling={0}>
      <>
        {cfg.bloom && (
          <Bloom
            intensity={BLOOM.intensity}
            luminanceThreshold={BLOOM.luminanceThreshold}
            luminanceSmoothing={BLOOM.luminanceSmoothing}
            mipmapBlur={BLOOM.mipmapBlur}
          />
        )}
        {cfg.vignette && (
          <Vignette
            offset={VIGNETTE.offset}
            darkness={VIGNETTE.darkness}
            blendFunction={BlendFunction.NORMAL}
          />
        )}
      </>
    </EffectComposer>
  );
}
