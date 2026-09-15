import { db } from "@/infrastructure/database/client";
import {
  AccountTypeHasLinkedAccountsError,
  AccountTypeNotFoundError,
  SystemAccountTypeDeletionError,
} from "@/modules/accounts/errors/account-types.errors";
import { deleteAccountTypeById, findAccountTypeById } from "@/modules/accounts/repositories/account-types.repository";
import { findAccountsByAccountTypeId } from "@/modules/accounts/repositories/accounts.repository";
import { isProtectedAccountType } from "@/modules/accounts/services/account-rules";
import type { DeleteAccountTypeResult } from "@/modules/accounts/types/account.types";

export function deleteAccountType(accountTypeId: string): DeleteAccountTypeResult {
  return db.transaction((tx) => {
    const source = findAccountTypeById(accountTypeId, tx);
    if (!source) throw new AccountTypeNotFoundError(accountTypeId);
    if (isProtectedAccountType(source)) throw new SystemAccountTypeDeletionError(accountTypeId);

    const linkedAccountsCount = findAccountsByAccountTypeId(accountTypeId, tx).length;
    if (linkedAccountsCount > 0) {
      throw new AccountTypeHasLinkedAccountsError(accountTypeId, linkedAccountsCount);
    }

    deleteAccountTypeById(accountTypeId, tx);
    return { deletedAccountTypeId: accountTypeId };
  });
}
