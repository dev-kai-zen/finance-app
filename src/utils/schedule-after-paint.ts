/**
 * Runs callback after the next frame has been committed (double rAF).
 * Use to defer SQLite / heavy work so taps can paint first.
 */
export function scheduleAfterPaint(callback: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      callback();
    });
  });
}
