import { db } from "@/infrastructure/database/client";
import {
  deleteTransaction,
  deleteTransactionsByGroupId,
  findTransactionById,
} from "../repositories/transactions.repository";

export function removeTransaction(id: string): void {
  if (!id) {
    throw new Error("Transaction ID is required to delete.");
  }

  db.transaction((tx) => {
    const existing = findTransactionById(id, tx);
    if (!existing) {
      throw new Error(`Transaction with ID ${id} was not found.`);
    }

    if (existing.transactionGroupId) {
      deleteTransactionsByGroupId(existing.transactionGroupId, tx);
      return;
    }

    deleteTransaction(id, tx);
  });
}
