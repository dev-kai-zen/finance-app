import { scheduleAfterPaint } from "@/utils/schedule-after-paint";

/**
 * Shows loading state on the current frame, then runs a synchronous SQLite query.
 * Returns a cancel function that prevents a stale pending query from executing.
 */
export function runDeferredSyncQuery(
  options: {
    hasCachedResult: boolean;
    setLoading: (loading: boolean) => void;
    onMarkLoaded?: () => void;
  },
  query: () => void,
): () => void {
  if (!options.hasCachedResult) {
    options.setLoading(true);
  }

  let cancelled = false;
  const cancelScheduled = scheduleAfterPaint(() => {
    if (cancelled) return;
    try {
      query();
    } finally {
      if (!cancelled) {
        options.onMarkLoaded?.();
        options.setLoading(false);
      }
    }
  });

  return () => {
    cancelled = true;
    cancelScheduled();
  };
}
