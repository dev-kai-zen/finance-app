import { db } from "@/infrastructure/database/client";
import { findAccountsByAccountTypeId, updateAccountRecord } from "@/modules/accounts/repositories/accounts.repository";
import { listAccountTypes, updateAccountTypeRecord } from "@/modules/accounts/repositories/account-types.repository";
import { requireAccount, requireAccountType } from "@/modules/accounts/services/account-rules";

function move<T extends { id: string }>(items: T[], id: string, direction: -1 | 1): T[] {
  if (direction !== -1 && direction !== 1) throw new Error("Invalid reorder direction.");
  const index = items.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  [items[index], items[target]] = [items[target], items[index]];
  return items;
}
export function moveAccount(id: string, direction: -1 | 1) {
  db.transaction((tx) => {
    const account = requireAccount(id, tx);
    const siblings = findAccountsByAccountTypeId(account.accountTypeId, tx).filter((a) => a.isArchived === account.isArchived);
    const now = new Date();
    move(siblings, id, direction).forEach((a, sortOrder) => updateAccountRecord(a.id, { sortOrder, updatedAt: now }, tx));
  });
}
export function moveAccountType(id: string, direction: -1 | 1) {
  db.transaction((tx) => {
    const type = requireAccountType(id, tx);
    const siblings = listAccountTypes(tx).filter((t) => t.accountGroup === type.accountGroup && t.isArchived === type.isArchived);
    const now = new Date();
    move(siblings, id, direction).forEach((t, sortOrder) => updateAccountTypeRecord(t.id, { sortOrder, updatedAt: now }, tx));
  });
}
