import { useEffect, useLayoutEffect, useState } from 'react';
import FissionQualityGate, { type Quality } from '@/components/FissionQualityGate';
import FissionReturn from '@/components/FissionReturn';
import FissionRoom, { type FormPoints } from '@/components/FissionRoom';
import FissionEnergyCounter from '@/components/FissionEnergyCounter';
import FissionNeutronSpeedSlider from '@/components/FissionNeutronSpeedSlider';
import FissionEnrichmentSlider from '@/components/FissionEnrichmentSlider';
import FissionFpsOverlay from '@/components/FissionFpsOverlay';
import FissionAimArrow from '@/components/FissionAimArrow';
import FissionResetButton from '@/components/FissionResetButton';
import type { FissionEngine } from '@/lib/fissionEngine';

const TITLE = 'Fission, observed - The Nuclear Question';
const ROOM_BG = '#0A0A0A';

const NEUTRON_SPEED_KEY = 'fission.neutronSpeed';
const ENRICHMENT_KEY = 'fission.enrichment';

function readSlider(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(1, n));
  } catch {
    return fallback;
  }
}

export default function Fission() {
  const [quality, setQuality] = useState<Quality | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [neutronSpeed, setNeutronSpeed] = useState<number>(() =>
    readSlider(NEUTRON_SPEED_KEY, 0.5),
  );
  const [enrichment, setEnrichment] = useState<number>(() =>
    readSlider(ENRICHMENT_KEY, 0.025),
  );
  const [formPoints, setFormPoints] = useState<FormPoints | null>(null);
  const [displayEnergy, setDisplayEnergy] = useState(0);
  // Engine reference handed back from FissionRoom once it's created;
  // used to wire the page-level Reset button to engine.softReset.
  const [engine, setEngine] = useState<FissionEngine | null>(null);

  useEffect(() => {
    const previous = document.title;
    document.title = TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    import('@/assets/fission-form-points.json').then((m) => {
      if (cancelled) return;
      setFormPoints((m.default ?? m) as FormPoints);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleNeutronSpeed = (v: number) => {
    setNeutronSpeed(v);
    try {
      window.localStorage.setItem(NEUTRON_SPEED_KEY, String(v));
    } catch {
      // ignore
    }
  };

  const handleEnrichment = (v: number) => {
    setEnrichment(v);
    try {
      window.localStorage.setItem(ENRICHMENT_KEY, String(v));
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[#0A0A0A] text-[#ECE7DF] overflow-hidden"
      onPointerDown={() => setHasInteracted(true)}
    >
      {quality && formPoints && (
        <FissionRoom
          key={quality}
          formPoints={formPoints}
          quality={quality}
          neutronSpeed={neutronSpeed}
          enrichment={enrichment}
          onEnergyChange={setDisplayEnergy}
          onEngineReady={setEngine}
        />
      )}

      <div className="pointer-events-none absolute top-6 left-4 md:left-6 z-30 font-sans text-sm tracking-[0.25em] uppercase text-[#ECE7DF]/80">
        //07 - Fission, observed
      </div>

      {/* Top-right cluster: Reset (when engine ready) + Return. */}
      <div className="pointer-events-none absolute top-6 right-4 md:right-6 z-40 flex gap-6 items-center">
        {engine && <FissionResetButton engine={engine} />}
        <FissionReturn />
      </div>

      <div className="pointer-events-none hidden md:block absolute bottom-8 left-8 z-30">
        <FissionEnergyCounter energyMeV={displayEnergy} />
      </div>

      {/* Two stacked sliders, bottom-right. Neutron speed on top,
          enrichment below. */}
      <div className="pointer-events-none hidden md:flex absolute bottom-8 right-8 z-30 w-72 flex-col gap-5">
        <FissionNeutronSpeedSlider value={neutronSpeed} onChange={handleNeutronSpeed} />
        <FissionEnrichmentSlider value={enrichment} onChange={handleEnrichment} />
      </div>

      {/* Mobile stacked panel - counter on top, both sliders below. */}
      <div className="pointer-events-none md:hidden absolute bottom-6 inset-x-4 z-30 flex flex-col gap-5">
        <FissionEnergyCounter energyMeV={displayEnergy} />
        <FissionNeutronSpeedSlider value={neutronSpeed} onChange={handleNeutronSpeed} />
        <FissionEnrichmentSlider value={enrichment} onChange={handleEnrichment} />
      </div>

      <div
        className={`hidden md:block absolute bottom-32 left-1/2 -translate-x-1/2 max-w-md text-center font-sans italic text-sm leading-relaxed transition-opacity duration-700 pointer-events-none ${
          hasInteracted ? 'opacity-50' : 'opacity-100'
        }`}
      >
        <p>Click anywhere on the form to inject a neutron.</p>
        <p>Slow the neutron with the moderator to see chains run away.</p>
      </div>

      {/* DOM aim indicator sits above the canvas at z-20 so the
          bloom pipeline can't touch it. Reads cursor world coords
          from the cursor bus rather than React prop-drilling. */}
      <FissionAimArrow />

      {!quality && <FissionQualityGate onSelect={setQuality} />}

      <FissionFpsOverlay />
    </div>
  );
}
