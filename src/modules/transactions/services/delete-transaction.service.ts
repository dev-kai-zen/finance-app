import { db } from "@/infrastructure/database/client";
import {
  findTransactionById,
  softDeleteTransaction,
  softDeleteTransactionsByGroupId,
} from "../repositories/transactions.repository";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";

export function removeTransaction(id: string): void {
  if (!id) {
    throw new Error("Transaction ID is required to delete.");
  }

  db.transaction((tx) => {
    const existing = findTransactionById(id, tx);
    if (!existing) {
      throw new Error(`Transaction with ID ${id} was not found.`);
    }

    if (existing.transactionGroupId && existing.type === "transfer") {
      softDeleteTransactionsByGroupId(existing.transactionGroupId, new Date(), tx);
      reconcileCreditCardBillingInContext(new Date(), tx);
      return;
    }

    softDeleteTransaction(id, new Date(), tx);
    reconcileCreditCardBillingInContext(new Date(), tx);
  });
}
