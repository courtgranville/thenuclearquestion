import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import FissionEntrancePreview from './FissionEntrancePreview';

// Hover prefetch. Triggers the same dynamic imports the lazy /fission
// route does without doing anything with the result; the browser
// caches the chunks. By the time the user clicks the Enter link the
// Suspense fallback typically doesn't even show.
function prefetchRoom(): void {
  import('@/pages/Fission');
  import('@/assets/fission-form-points.json');
}

// Tracks whether the viewport is below the md breakpoint so we can
// scale the preview canvas accordingly. Avoids a fixed-pixel layout
// shift on mobile.
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return isMobile;
}

// Full-bleed dark band that lives below the poster thumbnails on the
// homepage. The hard cream-to-#0A0A0A contrast signals the room is a
// different surface from the editorial system above. The breathing
// particle preview hints at what's inside without paying for the
// Three.js bundle - Canvas 2D rendering of ~3k subsampled dots.
export default function FissionEntrance() {
  const isMobile = useIsMobile();
  const previewSize = isMobile ? 220 : 280;

  return (
    <section
      aria-labelledby="fission-entrance-heading"
      className="w-full bg-[#0A0A0A] text-[#ECE7DF] flex items-center justify-center"
      style={{ minHeight: isMobile ? 380 : 520 }}
    >
      <div className="flex flex-col items-center text-center px-6 max-w-[32rem]">
        <p className="text-sm tracking-[0.25em] uppercase text-[#ECE7DF]/60 font-sans">
          //07 - Fission, observed
        </p>

        <div className="mt-6">
          <FissionEntrancePreview size={previewSize} />
        </div>

        <h2
          id="fission-entrance-heading"
          className={`mt-8 italic font-serif text-[#ECE7DF] leading-relaxed ${isMobile ? 'text-xl' : 'text-2xl'}`}
        >
          The thesis ends with words.
          <br />
          This is what they don't say.
        </h2>

        <Link
          href="/fission"
          onMouseEnter={prefetchRoom}
          onFocus={prefetchRoom}
          onTouchStart={prefetchRoom}
          className="mt-6 font-sans text-lg text-[#ECE7DF] border-b border-transparent hover:border-[#ECE7DF] focus:border-[#ECE7DF] focus:outline-none pb-1 transition-colors duration-200 inline-flex items-center gap-2"
        >
          Enter the room
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
