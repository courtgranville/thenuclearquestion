import { useMemo, useState } from 'react';
import formsData from '@/assets/poster-006-forms.json';

// ─── Static metadata for the four storage routes ────────────────

interface RouteMeta {
  id: 'landfill' | 'vaults' | 'treatment' | 'gdf';
  name: string;
  subtitle: string; // small-caps line under the volume
  location: string;
  volume: string;
  wasteTypes: string;
  description: string;
  accent: string;
}

const ROUTES: RouteMeta[] = [
  {
    id: 'landfill',
    name: 'Landfill',
    subtitle: 'LLW & VLLW · authorised sites',
    location: 'Authorised landfill sites',
    volume: '3,340,000 m³',
    wasteTypes: 'Very low level and low level waste',
    description:
      'Disposed of at authorised landfill sites. The radioactivity is low enough that standard landfill engineering provides adequate containment.',
    accent: '#7d746a',
  },
  {
    id: 'vaults',
    name: 'Near-Surface Vaults',
    subtitle: 'LLW · LLWR (Cumbria) & Dounreay',
    location: 'LLWR (Cumbria) & Dounreay',
    volume: '255,000 m³',
    wasteTypes: 'Low level waste (LLW)',
    description:
      'Engineered concrete vaults. Waste is grouted into containers and stacked in vaults that will be capped and monitored.',
    accent: '#4b6e70',
  },
  {
    id: 'treatment',
    name: 'Treatment & Recycling',
    subtitle: 'Recycled, incinerated, or released below threshold',
    location: 'Various sites',
    volume: '440,000 m³',
    wasteTypes: 'LLW & VLLW that can be recycled, incinerated, or released',
    description:
      'Waste recycled, incinerated, or released below regulatory thresholds. Reduces the volume requiring long-term storage.',
    accent: '#1b3967',
  },
  {
    id: 'gdf',
    name: 'Geological Disposal',
    subtitle: 'ILW & HLW · site not yet selected',
    location: 'Site not yet selected',
    volume: '499,000 m³',
    wasteTypes: 'Intermediate and high level waste',
    description:
      'A deep geological disposal facility for intermediate and high level waste. Site not yet selected. First waste expected 2050s.',
    accent: '#a51e23',
  },
];

// ─── Pre-resolve SVG icons from the extraction JSON ─────────────

interface StorageIcon {
  innerSvg: string;
  viewBox: string;
}

const STORAGE_DATA = (formsData as unknown as {
  storage: Record<
    string,
    {
      innerSvg: string;
      bbox: { minX: number; minY: number; maxX: number; maxY: number };
    }
  >;
}).storage;

// Pad each icon's viewBox so all four cells share the same aspect
// ratio. With preserveAspectRatio="xMidYMid meet" + a uniform outer
// container size, equal aspect ratios mean equal visible heights —
// landfill (wide / shallow in source) gets vertical padding instead of
// scaling down to fit, so it sits at the same on-screen height as the
// other three.
const TARGET_ASPECT = (() => {
  let maxA = 0;
  for (const id of ['landfill', 'vaults', 'treatment', 'gdf'] as const) {
    const b = STORAGE_DATA[id].bbox;
    const a = (b.maxX - b.minX) / (b.maxY - b.minY);
    if (a > maxA) maxA = a;
  }
  return maxA; // landfill, ~2.24
})();

function buildIcon(id: RouteMeta['id']): StorageIcon {
  const entry = STORAGE_DATA[id];
  const { minX, minY, maxX, maxY } = entry.bbox;
  const w = maxX - minX;
  const h = maxY - minY;
  // Pad the shorter dimension so the icon's viewBox matches
  // TARGET_ASPECT. The illustration stays centred; padding is added on
  // both sides.
  const currentAspect = w / h;
  let viewW = w;
  let viewH = h;
  let viewX = minX;
  let viewY = minY;
  if (currentAspect < TARGET_ASPECT) {
    // Too tall — pad horizontally.
    const newW = h * TARGET_ASPECT;
    viewX = minX - (newW - w) / 2;
    viewW = newW;
  } else if (currentAspect > TARGET_ASPECT) {
    // Too wide — pad vertically.
    const newH = w / TARGET_ASPECT;
    viewY = minY - (newH - h) / 2;
    viewH = newH;
  }
  const pad = Math.max(viewW, viewH) * 0.04;
  const viewBox = `${viewX - pad} ${viewY - pad} ${viewW + pad * 2} ${viewH + pad * 2}`;
  return { innerSvg: entry.innerSvg, viewBox };
}

