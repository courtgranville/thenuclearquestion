// client/src/components/IsotopeToggle.tsx
interface IsotopeToggleProps {
  value: 0 | 1;
  onChange: (v: 0 | 1) => void;
}

/**
 * Sliding-pill segmented control: U-235 (stable) / U-238 (enriched).
 * The thumb glides between options; active label flips to the cream surface.
 */
export function IsotopeToggle({ value, onChange }: IsotopeToggleProps) {
  return (
    <div className="iso-tweaks">
      <span className="lab">Isotope</span>
      <div className="iso-switch" data-on={value}>
        <span className="thumb" />
        <button
          type="button"
          data-v="0"
          aria-pressed={value === 0}
          onClick={() => onChange(0)}
        >
          U-235
        </button>
        <button
          type="button"
          data-v="1"
          aria-pressed={value === 1}
          onClick={() => onChange(1)}
        >
          U-238
        </button>
      </div>
    </div>
  );
}
