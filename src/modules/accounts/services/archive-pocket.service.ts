import { db } from "@/infrastructure/database/client";
import { findAccountById } from "@/modules/accounts/repositories/accounts.repository";
import {
  findPocketById,
  updatePocketRecord,
} from "@/modules/accounts/repositories/pockets.repository";
import { getPocketsWithBalances } from "@/modules/accounts/services/get-pockets-with-balances.service";
import {
  getPocketRestoreBlockReason,
  requirePocketForAccount,
} from "@/modules/accounts/services/pocket-rules";

export function setPocketArchived(id: string, isArchived: boolean): void {
  db.transaction((tx) => {
    const existing = findPocketById(id, tx);
    if (!existing) throw new Error(`Pocket not found: ${id}`);
    requirePocketForAccount(id, existing.accountId, tx, { allowArchived: true });
    if (isArchived) {
      const balance = getPocketsWithBalances(tx).find((item) => item.id === id)
        ?.currentBalanceMinorUnits ?? 0;
      if (balance !== 0) {
        throw new Error("Move the remaining pocket balance to Main before archiving it.");
      }
    } else {
      const parent = findAccountById(existing.accountId, tx);
      const restoreBlockReason = getPocketRestoreBlockReason(parent);
      if (restoreBlockReason) {
        throw new Error(restoreBlockReason);
      }
    }
    updatePocketRecord(id, { isArchived, updatedAt: new Date() }, tx);
  });
}