const ICONS: Record<RouteMeta['id'], StorageIcon> = {
  landfill:  buildIcon('landfill'),
  vaults:    buildIcon('vaults'),
  treatment: buildIcon('treatment'),
  gdf:       buildIcon('gdf'),
};

// ─── Component ──────────────────────────────────────────────────

export default function Poster006WasteStorage() {
  const [hovered, setHovered] = useState<RouteMeta['id'] | null>(null);

  const hoveredRoute = useMemo(
    () => ROUTES.find((r) => r.id === hovered) ?? null,
    [hovered],
  );

  return (
    // Inline-popout layout. On hover, the cell's content swaps from
    // illustration + title to the detail block — that means the
    // detail is always visible regardless of viewport size, zoom,
    // or column position. No more clipping past the page edge.
    <div className="w-full max-w-5xl mx-auto px-4">
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8"
        onMouseLeave={() => setHovered(null)}
      >
        {ROUTES.map((route) => {
          const icon = ICONS[route.id];
          const isHovered = hovered === route.id;
          return (
            <div
              key={route.id}
              className="rounded-sm border transition-colors duration-200 p-6 cursor-default outline-none focus-visible:ring-2 focus-visible:ring-offset-2 relative"
              onMouseEnter={() => setHovered(route.id)}
              onFocus={() => setHovered(route.id)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              role="button"
              aria-label={`${route.name}, hover for details`}
              style={{
                borderColor: isHovered
                  ? `${route.accent}80`
                  : 'rgba(13,26,30,0.18)',
                backgroundColor: isHovered ? `${route.accent}08` : 'transparent',
                borderLeftColor: route.accent,
                borderLeftWidth: 3,
                minHeight: 380,
              }}
            >
              {/* Default-state content: illustration + title + meta.
                  Faded out on hover. */}
              <div
                className="flex flex-col items-center justify-center text-center h-full"
                style={{
                  opacity: isHovered ? 0 : 1,
                  transition: 'opacity 150ms ease',
                }}
              >
                <svg
                  viewBox={icon.viewBox}
                  className="w-full h-auto"
                  style={{ maxHeight: 220 }}
                  preserveAspectRatio="xMidYMid meet"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: icon.innerSvg }}
                />
                <h4
                  className="font-serif text-2xl mt-4 leading-tight"
                  style={{ color: route.accent, fontWeight: 600 }}
                >
                  {route.name}
                </h4>
                <p
                  className="text-base mt-1"
                  style={{
                    color: 'rgba(13,26,30,0.62)',
                    fontFamily: "'Playfair', Georgia, serif",
                  }}
                >
                  {route.volume}
                </p>
                <p
                  className="text-xs tracking-[0.08em] uppercase mt-1.5 text-muted-foreground"
                  style={{ fontFamily: "'Playfair', Georgia, serif" }}
                >
                  {route.subtitle}
                </p>
              </div>

              {/* Hover-state content: detail block fills the same cell.
                  Centred to match the default state's typography
                  alignment. */}
              <div
                className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center pointer-events-none"
                style={{
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 180ms ease',
                }}
              >
                <h5
                  className="font-serif text-xl mb-3 leading-tight"
                  style={{ color: route.accent, fontWeight: 600 }}
                >
                  {route.name}
                </h5>
                <div className="grid grid-cols-2 gap-3 mb-3 w-full max-w-sm">
                  <div>
                    <p
                      className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5"
                      style={{ fontFamily: "'Playfair', Georgia, serif" }}
                    >
                      Volume
                    </p>
                    <p className="text-base font-medium text-foreground">
                      {route.volume}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5"
                      style={{ fontFamily: "'Playfair', Georgia, serif" }}
                    >
                      Location
                    </p>
                    <p className="text-base font-medium text-foreground">
                      {route.location}
                    </p>
                  </div>
                </div>
                <p
                  className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5"
                  style={{ fontFamily: "'Playfair', Georgia, serif" }}
                >
                  Waste types
                </p>
                <p className="text-base text-foreground mb-3 max-w-sm">
                  {route.wasteTypes}
                </p>
                <p
                  className="text-sm text-muted-foreground leading-relaxed max-w-sm"
                  style={{ fontFamily: "'Playfair', Georgia, serif" }}
                >
                  {route.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p
        className="text-center text-sm text-muted-foreground mt-6"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        {hoveredRoute
          ? 'Hover any other route to compare'
          : 'Hover any route for details on volume, location, and waste types'}
      </p>
    </div>
  );
}
