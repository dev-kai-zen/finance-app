import type { DbContext } from "@/infrastructure/database/client";
import { findAccountTypeById, listAccountTypes } from "@/modules/accounts/repositories/account-types.repository";
import { findAccountById } from "@/modules/accounts/repositories/accounts.repository";
import { accountGroupSchema } from "@/modules/accounts/schemas/account.schema";
import type { AccountGroup } from "@/modules/accounts/types/account.types";
export { isProtectedAccountType } from "@/modules/accounts/utils/account-type-protection";

export function requireAccount(id: string, tx: DbContext) {
  const account = findAccountById(id, tx);
  if (!account) throw new Error("This account no longer exists. Refresh and try again.");
  return account;
}
export function requireAccountType(id: string, tx: DbContext) {
  const type = findAccountTypeById(id, tx);
  if (!type) throw new Error("This account type no longer exists. Refresh and try again.");
  accountGroupSchema.parse(type.accountGroup);
  return type;
}
export function requireUniqueTypeName(name: string, group: AccountGroup, id: string | undefined, tx: DbContext) {
  if (listAccountTypes(tx).some((type) => type.id !== id && type.accountGroup === group &&
    type.name.trim().toLowerCase() === name.toLowerCase())) {
    throw new Error("An account type with this name already exists in this group, including archived types.");
  }
}
