export const MAX_CALENDAR_CACHED_MONTHS = 4;

/**
 * Retrieves a cached month's data and updates its LRU position (marks as most recently used).
 */
export function getCachedMonthTransactions<T>(
  cache: Map<string, T>,
  key: string,
): T | undefined {
  if (!cache.has(key)) return undefined;
  const data = cache.get(key)!;
  // Map preserves insertion order; deleting and re-inserting moves it to the most recent position
  cache.delete(key);
  cache.set(key, data);
  return data;
}

/**
 * Stores a month's data in the cache, evicting the least recently used month
 * if cache capacity is reached.
 */
export function setCachedMonthTransactions<T>(
  cache: Map<string, T>,
  key: string,
  data: T,
  maxCapacity = MAX_CALENDAR_CACHED_MONTHS,
): void {
  cache.delete(key);
  if (cache.size >= maxCapacity) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, data);
}
