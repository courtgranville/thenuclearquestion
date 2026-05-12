import { useEffect, useState } from 'react';
import { Link } from 'wouter';

type Props = {
  fissionFired: boolean;
};

const DISMISS_KEY = 'fission.dismissed';
const DISMISS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_WINDOW_MS;
  } catch {
    return false;
  }
}

function prefetchRoom(): void {
  import('@/pages/Fission');
  import('@/assets/fission-form-points.json');
}

// Small cream invitation that appears 1.2 s after the user triggers
// the homepage hero's fission interaction. Lives in the cream
// editorial system - same background, dark text, Playfair - so it
// reads as a quiet next-step prompt rather than a foreign object.
// Dismissable; re-appears after 30 days.
export default function FissionInvitation({ fissionFired }: Props) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());

  useEffect(() => {
    if (!fissionFired || dismissed || visible) return;
    const id = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(id);
  }, [fissionFired, dismissed, visible]);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // best effort
    }
    setVisible(false);
    setDismissed(true);
  };

  if (!visible || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Fission room invitation"
      className="fission-invitation absolute z-30 bg-[#ECE7DF] border border-[#D8D2C7] p-6 shadow-sm md:right-16 md:top-1/2 md:max-w-[280px] max-md:bottom-4 max-md:left-4 max-md:right-4"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss invitation"
        className="absolute top-2 right-3 text-base leading-none text-[#0D1A1E]/40 hover:text-[#0D1A1E] focus:text-[#0D1A1E] focus:outline-none"
      >
        ×
      </button>
      <p className="font-sans text-sm tracking-[0.15em] uppercase text-[#0D1A1E]/60 mb-3">
        If you're curious
      </p>
      <p className="font-serif italic text-base text-[#0D1A1E] leading-snug mb-4">
        Step into the fission room to explore the chain reaction.
      </p>
      <Link
        href="/fission"
        onMouseEnter={prefetchRoom}
        onFocus={prefetchRoom}
        onTouchStart={prefetchRoom}
        className="font-sans text-sm text-[#0D1A1E] hover:text-[#A51E22] transition-colors inline-flex items-center gap-2"
      >
        Enter the room
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
