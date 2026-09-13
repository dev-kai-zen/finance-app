import { db } from "@/infrastructure/database/client";
import { updateAccountRecord } from "@/modules/accounts/repositories/accounts.repository";
import { requireAccount } from "@/modules/accounts/services/account-rules";

export function setAccountArchived(id: string, isArchived: boolean) {
  db.transaction((tx) => {
    requireAccount(id, tx);
    updateAccountRecord(id, { isArchived, updatedAt: new Date() }, tx);
  });
}
