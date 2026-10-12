import type { DbContext } from "@/infrastructure/database/client";
import { findPocketById } from "@/modules/accounts/repositories/pockets.repository";
import type { Account } from "@/modules/accounts/types/account.types";

export function getPocketRestoreBlockReason(
  parent: Pick<Account, "name" | "isArchived" | "pocketEnabled"> | null | undefined,
): string | null {
  if (!parent) {
    return "The parent account for this pocket no longer exists.";
  }
  if (parent.isArchived) {
    return `Restore "${parent.name}" before restoring this pocket.`;
  }
  if (!parent.pocketEnabled) {
    return `Pockets aren't enabled for "${parent.name}". Open that account, turn on Pockets in settings, then restore this pocket.`;
  }
  return null;
}

export function requirePocketForAccount(
  pocketId: string,
  accountId: string,
  context: DbContext,
  options: { allowArchived?: boolean } = {},
) {
  const pocket = findPocketById(pocketId, context);
  if (!pocket) throw new Error(`Pocket not found: ${pocketId}`);
  if (pocket.accountId !== accountId) {
    throw new Error("The selected pocket does not belong to this account.");
  }
  if (pocket.isArchived && !options.allowArchived) {
    throw new Error("The selected pocket is archived.");
  }
  return pocket;
}
