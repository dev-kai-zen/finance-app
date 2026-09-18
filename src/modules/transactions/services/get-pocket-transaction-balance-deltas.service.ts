import { and, isNotNull, isNull } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { transactions } from "@/infrastructure/database/schema";

export function getPocketTransactionBalanceDeltas(
  context: DbContext = db,
): Record<string, number> {
  const rows = context
    .select({
      pocketId: transactions.pocketId,
      amountCents: transactions.amountCents,
    })
    .from(transactions)
    .where(and(isNotNull(transactions.pocketId), isNull(transactions.deletedAt)))
    .all();
  const deltas: Record<string, number> = {};
  for (const row of rows) {
    if (row.pocketId) {
      deltas[row.pocketId] = (deltas[row.pocketId] ?? 0) + row.amountCents;
    }
  }
  return deltas;
}
