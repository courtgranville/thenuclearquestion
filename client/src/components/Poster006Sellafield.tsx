import { memo, useEffect, useMemo, useRef, useState } from 'react';

// ─── Producer metadata (used by the hover callout) ──────────────

interface ProducerMeta {
  id: string;
  name: string;
  shareLabel: string;
  volumeLabel: string;
  blurb: string;
  accent: string;
}

const PRODUCERS: ProducerMeta[] = [
  { id: 'total',      name: 'UK total',          shareLabel: '100%',  volumeLabel: '4,580,000 m³', blurb: 'All UK radioactive waste, summed across every site.',                                                              accent: '#7d746a' },
  { id: 'sellafield', name: 'Sellafield',        shareLabel: '72.4%', volumeLabel: '3,320,000 m³', blurb: 'Cumbria. Decades of plutonium production and reprocessing have concentrated the bulk of UK radioactive waste here.', accent: '#a51e23' },
  { id: 'magnox',     name: 'Magnox sites',      shareLabel: '12.3%', volumeLabel: '563,000 m³',   blurb: 'First-generation civil reactors, all shut down and in various stages of decommissioning.',                       accent: '#7d746a' },
  { id: 'others',     name: 'Other sites',       shareLabel: '8.1%',  volumeLabel: '370,000 m³',   blurb: 'Hospitals, universities, fuel fabrication and the older defence research footprint.',                              accent: '#7d746a' },
  { id: 'agr',        name: 'AGR & PWR',         shareLabel: '3.4%',  volumeLabel: '156,000 m³',   blurb: 'The UK’s second and third generation commercial fleet - Hinkley Point B/Hartlepool/Heysham/Hunterston/Torness, plus Sizewell B.', accent: '#7d746a' },
  { id: 'dounreay',   name: 'Dounreay',          shareLabel: '2.5%',  volumeLabel: '114,000 m³',   blurb: 'Former fast-reactor research site in Caithness, now in complex decommissioning.',                                  accent: '#7d746a' },
  { id: 'defence',    name: 'Defence',           shareLabel: '1.1%',  volumeLabel: '51,900 m³',    blurb: 'Naval reactor servicing, weapons establishments, and ancillary facilities.',                                       accent: '#7d746a' },
  { id: 'hinkley',    name: 'Hinkley Point C',   shareLabel: '0.2%',  volumeLabel: '9,970 m³',     blurb: 'Forward-looking estimate. Waste the new build will generate over its operating life - not yet produced.',          accent: '#7d746a' },
];

const SVG_URL = '/assets/006-waste-locations-processed_6ed9ecfd.svg';

// CSS injected once into the document head - cleaner than inline
// styles when toggling classes on hover.
const CSS_INJECTED_KEY = '__poster006_dendro_css';

function injectStyleOnce() {
  if (typeof document === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any)[CSS_INJECTED_KEY]) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any)[CSS_INJECTED_KEY] = true;
  const style = document.createElement('style');
  style.textContent = `
    .poster006-dendro g[id^="loc-"] {
      transform-box: fill-box;
      transform-origin: center;
      transition: transform 120ms ease-out, opacity 150ms ease-out;
      cursor: pointer;
      will-change: transform, opacity;
    }
    .poster006-dendro g[id="loc-connections"] {
      cursor: default;
      pointer-events: none;
    }
    .poster006-dendro g[id^="loc-"].is-focused {
      transform: scale(1.15);
    }
    .poster006-dendro g[id^="loc-"].is-dimmed {
      opacity: 0.25;
    }
    .poster006-dendro g[id="loc-connections"].is-dimmed {
      opacity: 0.25;
    }
  `;
  document.head.appendChild(style);
}

