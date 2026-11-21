import { cancelDebouncedQuickSync } from "./quick-sync-debounce";
import { getQuickSyncState, setQuickSyncRuntimeStatus } from "./quick-sync-state";

let generation = 0;
let pendingReplacements = 0;
let replacementTail: Promise<void> = Promise.resolve();
const activeOperations = new Set<Promise<unknown>>();

export function invalidateQuickSyncOperations(): void {
  generation += 1;
  cancelDebouncedQuickSync();
}

export function getQuickSyncOperationGeneration(): number {
  return generation;
}

export function isQuickSyncReplacementPending(): boolean {
  return pendingReplacements > 0;
}

export function isQuickSyncOperationCurrent(token: number): boolean {
  return token === generation && pendingReplacements === 0;
}

export function trackQuickSyncOperation<T>(operation: Promise<T>): Promise<T> {
  activeOperations.add(operation);
  void operation.then(
    () => activeOperations.delete(operation),
    () => activeOperations.delete(operation),
  );
  return operation;
}

/** Acquire before any snapshot lock. Pending requests also block new sync work. */
export async function withQuickSyncReplacement<T>(
  operation: (assertCurrent: () => void) => Promise<T>,
): Promise<T> {
  pendingReplacements += 1;
  invalidateQuickSyncOperations();
  const previous = replacementTail;
  let release!: () => void;
  replacementTail = new Promise<void>(resolve => { release = resolve; });
  try {
    await previous;
    await Promise.allSettled([...activeOperations]);
    cancelDebouncedQuickSync();
    const operationGeneration = generation;
    return await operation(() => {
      if (operationGeneration !== generation) throw new Error("The restore was superseded by another operation.");
    });
  } finally {
    pendingReplacements -= 1;
    release();
    if (pendingReplacements === 0) {
      try {
        const state = getQuickSyncState();
        if (state.status === "syncing") setQuickSyncRuntimeStatus(state.enabled ? "idle" : "disabled");
      } catch {
        // Status cleanup must not mask the replacement result on a damaged DB.
      }
    }
  }
}
