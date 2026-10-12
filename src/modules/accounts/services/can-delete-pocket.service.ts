import { db, type DbContext } from "@/infrastructure/database/client";
import { getPocketIdsWithSchedules } from "@/modules/scheduled-transactions";
import { getPocketIdsInUseByTransactions } from "@/modules/transactions";

export function getPocketIdsInUse(context: DbContext = db): Set<string> {
  const transactionPockets = getPocketIdsInUseByTransactions(context);
  const scheduledPockets = getPocketIdsWithSchedules(context);
  const inUse = new Set(transactionPockets);
  for (const id of scheduledPockets) {
    inUse.add(id);
  }
  return inUse;
}

export function canDeletePocket(
  pocketId: string,
  context: DbContext = db,
): boolean {
  return !getPocketIdsInUse(context).has(pocketId);
}