// Isolated, memoised wrapper for the source-SVG injection. Without
// memoisation, React's dangerouslySetInnerHTML re-injects the entire
// SVG markup on every parent re-render - including when `focused`
// state changes during hover, which would tear down and rebuild the
// whole dendrogram on every pointer move. Memoising on svgMarkup
// means the SVG injection happens once when the markup string first
// appears, and never again.
const InjectedDendrogram = memo(function InjectedDendrogram({
  markup,
}: {
  markup: string;
}) {
  return (
    <div
      className="w-full"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
});

// ─── Component ──────────────────────────────────────────────────

export default function Poster006Sellafield() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  // Inject the hover-state CSS once.
  useEffect(() => { injectStyleOnce(); }, []);

  // Fetch the source SVG once.
  useEffect(() => {
    let cancelled = false;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', SVG_URL, true);
    xhr.responseType = 'text';
    xhr.onload = () => {
      if (cancelled) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xhr.responseText, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (svg) {
          // Tighten the viewBox to the dendrogram artwork. Production
          // SVG has 25-30% empty padding around the actual content;
          // measured live as bbox [305.7, 292.2, 891.9, 673.1] with a
          // small padding margin. Hardcoded so React's
          // dangerouslySetInnerHTML re-injection (on every parent
          // re-render - hover focus state changes will trigger this)
          // doesn't reset it back to the source viewBox.
          svg.setAttribute('viewBox', '290 280 920 700');
          svg.setAttribute('width', '100%');
          svg.removeAttribute('height');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          svg.setAttribute('style', 'display:block;width:100%;height:auto;');
        }
        setSvgMarkup(new XMLSerializer().serializeToString(svg ?? doc.documentElement));
      }
    };
    xhr.send();
    return () => { cancelled = true; };
  }, []);

  // Hover handlers - delegated to the container, not the SVG groups.
  // React's dangerouslySetInnerHTML may re-inject the SVG on parent
  // re-renders (e.g. when `focused` state changes), which would blow
  // away addEventListener listeners attached directly to <g> elements.
  // The container persists across re-renders, so listening there with
  // pointerover/out (which bubble, unlike pointerenter/leave) and
  // walking up to the nearest loc-* ancestor on each event survives
  // every re-injection.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const findLocAncestor = (start: Element | null): SVGGElement | null => {
      let el: Element | null = start;
      while (el && el !== container) {
        if (el instanceof SVGGElement && el.id && el.id.startsWith('loc-')) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    const onOver = (e: PointerEvent) => {
      const g = findLocAncestor(e.target as Element);
      if (!g) return;
      const id = g.id.replace(/^loc-/, '');
      if (id === 'connections') return;
      setFocused(id);
    };
    const onOut = (e: PointerEvent) => {
      const g = findLocAncestor(e.target as Element);
      if (!g) return;
      // Only clear focus when leaving the focused group AND not entering
      // another loc-* group. relatedTarget is the element being entered.
      const next = findLocAncestor(e.relatedTarget as Element);
      if (next && next !== g) return;
      setFocused(null);
    };

    container.addEventListener('pointerover', onOver, { passive: true });
    container.addEventListener('pointerout', onOut, { passive: true });
    return () => {
      container.removeEventListener('pointerover', onOver);
      container.removeEventListener('pointerout', onOut);
    };
  }, []);

  // Apply / clear is-focused / is-dimmed classes on focus state change.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const groups = container.querySelectorAll<SVGGElement>('g[id^="loc-"]');
    groups.forEach((g) => {
      const id = (g.id || '').replace(/^loc-/, '');
      const isFocused = focused !== null && id === focused;
      const isDimmed  = focused !== null && !isFocused;
      g.classList.toggle('is-focused', isFocused);
      g.classList.toggle('is-dimmed',  isDimmed);
    });
  }, [focused, svgMarkup]);

  const focusedMeta = useMemo(
    () => PRODUCERS.find((p) => p.id === focused) ?? null,
    [focused],
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8">
      <h4
        className="font-serif text-lg mb-6 text-center"
        style={{ color: '#0d1a1e', fontWeight: 600 }}
      >
        Where does Britain&rsquo;s nuclear waste come from?
      </h4>

      <div
        ref={containerRef}
        className="poster006-dendro relative w-full mx-auto"
      >
        {svgMarkup && <InjectedDendrogram markup={svgMarkup} />}

        {/* Hover callout - populated from the focused producer. */}
        {focusedMeta && (
          <div
            className="absolute top-3 right-3 max-w-[300px] p-4 rounded-sm border bg-card pointer-events-none"
            style={{
              borderColor: 'rgba(13,26,30,0.18)',
              borderLeftColor: focusedMeta.accent,
              borderLeftWidth: 3,
              zIndex: 5,
            }}
          >
            <p
              className="font-serif text-base"
              style={{ color: focusedMeta.accent, fontWeight: 600 }}
            >
              {focusedMeta.name}
            </p>
            <p
              className="text-sm font-medium mt-0.5 text-foreground"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              {focusedMeta.shareLabel} &middot; {focusedMeta.volumeLabel}
            </p>
            <p
              className="text-xs text-muted-foreground mt-1.5 leading-relaxed"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              {focusedMeta.blurb}
            </p>
          </div>
        )}
      </div>

      <p
        className="text-center text-sm text-muted-foreground mt-4"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        Hover any node to focus it. Sellafield holds the bulk of UK radioactive waste.
      </p>

      {/* Static Sellafield detail block - always visible */}
      <div
        className="mt-12 p-5 sm:p-6 rounded-sm border bg-card"
        style={{
          borderColor: 'rgba(13,26,30,0.18)',
          borderLeftColor: '#a51e23',
          borderLeftWidth: 3,
          maxWidth: '880px',
          margin: '48px auto 0',
        }}
      >
        <p
          className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-1.5"
          style={{ fontFamily: "'Playfair', Georgia, serif" }}
        >
          Focus
        </p>
        <h4
          className="font-serif text-xl mb-3"
          style={{ color: '#a51e23', fontWeight: 600 }}
        >
          What&rsquo;s happening at Sellafield
        </h4>
        <p
          className="text-base text-foreground leading-relaxed mb-4"
          style={{ fontFamily: "'Playfair', Georgia, serif" }}
        >
          Sellafield, in west Cumbria, holds 72.4% of the UK&rsquo;s radioactive waste on a single
          6&nbsp;km² site. It was a plutonium-production reactor for the British weapons programme,
          then a civil reprocessing site from the 1960s until 2022. It is now a storage and cleanup
          operation. The Magnox Swarf Storage Silo has been leaking radioactive water into the ground
          since 2018 - roughly an Olympic swimming pool every three years. The Nuclear Decommissioning
          Authority describes it as the most hazardous building in the UK.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p
              className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              Total cleanup cost
            </p>
            <p className="text-base font-medium text-foreground">£136bn</p>
            <p
              className="text-xs text-muted-foreground"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              running to 2125
            </p>
          </div>
          <div>
            <p
              className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              Spend in 2023&ndash;24
            </p>
            <p className="text-base font-medium text-foreground">£2.7bn</p>
          </div>
          <div>
            <p
              className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              Civil plutonium stockpile
            </p>
            <p className="text-base font-medium text-foreground">~140 t</p>
            <p
              className="text-xs text-muted-foreground"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              separated
            </p>
          </div>
          <div>
            <p
              className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              Reactors on site
            </p>
            <p className="text-base font-medium text-foreground">7</p>
            <p
              className="text-xs text-muted-foreground"
              style={{ fontFamily: "'Playfair', Georgia, serif" }}
            >
              none operating
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
