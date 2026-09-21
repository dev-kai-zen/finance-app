type DatabaseReplacementListener = () => void;

const listeners = new Set<DatabaseReplacementListener>();

export function subscribeToDatabaseReplacement(
  listener: DatabaseReplacementListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function announceDatabaseReplacement(): void {
  listeners.forEach((listener) => listener());
}
