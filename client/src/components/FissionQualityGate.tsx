import { useEffect, useRef, useState } from 'react';
import type { Quality } from '@/lib/fissionTuning';

// Re-export so existing imports of Quality from this file keep working.
export type { Quality };

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

const OPTIONS: { value: Quality; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export default function FissionQualityGate({ onSelect }: Props) {
  // Lazy initializer runs once at first render. If a stored quality
  // exists or the viewport is mobile, we return non-null and the gate
  // never paints its UI - it just notifies the parent via effect.
  const [autoSelected] = useState<Quality | null>(readAutoSelection);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (autoSelected) onSelect(autoSelected);
  }, [autoSelected, onSelect]);

  // Focus management: when the visible gate first mounts, save the
  // previously-focused element and move focus to the first button so
  // keyboard users can choose without hunting. Restore on unmount.
  useEffect(() => {
    if (autoSelected) return;

    previousFocus.current = (document.activeElement as HTMLElement | null) ?? null;
    const firstButton = dialogRef.current?.querySelector<HTMLButtonElement>('button');
    firstButton?.focus();

    return () => {
      const prev = previousFocus.current;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [autoSelected]);

  if (autoSelected) return null;

  const handleSelect = (q: Quality) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, q);
    } catch {
      // Best-effort persistence; never throw.
    }
    onSelect(q);
  };

  // Focus trap. Tab and Shift+Tab cycle within the buttons. Escape is
  // intentionally a no-op - a quality choice is required to enter the
  // room; there is no escape hatch.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fission-quality-prompt"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-[#0A0A0A] text-[#ECE7DF] px-6"
    >
      <p
        id="fission-quality-prompt"
        className="text-lg font-sans tracking-wide text-center"
      >
        Choose a quality for the room.
      </p>
      <div className="flex flex-col md:flex-row gap-6 md:gap-12">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className="font-sans text-lg tracking-wide text-[#ECE7DF]/85 hover:text-[#ECE7DF] focus:text-[#ECE7DF] focus:outline-none border-b border-transparent hover:border-[#ECE7DF] focus:border-[#ECE7DF] pb-1 px-2 transition-colors duration-200"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
