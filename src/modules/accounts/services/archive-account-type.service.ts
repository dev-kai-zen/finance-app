import { db } from "@/infrastructure/database/client";
import { updateAccountTypeRecord } from "@/modules/accounts/repositories/account-types.repository";
import { isProtectedAccountType, requireAccountType } from "@/modules/accounts/services/account-rules";

export function setAccountTypeArchived(id: string, isArchived: boolean) {
  db.transaction((tx) => {
    const type = requireAccountType(id, tx);
    if (isProtectedAccountType(type)) throw new Error("System account types cannot be archived.");
    updateAccountTypeRecord(id, { isArchived, updatedAt: new Date() }, tx);
  });
}
