import { db } from "@/infrastructure/database/client";
import type { TransactionAttachment } from "../types/transaction.types";
import {
  deleteTransaction,
  deleteTransactionsByGroupId,
  findTransactionById,
  findTransactionsByGroupId,
  listDeletedTransactionRecords,
} from "../repositories/transactions.repository";
import {
  finalizeRemovedAttachmentFiles,
  queueTransactionAttachmentDeletionsInContext,
  triggerTransactionAttachmentSync,
} from "./transaction-attachments.service";

export function permanentlyDeleteAllDeletedTransactions(): void {
  if (listDeletedTransactionRecords().length === 0) {
    return;
  }

  const attachments = db.transaction((tx) => {
    const deletedRows = listDeletedTransactionRecords(tx);
    if (deletedRows.length === 0) {
      return [] as TransactionAttachment[];
    }

    const processedGroupIds = new Set<string>();
    const queuedAttachments: TransactionAttachment[] = [];

    for (const row of deletedRows) {
      const groupId = row.transactionGroupId;
      if (!groupId || processedGroupIds.has(groupId)) {
        continue;
      }

      const groupedTransactions = findTransactionsByGroupId(groupId, tx);
      if (groupedTransactions.every((transaction) => transaction.deletedAt)) {
        processedGroupIds.add(groupId);
        queuedAttachments.push(
          ...queueTransactionAttachmentDeletionsInContext(
            groupedTransactions.map((transaction) => transaction.id),
            tx,
          ),
        );
        deleteTransactionsByGroupId(groupId, tx);
      }
    }

    for (const row of deletedRows) {
      if (row.transactionGroupId && processedGroupIds.has(row.transactionGroupId)) {
        continue;
      }

      const existing = findTransactionById(row.id, tx);
      if (!existing?.deletedAt) {
        continue;
      }

      queuedAttachments.push(
        ...queueTransactionAttachmentDeletionsInContext([existing.id], tx),
      );
      deleteTransaction(existing.id, tx);
    }

    return queuedAttachments;
  });

  finalizeRemovedAttachmentFiles(attachments);
  triggerTransactionAttachmentSync();
}
