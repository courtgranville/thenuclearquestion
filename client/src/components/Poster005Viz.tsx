// Poster 005 — top-level composer.
//
// Three sub-views stacked vertically (Dendrogram → Map → Timeline),
// each subscribing to poster005Store independently. Global keyboard
// shortcuts: Tab cycles through status focus, Escape clears focus
// (also closes any open cluster).

import { useEffect } from 'react';
import { Poster005Dendrogram } from './Poster005Dendrogram';
import { Poster005Map } from './Poster005Map';
import { Poster005Timeline } from './Poster005Timeline';
import { poster005Store } from '@/lib/poster005Store';
import type { ReactorStatus } from '@/assets/poster005';

const STATUS_CYCLE: ReactorStatus[] = ['construction', 'operating', 'retired', 'cancelled'];

export default function Poster005Viz() {
  // Global keyboard shortcuts: Tab cycles status, Escape clears.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        poster005Store.clearFocus();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const cur = poster005Store.getCurrent().focusStatus;
        const idx = cur === null ? -1 : STATUS_CYCLE.indexOf(cur);
        const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
        poster005Store.setFocusStatus(next);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Year scrub via keyboard (when timeline area has focus —
        // here we accept it globally; Court can constrain later).
        const cur = poster005Store.getCurrent().year;
        poster005Store.setYear(cur + (e.key === 'ArrowRight' ? 1 : -1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="w-full space-y-12">
      <Poster005Dendrogram />
      <Poster005Map />
      <Poster005Timeline />
    </div>
  );
}
