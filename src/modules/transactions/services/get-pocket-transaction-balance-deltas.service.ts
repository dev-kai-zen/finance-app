import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findPocketTransactionDeltaRows,
  findPocketTransactionDeltasWithOccurredAt,
} from "../repositories/transactions.repository";

export function getPocketTransactionBalanceDeltas(
  context: DbContext = db,
): Record<string, number> {
  const rows = findPocketTransactionDeltaRows(context);
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
  const rows = findPocketTransactionDeltasWithOccurredAt(context);

  const deltas: Record<string, number> = {};
  for (const row of rows) {
    if (row.occurredAt.getTime() > cutoffTime) continue;
    if (row.pocketId) {
      deltas[row.pocketId] = (deltas[row.pocketId] ?? 0) + row.amountMinorUnits;
    }
  }
  return deltas;
}
