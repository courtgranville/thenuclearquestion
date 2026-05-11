/**
 * Framerate-aware easing helper.
 *
 * Per-frame easing of the form `x += (target - x) * α` is
 * framerate-dependent: the same α at 120Hz produces half the time
 * constant of 60Hz, doubling perceived responsiveness. Browsers on
 * macOS disagree on RAF rate (Chrome syncs to display refresh rate
 * -> 120Hz on ProMotion; Safari and Firefox cap at 60Hz by default),
 * so a 60Hz-tuned coefficient feels visibly more reactive in Chrome
 * on a ProMotion Mac than in Safari or Firefox on the same machine.
 *
 * `easeAlpha(dt, α60)` returns the equivalent coefficient for the
 * current frame's dt, given an α that was tuned at 60Hz. Identical
 * time-domain behaviour at any framerate.
 *
 * Use:
 *   ptr.x += (target - ptr.x) * easeAlpha(dt, 0.10);
 *
 * See scripts/cross-browser-audit.md (Issue F.2) for the audit
 * that scoped this fix.
 */

/**
 * Convert a 60Hz-tuned easing coefficient to the equivalent
 * coefficient at the current frame's dt.
 *
 *   α_dt = 1 - (1 - α_60)^(dt * 60)
 *
 * At dt = 1/60, returns alphaAt60Hz unchanged.
 * At dt = 1/120, returns roughly half.
 * At dt = 1/30 (a missed frame), returns roughly double - which
 * is also correct: a 32ms gap should ease toward the target twice
 * as much as a 16ms gap would.
 */
export function easeAlpha(dt: number, alphaAt60Hz: number): number {
  // Defensive clamps. dt should always be positive and bounded by
  // the RAF caller; if it ever leaks through as 0 or negative,
  // return 0 (no easing this frame) rather than producing a garbage
  // value.
  if (!(dt > 0)) return 0;
  // Clamp dt to a sane upper bound to avoid massive over-shoot if
  // the tab was backgrounded and we get a huge dt on the first
  // foreground frame.
  const dtClamped = Math.min(dt, 0.1);
  return 1 - Math.pow(1 - alphaAt60Hz, dtClamped * 60);
}
