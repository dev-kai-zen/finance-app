import { scheduleAfterPaint } from "@/utils/schedule-after-paint";

/**
 * Shows loading state on the current frame, then runs a synchronous SQLite query.
 */
export function runDeferredSyncQuery(
  options: {
    hasCachedResult: boolean;
    setLoading: (loading: boolean) => void;
    onMarkLoaded?: () => void;
  },
  query: () => void,
): void {
  if (!options.hasCachedResult) {
    options.setLoading(true);
  }

  scheduleAfterPaint(() => {
    try {
      query();
    } finally {
      options.onMarkLoaded?.();
      options.setLoading(false);
    }
  });
}
