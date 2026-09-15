import { db } from "@/infrastructure/database/client";
import { accountTypeInputSchema, type AccountTypeInput } from "@/modules/accounts/schemas/account.schema";
import { insertAccountType, listAccountTypes, updateAccountTypeRecord } from "@/modules/accounts/repositories/account-types.repository";
import { newAccountRecordId } from "@/modules/accounts/repositories/accounts.repository";
import { isProtectedAccountType, requireAccountType, requireUniqueTypeName } from "@/modules/accounts/services/account-rules";

export function saveAccountType(input: AccountTypeInput, id?: string): string {
  const value = accountTypeInputSchema.parse(input);
  return db.transaction((tx) => {
    const existing = id ? requireAccountType(id, tx) : null;
    if (existing && isProtectedAccountType(existing)) {
      if (existing.name !== value.name) {
        throw new Error("System account type names cannot be changed.");
      }
      if (existing.accountGroup !== value.accountGroup) {
        throw new Error("System account type classification cannot be changed.");
      }
    }
    requireUniqueTypeName(value.name, value.accountGroup, id, tx);
    const now = new Date();
    if (existing) {
      updateAccountTypeRecord(
        existing.id,
        {
          name: value.name,
          accountGroup: value.accountGroup,
          iconKey: value.iconKey,
          color: value.color,
          updatedAt: now,
        },
        tx,
      );
      return existing.id;
    }
    const newId = newAccountRecordId(tx);
    const sortOrder =
      Math.max(
        -1,
        ...listAccountTypes(tx)
          .filter((t) => t.accountGroup === value.accountGroup)
          .map((t) => t.sortOrder),
      ) + 1;
    insertAccountType({ ...value, id: newId, isSystem: false, sortOrder, createdAt: now, updatedAt: now }, tx);
    return newId;
  });
}
