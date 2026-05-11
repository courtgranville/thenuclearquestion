import { useEffect, useLayoutEffect, useState } from 'react';
import FissionQualityGate, { type Quality } from '@/components/FissionQualityGate';
import FissionReturn from '@/components/FissionReturn';
import FissionScene from '@/components/FissionScene';
import FissionEnergyCounter from '@/components/FissionEnergyCounter';
import FissionModeratorSlider from '@/components/FissionModeratorSlider';
import FissionFpsOverlay from '@/components/FissionFpsOverlay';

const TITLE = 'Fission, observed - The Nuclear Question';
const ROOM_BG = '#0A0A0A';

export default function Fission() {
  const [quality, setQuality] = useState<Quality | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [moderator, setModerator] = useState(0.5);

  // Tab title — set on mount, restore on unmount.
  useEffect(() => {
    const previous = document.title;
    document.title = TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  // Body background — useLayoutEffect so the swap lands before the
  // first paint of the route, avoiding a cream flash behind the
  // page-transition fade-in.
  useLayoutEffect(() => {
    const previousBg = document.body.style.backgroundColor;
    const previousHtmlBg = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = ROOM_BG;
    document.documentElement.style.backgroundColor = ROOM_BG;
    return () => {
      document.body.style.backgroundColor = previousBg;
      document.documentElement.style.backgroundColor = previousHtmlBg;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-[#0A0A0A] text-[#ECE7DF] overflow-hidden"
      onPointerDown={() => setHasInteracted(true)}
    >
      {quality && <FissionScene quality={quality} />}

      <div className="pointer-events-none absolute top-6 left-4 md:left-6 z-30 font-sans text-sm tracking-[0.25em] uppercase text-[#ECE7DF]/80">
        //07 - Fission, observed
      </div>

      <FissionReturn />

      <div className="pointer-events-none hidden md:block absolute bottom-8 left-8 z-30">
        <FissionEnergyCounter energyMeV={0} />
      </div>

      <div className="pointer-events-none hidden md:block absolute bottom-8 right-8 z-30 w-72">
        <FissionModeratorSlider value={moderator} onChange={setModerator} />
      </div>

      {/* Mobile-only stacked bottom panel. The desktop absolute-positioned
          UI is hidden on small viewports because corner anchoring breaks
          below ~720px. */}
      <div className="pointer-events-none md:hidden absolute bottom-6 inset-x-4 z-30 flex flex-col gap-6">
        <FissionEnergyCounter energyMeV={0} />
        <FissionModeratorSlider value={moderator} onChange={setModerator} />
      </div>

      <div
        className={`hidden md:block absolute bottom-32 left-1/2 -translate-x-1/2 max-w-md text-center font-sans italic text-sm leading-relaxed transition-opacity duration-700 pointer-events-none ${
          hasInteracted ? 'opacity-50' : 'opacity-100'
        }`}
      >
        <p>Click anywhere on the form to inject a neutron.</p>
        <p>Slow the neutron with the moderator to see chains run away.</p>
        <p>Spacing the nuclei changes everything.</p>
      </div>

      {!quality && <FissionQualityGate onSelect={setQuality} />}

      {/* Dev-only FPS readout, gated by ?fps=1 in the URL. Mounted
          after the slider so source order keeps it below visually. */}
      <FissionFpsOverlay />
    </div>
  );
}
