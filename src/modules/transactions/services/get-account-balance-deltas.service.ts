import { and, asc, isNull, lte, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema";

/**
 * Calculates the net transaction balance delta in minor units (cents)
 * for each account using native SQLite GROUP BY aggregation.
 *
 * @param context Optional database context or transaction handle
 * @returns A dictionary mapping accountId to the sum of its transaction amounts in cents
 */
export function getAccountBalanceDeltas(
  context: DbContext = db,
): Record<string, number> {
  const rows = context
    .select({
      accountId: transactions.accountId,
      delta: sql<number>`coalesce(sum(${transactions.amountMinorUnits}), 0)`.as("delta"),
    })
    .from(transactions)
    .where(isNull(transactions.deletedAt))
    .groupBy(transactions.accountId)
    .all();

  const deltasByAccountId: Record<string, number> = {};
  for (const row of rows) {
    deltasByAccountId[row.accountId] = Number(row.delta) || 0;
  }

  return deltasByAccountId;
}

/**
 * Calculates account transaction deltas at several historical cutoff dates.
 * The returned array preserves the input order, allowing consumers to build
 * charts without accessing the transactions table directly.
 */
export function getAccountBalanceDeltasAtDates(
  cutoffDates: Date[],
  context: DbContext = db,
): Array<Record<string, number>> {
  if (cutoffDates.length === 0) return [];

  let maxCutoffTime = -Infinity;
  for (let i = 0; i < cutoffDates.length; i++) {
    const t = cutoffDates[i].getTime();
    if (t > maxCutoffTime) maxCutoffTime = t;
  }

  const rows = context
    .select({
      accountId: transactions.accountId,
      amountMinorUnits: transactions.amountMinorUnits,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(
      and(
        isNull(transactions.deletedAt),
        lte(transactions.occurredAt, new Date(maxCutoffTime)),
      ),
    )
    .orderBy(asc(transactions.occurredAt))
    .all();

  // Create an array of cutoff indices sorted chronologically: [0, 1, ..., K-1]
  const sortedIndices = Array.from({ length: cutoffDates.length }, (_, i) => i)
    .sort((a, b) => cutoffDates[a].getTime() - cutoffDates[b].getTime());

  const results: Array<Record<string, number>> = new Array(cutoffDates.length);
  const runningDeltas: Record<string, number> = {};
  let rowIdx = 0;
  const totalRows = rows.length;

  for (const idx of sortedIndices) {
    const cutoffTime = cutoffDates[idx].getTime();
    while (rowIdx < totalRows && rows[rowIdx].occurredAt.getTime() <= cutoffTime) {
      const row = rows[rowIdx];
      runningDeltas[row.accountId] =
        (runningDeltas[row.accountId] ?? 0) + row.amountMinorUnits;
      rowIdx++;
    }
    results[idx] = { ...runningDeltas };
  }

  return results;
}

/**
 * Calculates account transaction deltas at a single historical cutoff date.
 */
export function getAccountBalanceDeltasAtDate(
  cutoffDate: Date,
  context: DbContext = db,
): Record<string, number> {
  return getAccountBalanceDeltasAtDates([cutoffDate], context)[0] ?? {};
}
