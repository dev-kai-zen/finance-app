import { db } from "@/infrastructure/database/client";
import {
  findTransactionById,
  restoreTransaction as restoreTransactionRecord,
  restoreTransactionsByGroupId,
} from "../repositories/transactions.repository";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";

export function restoreTransaction(id: string): void {
  if (!id) {
    throw new Error("Transaction ID is required to restore.");
  }

  db.transaction((tx) => {
    const existing = findTransactionById(id, tx);
    if (!existing) {
      throw new Error(`Transaction with ID ${id} was not found.`);
    }

    if (existing.transactionGroupId) {
      restoreTransactionsByGroupId(existing.transactionGroupId, tx);
      reconcileCreditCardBillingInContext(new Date(), tx);
      return;
    }

    restoreTransactionRecord(id, tx);
    reconcileCreditCardBillingInContext(new Date(), tx);
  });
}
