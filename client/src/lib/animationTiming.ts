/**
 * Framerate-aware easing helper, calibrated against Court's
 * preferred Safari feel.
 *
 * Per-frame easing of the form `x += (target - x) * α` is
 * framerate-dependent. Court measured actual RAF rates per browser
 * on his ProMotion MacBook dev build:
 *
 *   Chrome  ~90 Hz  (dt ~11ms)  -> α=0.10 -> 104ms τ (too reactive)
 *   Safari  ~45 Hz  (dt ~22ms)  -> α=0.10 -> 211ms τ (preferred feel)
 *   Firefox ~22 Hz  (dt ~44ms)  -> α=0.10 -> 431ms τ (too laggy)
 *
 * easeAlpha(dt, α_ref) rescales α at every framerate to produce the
 * SAME time constant α_ref would produce at REFERENCE_FRAMERATE_HZ.
 *
 * Use:
 *   ptr.x += (target - ptr.x) * easeAlpha(dt, 0.10);
 *
 * If production framerates (typically 60-120Hz on most devices)
 * make the site feel too laggy or too snappy after deployment,
 * tune ONE number: REFERENCE_FRAMERATE_HZ.
 *
 * See scripts/cross-browser-audit.md (Issue F.3) for the audit and
 * the diagnostic data this is calibrated against.
 */

/**
 * The framerate at which the original α coefficients (0.10, 0.18,
 * 0.12) were chosen to feel right. Set to 45 to match Safari's
 * measured dev behaviour, which Court has identified as his
 * preferred feel.
 *
 * Tune ONE number, not three.
 *
 * Useful reference points (time constant τ at original α=0.10):
 *   22  -> Firefox-dev feel - too laggy (431ms τ)
 *   30  -> midway between Firefox and Safari (316ms τ)
 *   45  -> Safari-dev feel - Court's current preference (211ms τ)
 *   60  -> old "intended" 60Hz feel (158ms τ)
 *   90  -> Chrome-dev feel - too reactive (104ms τ)
 */
export const REFERENCE_FRAMERATE_HZ = 45;

/**
 * Convert an α coefficient (tuned to feel correct at
 * REFERENCE_FRAMERATE_HZ) into the equivalent per-frame coefficient
 * at the current frame's dt.
 *
 *   α_dt = 1 - (1 - α_ref)^(dt * REFERENCE_FRAMERATE_HZ)
 *
 * At dt = 1/REFERENCE_FRAMERATE_HZ, returns alphaRef unchanged.
 * At dt < 1/REFERENCE_FRAMERATE_HZ (faster framerate), returns
 * smaller α - slower per frame, same time constant.
 * At dt > 1/REFERENCE_FRAMERATE_HZ (slower framerate), returns
 * larger α - faster per frame, same time constant.
 */
export function easeAlpha(dt: number, alphaRef: number): number {
  if (!(dt > 0)) return 0;
  const dtClamped = Math.min(dt, 0.1);
  return 1 - Math.pow(1 - alphaRef, dtClamped * REFERENCE_FRAMERATE_HZ);
}
