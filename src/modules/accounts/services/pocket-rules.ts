import type { DbContext } from "@/infrastructure/database/client";
import { findPocketById } from "@/modules/accounts/repositories/pockets.repository";

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
