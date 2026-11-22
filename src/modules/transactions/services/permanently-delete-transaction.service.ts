import { db } from "@/infrastructure/database/client";
import {
  deleteTransaction,
  findTransactionById,
  findTransactionsByGroupId,
  type DbContext,
} from "../repositories/transactions.repository";
import {
  finalizeRemovedAttachmentFiles,
  queueTransactionAttachmentDeletionsInContext,
  triggerTransactionAttachmentSync,
} from "./transaction-attachments.service";

export function permanentlyDeleteTransaction(id: string, context: DbContext = db): void {
  if (!id) {
    throw new Error("Transaction ID is required to permanently delete.");
  }

  let attachments: ReturnType<typeof queueTransactionAttachmentDeletionsInContext> = [];

  const run = (tx: DbContext) => {
    let existing = findTransactionById(id, tx);
    let groupId: string | null = null;
    let isGroupDirect = false;

    if (!existing) {
      const groupTransactions = findTransactionsByGroupId(id, tx);
      if (groupTransactions.length === 0) {
        throw new Error(`Transaction with ID ${id} was not found.`);
      }
      groupId = id;
      isGroupDirect = true;
    } else {
      groupId = existing.transactionGroupId;
    }

    if (existing && !existing.deletedAt) {
      throw new Error("Only transactions in Trash can be permanently deleted.");
    }

    if (groupId && (isGroupDirect || existing?.type === "transfer")) {
      const groupedTransactions = findTransactionsByGroupId(groupId, tx);
      const transferLegs = groupedTransactions.filter(
        (transaction) => transaction.type === "transfer",
      );

      if (
        transferLegs.length === 0 ||
        transferLegs.some((transaction) => !transaction.deletedAt)
      ) {
        throw new Error(
          "This transfer must be fully moved to Trash before it can be permanently deleted.",
        );
      }

      const transferDeletedAt =
        (existing?.type === "transfer" ? existing.deletedAt : null) ??
        transferLegs.find((leg) => leg.deletedAt)?.deletedAt ??
        null;

      const idsToDelete = transferLegs.map((leg) => leg.id);

      // If an associated fee was soft-deleted together with the transfer,
      // permanently delete it as well so the group is fully purged.
      // If the fee is active or was deleted independently, preserve it.
      const feeLeg = groupedTransactions.find(
        (transaction) => transaction.type === "expense",
      );
      if (feeLeg?.deletedAt && transferDeletedAt) {
        const feeTime = feeLeg.deletedAt.getTime();
        const transferTime = transferDeletedAt.getTime();
        if (Math.abs(feeTime - transferTime) <= 1000) {
          idsToDelete.push(feeLeg.id);
        }
      }

      attachments = queueTransactionAttachmentDeletionsInContext(idsToDelete, tx);
      for (const idToDelete of idsToDelete) {
        deleteTransaction(idToDelete, tx);
      }
      return;
    }

    // Standalone transaction or independently deleted fee:
    attachments = queueTransactionAttachmentDeletionsInContext([id], tx);
    deleteTransaction(id, tx);
  };

  if ("transaction" in context && typeof context.transaction === "function") {
    context.transaction(run);
  } else {
    run(context);
  }

  finalizeRemovedAttachmentFiles(attachments);
  triggerTransactionAttachmentSync();
}
