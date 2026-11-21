const listeners = new Set<() => void>();

export function subscribeCategoryChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function notifyCategoryChanges(): void {
  for (const listener of listeners) listener();
}
