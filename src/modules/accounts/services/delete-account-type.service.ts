import { db } from "@/infrastructure/database/client";
import { FALLBACK_ACCOUNT_TYPE_BY_GROUP } from "@/modules/accounts/constants/account-types.constants";
import { AccountTypeNotFoundError, SystemAccountTypeDeletionError } from "@/modules/accounts/errors/account-types.errors";
import { deleteAccountTypeById, findAccountTypeById } from "@/modules/accounts/repositories/account-types.repository";
import { findAccountsByAccountTypeId, reassignAccountsType } from "@/modules/accounts/repositories/accounts.repository";
import { isProtectedAccountType } from "@/modules/accounts/services/account-rules";
import { accountGroupSchema } from "@/modules/accounts/schemas/account.schema";
import type { DeleteAccountTypeResult } from "@/modules/accounts/types/account.types";

export function deleteAccountType(accountTypeId: string): DeleteAccountTypeResult {
  // Expo's Drizzle driver is synchronous: never await inside this callback.
  return db.transaction((tx) => {
    const source = findAccountTypeById(accountTypeId, tx);
    if (!source) throw new AccountTypeNotFoundError(accountTypeId);
    if (isProtectedAccountType(source)) throw new SystemAccountTypeDeletionError(accountTypeId);
    const group = accountGroupSchema.parse(source.accountGroup);
    const fallbackId = FALLBACK_ACCOUNT_TYPE_BY_GROUP[group];
    const fallback = findAccountTypeById(fallbackId, tx);
    if (!fallback || !fallback.isSystem || fallback.isArchived || fallback.accountGroup !== group) {
      throw new Error("The required system Others type is unavailable. No accounts were changed.");
    }
    const count = findAccountsByAccountTypeId(accountTypeId, tx).length;
    reassignAccountsType(accountTypeId, fallbackId, new Date(), tx);
    deleteAccountTypeById(accountTypeId, tx);
    return { deletedAccountTypeId: accountTypeId, reassignedToAccountTypeId: fallbackId, reassignedAccountsCount: count };
  });
}
