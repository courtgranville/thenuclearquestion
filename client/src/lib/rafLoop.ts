/**
 * rafLoop.ts - visibility-gated requestAnimationFrame helper.
 *
 * Every canvas viz on the site runs an unbroken RAF loop from
 * component mount to unmount. The browser throttles backgrounded
 * tabs to ~1 Hz but does NOT pause RAF when the canvas is scrolled
 * out of viewport - so on the homepage NucleusHero keeps drawing
 * while the user scrolls down to look at the posters grid, and on
 * poster pages the canvas keeps drawing while the user reads text
 * below or above it.
 *
 * setupVisibilityRaf wraps an IntersectionObserver + document
 * visibilitychange listener around an RAF loop. The loop runs only
 * when:
 *   - The observed element intersects the viewport
 *   - The document is visible (tab not hidden)
 *
 * On resume, the callback receives `isResume = true` on the first
 * frame so it can reset its `lastT` for clean dt calculation
 * without a single giant-dt frame. After the first frame, isResume
 * is always false.
 *
 * Usage inside a useEffect:
 *
 *   const cleanup = setupVisibilityRaf(container, (now, isResume) => {
 *     if (isResume) lastT = now;
 *     const dt = (now - lastT) / 1000;
 *     lastT = now;
 *     // ...render...
 *   });
 *   return cleanup;  // along with other cleanup
 *
 * The callback should NOT call requestAnimationFrame itself; the
 * helper schedules the next frame automatically.
 */

export type FrameCallback = (now: number, isResume: boolean) => void;

/**
 * Start a visibility-gated RAF loop on the given container.
 * Returns a cleanup function that stops the loop and disconnects
 * observers. Idempotent: calling cleanup twice is a no-op.
 */
export function setupVisibilityRaf(
  container: Element,
  frame: FrameCallback,
): () => void {
  let rafId = 0;
  let visible = false;
  let tabVisible =
    typeof document === 'undefined' ? true : !document.hidden;
  let pendingResume = true;
  let cleaned = false;

  const tick = (now: number) => {
    if (cleaned) return;
    const isResume = pendingResume;
    pendingResume = false;
    frame(now, isResume);
    rafId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (rafId !== 0 || cleaned) return;
    // First frame after resume signals isResume=true so the callback
    // can reset its dt baseline (otherwise it'd see a multi-second
    // gap and clamp dt at 50ms, which is fine functionally but
    // causes a one-frame visual snap).
    pendingResume = true;
    rafId = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (rafId === 0) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  };

  const update = () => {
    if (visible && tabVisible) start();
    else stop();
  };

  // IntersectionObserver fires an initial callback synchronously
  // after observe(), so the loop will start within one task tick
  // if the element is already in viewport on mount. No flicker.
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      update();
    },
    { threshold: 0.01 },
  );
  io.observe(container);

  const onVisChange = () => {
    tabVisible = !document.hidden;
    update();
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisChange);
  }

  return () => {
    if (cleaned) return;
    cleaned = true;
    stop();
    io.disconnect();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisChange);
    }
  };
}
