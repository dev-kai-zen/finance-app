import { db } from "@/infrastructure/database/client";
import {
  deletePocketRecord,
  findPocketById,
} from "@/modules/accounts/repositories/pockets.repository";
import { canDeletePocket } from "@/modules/accounts/services/can-delete-pocket.service";
import {
  getDefaultAccounts,
  setDefaultExpenseAccount,
  setDefaultIncomeAccount,
} from "@/modules/settings";

export function deletePocket(id: string): void {
  db.transaction((tx) => {
    const pocket = findPocketById(id, tx);
    if (!pocket) {
      throw new Error(`Pocket not found: ${id}`);
    }
    if (!pocket.isArchived) {
      throw new Error("Archive the pocket before permanently deleting it.");
    }
    if (!canDeletePocket(id, tx)) {
      throw new Error(
        "Cannot permanently delete a pocket that has transaction history, presets, or scheduled transactions. Keep it archived instead.",
      );
    }

    const defaults = getDefaultAccounts(tx);
    if (defaults.defaultExpensePocketId === id) {
      setDefaultExpenseAccount(defaults.defaultExpenseAccountId, null, tx);
    }
    if (defaults.defaultIncomePocketId === id) {
      setDefaultIncomeAccount(defaults.defaultIncomeAccountId, null, tx);
    }

    deletePocketRecord(id, tx);
  });
}
