import { useEffect, useState } from 'react';

export type Quality = 'low' | 'medium' | 'high';

const STORAGE_KEY = 'fission.quality';

function isQuality(v: unknown): v is Quality {
  return v === 'low' || v === 'medium' || v === 'high';
}

function readAutoSelection(): Quality | null {
  if (typeof window === 'undefined') return null;

  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Privacy mode or storage disabled; treat as no stored value.
  }
  if (isQuality(stored)) return stored;

  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (coarse || window.innerWidth < 768) return 'low';

  return null;
}

type Props = {
  onSelect: (q: Quality) => void;
};

export default function FissionQualityGate({ onSelect }: Props) {
  // Lazy initializer runs once at first render. If a stored quality
  // exists or the viewport is mobile, we return non-null and the gate
  // never paints its UI - it just notifies the parent via effect.
  const [autoSelected] = useState<Quality | null>(readAutoSelection);

  useEffect(() => {
    if (autoSelected) onSelect(autoSelected);
  }, [autoSelected, onSelect]);

  if (autoSelected) return null;

  const handleSelect = (q: Quality) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, q);
    } catch {
      // Best-effort persistence; never throw.
    }
    onSelect(q);
  };

  const options: { value: Quality; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fission-quality-prompt"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-[#0A0A0A] text-[#ECE7DF] px-6"
    >
      <p
        id="fission-quality-prompt"
        className="text-lg font-sans tracking-wide text-center"
      >
        Choose a quality for the room.
      </p>
      <div className="flex flex-col md:flex-row gap-6 md:gap-12">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className="font-sans text-lg tracking-wide text-[#ECE7DF]/85 hover:text-[#ECE7DF] border-b border-transparent hover:border-[#ECE7DF] pb-1 px-2 transition-colors duration-200"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
