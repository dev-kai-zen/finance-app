import {
  getQuickSyncConfig,
  QUICK_SYNC_SETTINGS_KEYS,
} from "./quick-sync-settings.repository";

/** Matches `WIDGET_SNAPSHOT_SETTINGS_KEY` in `@/modules/widgets`. */
export const WIDGET_SNAPSHOT_SETTINGS_KEY = "widget_financial_snapshot";

const QUICK_SYNC_AUTO_SYNC_DENYLIST = new Set<string>([
  ...QUICK_SYNC_SETTINGS_KEYS,
  WIDGET_SNAPSHOT_SETTINGS_KEY,
]);

export const QUICK_SYNC_DEBOUNCE_MS = 3000;

type QuickSyncExecutor = () => void;

let executor: QuickSyncExecutor | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function registerQuickSyncDebouncedExecutor(fn: QuickSyncExecutor): void {
  executor = fn;
}

function shouldQueueForPreferenceKeys(changedKeys: readonly string[]): boolean {
  return changedKeys.some((key) => !QUICK_SYNC_AUTO_SYNC_DENYLIST.has(key));
}

export function queueDebouncedQuickSync(changedKeys?: readonly string[]): void {
  if (changedKeys !== undefined) {
    if (changedKeys.length === 0 || !shouldQueueForPreferenceKeys(changedKeys)) {
      return;
    }
  }

  if (!getQuickSyncConfig().enabled) {
    return;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    executor?.();
  }, QUICK_SYNC_DEBOUNCE_MS);
}

export function flushDebouncedQuickSync(): void {
  if (!debounceTimer) {
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = null;

  if (!getQuickSyncConfig().enabled) {
    return;
  }

  executor?.();
}

export function resetQuickSyncDebounceForTests(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  executor = null;
}
