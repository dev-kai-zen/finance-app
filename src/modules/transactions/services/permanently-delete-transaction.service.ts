import { db } from "@/infrastructure/database/client";
import {
  deleteTransaction,
  deleteTransactionsByGroupId,
  findTransactionById,
  findTransactionsByGroupId,
} from "../repositories/transactions.repository";

export function permanentlyDeleteTransaction(id: string): void {
  if (!id) {
    throw new Error("Transaction ID is required to permanently delete.");
  }

  db.transaction((tx) => {
    const existing = findTransactionById(id, tx);
    if (!existing) {
      throw new Error(`Transaction with ID ${id} was not found.`);
    }
    if (!existing.deletedAt) {
      throw new Error("Only transactions in Trash can be permanently deleted.");
    }

    if (existing.transactionGroupId) {
      const groupedTransactions = findTransactionsByGroupId(
        existing.transactionGroupId,
        tx,
      );
      if (groupedTransactions.some((transaction) => !transaction.deletedAt)) {
        throw new Error(
          "This transfer must be fully moved to Trash before it can be permanently deleted.",
        );
      }

      deleteTransactionsByGroupId(existing.transactionGroupId, tx);
      return;
    }

    deleteTransaction(id, tx);
  });
}
