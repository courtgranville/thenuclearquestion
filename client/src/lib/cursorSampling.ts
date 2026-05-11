/**
 * Cursor sampling that produces Firefox-equivalent input on every browser.
 *
 * Chrome delivers pointermove at hardware rate (up to 1000 Hz on Magic
 * Trackpad / gaming mice). Firefox coalesces at the OS layer to ~60 Hz
 * with averaged positions. This helper normalises both to Firefox-
 * equivalent input by averaging the coalesced samples Chrome exposes
 * per event.
 *
 * Use whenever a handler feeds a velocity calculation, smoothing, or
 * any time-derivative of cursor position. Do NOT use for one-shot
 * hit-testing, hover-trigger, or slider-position-as-fraction reads -
 * the latest position is correct for those.
 *
 * See scripts/cross-browser-audit.md (Issue F) for the audit that
 * scoped this fix.
 */
export interface SampledPointer {
  /** Averaged clientX across the coalesced sample window. */
  clientX: number;
  /** Averaged clientY across the coalesced sample window. */
  clientY: number;
  /** Number of hardware samples averaged into this read. Always >= 1. */
  sampleCount: number;
}

export function sampleCoalescedPointer(e: PointerEvent | MouseEvent): SampledPointer {
  const ev = e as PointerEvent;
  if (typeof ev.getCoalescedEvents !== 'function') {
    return { clientX: e.clientX, clientY: e.clientY, sampleCount: 1 };
  }
  const samples = ev.getCoalescedEvents();
  if (!samples || samples.length === 0) {
    return { clientX: e.clientX, clientY: e.clientY, sampleCount: 1 };
  }
  if (samples.length === 1) {
    return {
      clientX: samples[0].clientX,
      clientY: samples[0].clientY,
      sampleCount: 1,
    };
  }
  let sx = 0;
  let sy = 0;
  for (const s of samples) {
    sx += s.clientX;
    sy += s.clientY;
  }
  return {
    clientX: sx / samples.length,
    clientY: sy / samples.length,
    sampleCount: samples.length,
  };
}
