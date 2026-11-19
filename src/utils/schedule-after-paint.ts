/**
 * Runs callback after the next frame has been committed (double rAF).
 * Use to defer SQLite / heavy work so taps can paint first.
 * Returns a cancel function that aborts the pending callback before execution.
 */
export function scheduleAfterPaint(callback: () => void): () => void {
  let cancelled = false;
  let outerFrameId: number | null = null;
  let innerFrameId: number | null = null;

  outerFrameId = requestAnimationFrame(() => {
    outerFrameId = null;
    if (cancelled) return;
    innerFrameId = requestAnimationFrame(() => {
      innerFrameId = null;
      if (cancelled) return;
      callback();
    });
  });

  return () => {
    cancelled = true;
    if (outerFrameId !== null) {
      cancelAnimationFrame(outerFrameId);
      outerFrameId = null;
    }
    if (innerFrameId !== null) {
      cancelAnimationFrame(innerFrameId);
      innerFrameId = null;
    }
  };
}
