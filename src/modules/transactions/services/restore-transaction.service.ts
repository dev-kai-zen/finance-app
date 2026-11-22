import { db } from "@/infrastructure/database/client";
import {
  findTransactionById,
  findTransactionsByGroupId,
  restoreTransaction as restoreTransactionRecord,
  type DbContext,
} from "../repositories/transactions.repository";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";

export function restoreTransaction(id: string, context: DbContext = db): void {
  if (!id) {
    throw new Error("Transaction ID is required to restore.");
  }

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

    if (groupId && (isGroupDirect || existing?.type === "transfer")) {
      const groupedTransactions = findTransactionsByGroupId(groupId, tx);
      const transferLegs = groupedTransactions.filter((t) => t.type === "transfer");
      const transferDeletedAt =
        (existing?.type === "transfer" ? existing.deletedAt : null) ??
        transferLegs.find((leg) => leg.deletedAt)?.deletedAt ??
        null;

      for (const leg of transferLegs) {
        if (leg.deletedAt) {
          restoreTransactionRecord(leg.id, tx);
        }
      }

      // If an associated fee was soft-deleted in the same operation as the transfer,
      // restore it alongside the transfer. If it was deleted independently prior to
      // the transfer (or has a distinct deletion timestamp), do not revive it.
      const feeLeg = groupedTransactions.find((t) => t.type === "expense");
      if (feeLeg?.deletedAt && transferDeletedAt) {
        const feeTime = feeLeg.deletedAt.getTime();
        const transferTime = transferDeletedAt.getTime();
        if (Math.abs(feeTime - transferTime) <= 1000) {
          restoreTransactionRecord(feeLeg.id, tx);
        }
      }

      reconcileCreditCardBillingInContext(new Date(), tx);
      return;
    }

    // For any standalone transaction (including independently deleted fee legs):
    // restore only that specific transaction record. Never revive principal legs.
    restoreTransactionRecord(id, tx);
    reconcileCreditCardBillingInContext(new Date(), tx);
  };

  if ("transaction" in context && typeof context.transaction === "function") {
    context.transaction(run);
  } else {
    run(context);
  }
}
