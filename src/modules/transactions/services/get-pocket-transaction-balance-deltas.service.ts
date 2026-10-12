import { and, isNotNull, isNull } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema";

export function getPocketTransactionBalanceDeltas(
  context: DbContext = db,
): Record<string, number> {
  const rows = context
    .select({
      pocketId: transactions.pocketId,
      amountMinorUnits: transactions.amountMinorUnits,
    })
    .from(transactions)
    .where(and(isNotNull(transactions.pocketId), isNull(transactions.deletedAt)))
    .all();
  const deltas: Record<string, number> = {};
  for (const row of rows) {
    if (row.pocketId) {
      deltas[row.pocketId] = (deltas[row.pocketId] ?? 0) + row.amountMinorUnits;
    }
  }
  return deltas;
}

export function getPocketBalanceDeltasAtDate(
  cutoffDate: Date,
  context: DbContext = db,
): Record<string, number> {
  const cutoffTime = cutoffDate.getTime();
  const rows = context
    .select({
      pocketId: transactions.pocketId,
      amountMinorUnits: transactions.amountMinorUnits,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(and(isNotNull(transactions.pocketId), isNull(transactions.deletedAt)))
    .all();

  const deltas: Record<string, number> = {};
  for (const row of rows) {
    if (row.occurredAt.getTime() > cutoffTime) continue;
    if (row.pocketId) {
      deltas[row.pocketId] = (deltas[row.pocketId] ?? 0) + row.amountMinorUnits;
    }
  }
  return deltas;
}
