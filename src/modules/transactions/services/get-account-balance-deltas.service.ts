import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findAccountBalanceDeltaRows,
  findAccountTransactionDelta,
  findAccountTransactionDeltasUpToDate,
} from "../repositories/transactions.repository";

/**
 * Calculates the net transaction balance delta in minor units (cents)
 * for each account using native SQLite GROUP BY aggregation.
 *
 * @param context Optional database context or transaction handle
 * @returns A dictionary mapping accountId to the sum of its transaction amounts in cents
 */
export function getAccountBalanceDeltas(
  context: DbContext = db,
  cutoffDate?: Date,
): Record<string, number> {
  const rows = findAccountBalanceDeltaRows(context, cutoffDate);

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

  const rows = findAccountTransactionDeltasUpToDate(
    new Date(maxCutoffTime),
    context,
  );

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

/**
 * Calculates the net transaction balance delta in minor units (cents)
 * for a single account using native SQLite scalar aggregation.
 * Supports excluding a specific transaction (e.g. during transaction edits).
 */
export function getAccountTransactionDelta(
  accountId: string,
  context: DbContext = db,
  options?: { excludeTransactionId?: string | null; asOf?: Date },
): number {
  return findAccountTransactionDelta(accountId, context, options);
}
