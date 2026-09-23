import { asc, isNull, sql } from "drizzle-orm";
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
      delta: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`.as("delta"),
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

  const rows = context
    .select({
      accountId: transactions.accountId,
      amountCents: transactions.amountCents,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(isNull(transactions.deletedAt))
    .orderBy(asc(transactions.occurredAt))
    .all();

  return cutoffDates.map((cutoffDate) => {
    const cutoffTime = cutoffDate.getTime();
    const deltas: Record<string, number> = {};

    for (const row of rows) {
      if (row.occurredAt.getTime() > cutoffTime) break;
      deltas[row.accountId] =
        (deltas[row.accountId] ?? 0) + row.amountCents;
    }

    return deltas;
  });
}
