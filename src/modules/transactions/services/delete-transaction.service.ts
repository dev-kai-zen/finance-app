import { db } from "@/infrastructure/database/client";
import {
  findTransactionById,
  findTransactionsByGroupId,
  softDeleteTransaction,
  softDeleteTransactionsByGroupId,
} from "../repositories/transactions.repository";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";
import { logTelemetryEvent } from "@/infrastructure/telemetry";

export function removeTransaction(id: string): void {
  if (!id) {
    throw new Error("Transaction ID is required to delete.");
  }

  let deletedType: "expense" | "income" | "transfer" = "expense";

  db.transaction((tx) => {
    const existing = findTransactionById(id, tx);
    if (!existing) {
      const groupLegs = findTransactionsByGroupId(id, tx).filter(
        (leg) => leg.deletedAt === null,
      );
      if (groupLegs.length === 0) {
        throw new Error(`Transaction with ID ${id} was not found.`);
      }

      deletedType = "transfer";
      softDeleteTransactionsByGroupId(id, new Date(), tx);
      reconcileCreditCardBillingInContext(new Date(), tx);
      return;
    }

    deletedType = existing.type;

    if (existing.transactionGroupId && existing.type === "transfer") {
      softDeleteTransactionsByGroupId(existing.transactionGroupId, new Date(), tx);
      reconcileCreditCardBillingInContext(new Date(), tx);
      return;
    }

    softDeleteTransaction(id, new Date(), tx);
    reconcileCreditCardBillingInContext(new Date(), tx);
  });

  logTelemetryEvent("transaction_deleted", { type: deletedType });
}
