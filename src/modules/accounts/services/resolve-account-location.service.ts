import { findAccountById } from "../repositories/accounts.repository";
import { findPocketById } from "../repositories/pockets.repository";
import type { Account } from "../types/account.types";
import type { Pocket } from "../types/account.types";

export type ResolvedAccountLocation = {
  account: Account;
  pocket: Pocket | null;
};

export function resolveAccountLocation(
  accountId: string | null,
  pocketId: string | null,
): ResolvedAccountLocation | null {
  if (!accountId) return null;
  const account = findAccountById(accountId);
  if (!account || account.isArchived) return null;
  if (!pocketId) {
    return { account, pocket: null };
  }
  const pocket = findPocketById(pocketId);
  if (!pocket || pocket.accountId !== account.id || pocket.isArchived) {
    return { account, pocket: null };
  }
  return { account, pocket };
}
