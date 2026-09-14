import { sql } from "drizzle-orm";
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
    .groupBy(transactions.accountId)
    .all();

  const deltasByAccountId: Record<string, number> = {};
  for (const row of rows) {
    deltasByAccountId[row.accountId] = Number(row.delta) || 0;
  }

  return deltasByAccountId;
}
