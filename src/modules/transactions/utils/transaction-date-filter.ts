export function toLocalDateKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTransactionFilterDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function normalizeDateRange(
  fromKey: string,
  toKey: string,
): { from: string; to: string } {
  return fromKey <= toKey
    ? { from: fromKey, to: toKey }
    : { from: toKey, to: fromKey };
}

export function isLocalDateKeyInRange(
  occurredAt: Date | string | null | undefined,
  fromKey: string,
  toKey: string,
): boolean {
  if (!occurredAt) return false;
  const key = toLocalDateKey(occurredAt);
  const { from, to } = normalizeDateRange(fromKey, toKey);
  return key >= from && key <= to;
}

/** Reject malformed drill-down links instead of widening them to an all-time feed. */
export function parseBudgetTransactionScope(value: string): {
  categoryIds: string[];
  dateFrom: string;
  dateTo: string;
} | null {
  function validDate(key: unknown): key is string {
    if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }
  try {
    const scope = JSON.parse(value);
    if (!scope || !Array.isArray(scope.categoryIds) || scope.categoryIds.length === 0 ||
        !scope.categoryIds.every((id: unknown) => typeof id === "string" && id.trim().length > 0) ||
        !validDate(scope.dateFrom) || !validDate(scope.dateTo) || scope.dateFrom > scope.dateTo) return null;
    return { categoryIds: [...new Set<string>(scope.categoryIds)], dateFrom: scope.dateFrom, dateTo: scope.dateTo };
  } catch {
    return null;
  }
}

export function todayLocalDateKey(): string {
  return toLocalDateKey(new Date());
}
