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

export function todayLocalDateKey(): string {
  return toLocalDateKey(new Date());
}
