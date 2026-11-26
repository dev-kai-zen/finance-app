import { db, type DbContext } from "@/infrastructure/database/client";
import { findPocketBalanceDeltaRows } from "../repositories/transactions.repository";

export function getPocketTransactionBalanceDeltas(
  context: DbContext = db,
): Record<string, number> {
  const rows = findPocketBalanceDeltaRows(context);
  const deltas: Record<string, number> = {};
  for (const row of rows) {
    if (row.pocketId) {
      deltas[row.pocketId] = Number(row.delta) || 0;
    }
  }
  return deltas;
}

export function getPocketBalanceDeltasAtDate(
  cutoffDate: Date,
  context: DbContext = db,
): Record<string, number> {
  const rows = findPocketBalanceDeltaRows(context, cutoffDate);
  const deltas: Record<string, number> = {};
  for (const row of rows) {
    if (row.pocketId) {
      deltas[row.pocketId] = Number(row.delta) || 0;
    }
  }
  return deltas;
}
