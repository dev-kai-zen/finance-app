import { db } from "@/infrastructure/database/client";
import { updateAccountRecord } from "@/modules/accounts/repositories/accounts.repository";
import { requireAccount } from "@/modules/accounts/services/account-rules";

export function lockAccountStartingBalance(id: string): void {
  db.transaction((tx) => {
    const existing = requireAccount(id, tx);
    if (existing.startingBalanceLocked) return;
    updateAccountRecord(
      existing.id,
      { startingBalanceLocked: true, updatedAt: new Date() },
      tx,
    );
  });
}
