import { db } from "@/infrastructure/database/client";
import {
  FALLBACK_ACCOUNT_TYPE_BY_GROUP,
} from "../constants/account-types.constants";
import {
  AccountTypeNotFoundError,
  SystemAccountTypeDeletionError,
} from "../errors/account-types.errors";
import {
  deleteAccountTypeById,
  findAccountTypeById,
} from "../repositories/account-types.repository";
import {
  findAccountsByAccountTypeId,
  reassignAccountsType,
} from "../repositories/accounts.repository";
import type {
  AccountGroup,
  DeleteAccountTypeResult,
} from "../types/account.types";

/**
 * Deletes a custom account type and safely reassigns all referencing accounts
 * to the group-appropriate fallback system account type within an atomic database transaction.
 */
export async function deleteAccountType(
  accountTypeId: string,
): Promise<DeleteAccountTypeResult> {
  // 1. Load the account type
  const accountType = await findAccountTypeById(accountTypeId);

  // 2. Return not-found error if it does not exist
  if (!accountType) {
    throw new AccountTypeNotFoundError(accountTypeId);
  }

  // 3. Reject deletion when isSystem is true
  if (accountType.isSystem) {
    throw new SystemAccountTypeDeletionError(accountTypeId);
  }

  // 4. Determine the fallback from its account group
  const fallbackId =
    FALLBACK_ACCOUNT_TYPE_BY_GROUP[accountType.accountGroup as AccountGroup];
  if (!fallbackId) {
    throw new Error(
      `Unsupported account group "${accountType.accountGroup}" for account type "${accountTypeId}".`,
    );
  }

  const now = new Date();
  let affectedAccountsCount = 0;

  // 5. In one database transaction:
  // - Reassign every account using the deleted type to the fallback
  // - Update the affected accounts' updatedAt
  // - Delete the custom account type
  await db.transaction(async (tx) => {
    const affectedAccounts = await findAccountsByAccountTypeId(
      accountTypeId,
      tx,
    );
    affectedAccountsCount = affectedAccounts.length;

    if (affectedAccountsCount > 0) {
      await reassignAccountsType(accountTypeId, fallbackId, now, tx);
    }

    await deleteAccountTypeById(accountTypeId, tx);
  });

  return {
    deletedAccountTypeId: accountTypeId,
    reassignedToAccountTypeId: fallbackId,
    reassignedAccountsCount: affectedAccountsCount,
  };
}
