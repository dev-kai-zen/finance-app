import { db } from "@/infrastructure/database/client";
import {
  deleteAccountRecord,
} from "@/modules/accounts/repositories/accounts.repository";
import {
  deleteCreditCardDetails,
} from "@/modules/accounts/repositories/credit-card-details.repository";
import {
  deletePocketsForAccount,
} from "@/modules/accounts/repositories/pockets.repository";
import { requireAccount } from "@/modules/accounts/services/account-rules";
import { canDeleteAccount } from "@/modules/accounts/services/can-delete-account.service";
import {
  getDefaultAccounts,
  setDefaultExpenseAccount,
  setDefaultIncomeAccount,
} from "@/modules/settings";

export function deleteAccount(id: string): void {
  db.transaction((tx) => {
    requireAccount(id, tx);
    if (!canDeleteAccount(id, tx)) {
      throw new Error(
        "Cannot permanently delete an account that has transaction history, presets, or scheduled transactions. Archive it instead.",
      );
    }

    const defaults = getDefaultAccounts(tx);
    if (defaults.defaultExpenseAccountId === id) {
      setDefaultExpenseAccount(null, null, tx);
    }
    if (defaults.defaultIncomeAccountId === id) {
      setDefaultIncomeAccount(null, null, tx);
    }

    deleteCreditCardDetails(id, tx);
    deletePocketsForAccount(id, tx);
    deleteAccountRecord(id, tx);
  });
}
