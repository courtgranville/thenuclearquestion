// ─────────────────────────────────────────────────────────────────
// PosterControlButton.tsx - shared primitive for every interactive
// control beneath a poster's visualisation.
//
// Spec (feature/button-prominence brief):
//
//   - Border 1.5px, accent at 0.45 alpha inactive / full active.
//   - Cream bg inactive, accent at 0.10 alpha active.
//   - px-4 py-2, text-sm Playfair, 500 weight inactive / 600 active.
//   - Focus ring 2px accent at 0.5 alpha, offset 2px.
//   - Hover (inactive): border alpha → 0.7, bg → accent at 0.04, 120 ms.
//   - Active additionally underlines the label in accent at 2px
//     stroke, 4px below baseline.
//   - Optional leading coloured dot (category buttons).
//   - Optional aux suffix (count, MW, etc.).
//   - Optional ▾ when the button reveals content below the fold.
//
// Use this for every poster control instead of bespoke <button>
// markup. Earlier per-poster styling (low-alpha borders, transparent
// bg) read as muted labels rather than clickable controls; this
// primitive raises presence without losing editorial restraint.
// ─────────────────────────────────────────────────────────────────

import { useMemo } from 'react';

const SERIF_STYLE = { fontFamily: "'Playfair', Georgia, serif" } as const;
const DEFAULT_ACCENT = '#0d1a1e';
const CREAM = '#ECE7DF';

export interface PosterControlButtonProps {
  label: string;
  isActive?: boolean;
  /** Status/category colour. Defaults to the foreground dark. */
  accentColour?: string;
  onClick: () => void;
  /** Adds a small downward triangle hint after the label so the
   *  user gets a scroll cue when the click reveals content below
   *  the fold. */
  revealsContentBelow?: boolean;
  /** Optional suffix (e.g. "9 · 6,472 MW"). Rendered after the
   *  label in muted-foreground at the same text size. */
  aux?: React.ReactNode;
  /** Small accent-coloured dot to the left of the label. Use for
   *  category / status filters. */
  leadingDot?: boolean;
  /** Optional aria-label override (default: the label string). */
  ariaLabel?: string;
  disabled?: boolean;
  /** Adjacency hint - when used in a segmented pair the buttons
   *  share borders, drop the corner radius on touching edges. */
  segmentedPosition?: 'first' | 'middle' | 'last' | 'standalone';
}

/** Convert a 6-digit hex to rgba with explicit alpha. */
function withAlpha(hex: string, a: number): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default function PosterControlButton({
  label,
  isActive = false,
  accentColour = DEFAULT_ACCENT,
  onClick,
  revealsContentBelow = false,
  aux,
  leadingDot = false,
  ariaLabel,
  disabled = false,
  segmentedPosition = 'standalone',
}: PosterControlButtonProps) {
  const accent = accentColour;
  const borderInactive = useMemo(() => withAlpha(accent, 0.45), [accent]);
  const borderActive = accent;
  const bgInactive = CREAM;
  const bgActive = useMemo(() => withAlpha(accent, 0.10), [accent]);
  const bgHover = useMemo(() => withAlpha(accent, 0.04), [accent]);
  const borderHover = useMemo(() => withAlpha(accent, 0.7), [accent]);
  const focusRing = useMemo(() => withAlpha(accent, 0.5), [accent]);

  // Segmented-pair radius handling: drop the corner where this
  // button meets its neighbour so the pair reads as one bar.
  const radiusClass =
    segmentedPosition === 'first'
      ? 'rounded-r-none rounded-l-sm'
      : segmentedPosition === 'last'
        ? 'rounded-l-none rounded-r-sm'
        : segmentedPosition === 'middle'
          ? 'rounded-none'
          : 'rounded-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isActive}
      aria-label={ariaLabel ?? label}
      className={[
        'group relative inline-flex items-center gap-2 px-4 py-2',
        radiusClass,
        'transition-[background-color,border-color,box-shadow,color] duration-[120ms] ease-out',
        'outline-none cursor-pointer disabled:cursor-default disabled:opacity-50',
      ].join(' ')}
      style={{
        ...SERIF_STYLE,
        border: `1.5px solid ${isActive ? borderActive : borderInactive}`,
        backgroundColor: isActive ? bgActive : bgInactive,
        color: isActive ? accent : '#0d1a1e',
        // CSS custom prop hooks so :hover / :focus can read them
        // from inline styles (Tailwind arbitrary values can't read
        // dynamic accent colours, so we wire them through the
        // ::-vars and a tiny style block below).
        ['--btn-border-hover' as string]: borderHover,
        ['--btn-bg-hover' as string]: bgHover,
        ['--btn-focus-ring' as string]: focusRing,
      }}
      onMouseEnter={(e) => {
        if (isActive || disabled) return;
        (e.currentTarget as HTMLButtonElement).style.borderColor = borderHover;
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = bgHover;
      }}
      onMouseLeave={(e) => {
        if (isActive || disabled) return;
        (e.currentTarget as HTMLButtonElement).style.borderColor = borderInactive;
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = bgInactive;
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          `0 0 0 2px ${CREAM}, 0 0 0 4px ${focusRing}`;
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
      }}
    >
      {leadingDot && (
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
      )}
      <span
        className="text-sm leading-none"
        style={{
          fontWeight: isActive ? 600 : 500,
          // Underline the label when active, 2px stroke, 4px below
          // baseline. Uses text-decoration so it tracks the actual
          // label width rather than the button width.
          textDecoration: isActive ? 'underline' : 'none',
          textDecorationColor: accent,
          textDecorationThickness: '2px',
          textUnderlineOffset: '4px',
        }}
      >
        {label}
        {revealsContentBelow && (
          <span
            className="ml-1.5 inline-block"
            style={{ fontSize: '0.8em', color: isActive ? accent : '#0d1a1e' }}
            aria-hidden="true"
          >
            {'▾'}
          </span>
        )}
      </span>
      {aux && (
        <span
          className="text-sm tabular-nums"
          style={{ color: 'rgba(13,26,30,0.6)' }}
        >
          {aux}
        </span>
      )}
    </button>
  );
}
