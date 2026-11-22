import { db } from "@/infrastructure/database/client";
import {
  findTransactionById,
  findTransactionsByGroupId,
  softDeleteTransaction,
  softDeleteTransactionsByGroupId,
  type DbContext,
} from "../repositories/transactions.repository";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";
import { logTelemetryEvent } from "@/infrastructure/telemetry";

export function removeTransaction(id: string, context: DbContext = db): void {
  if (!id) {
    throw new Error("Transaction ID is required to delete.");
  }

  let deletedType: "expense" | "income" | "transfer" = "expense";

  const run = (tx: DbContext) => {
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

    deletedType = existing.type as "expense" | "income" | "transfer";

    if (existing.transactionGroupId && existing.type === "transfer") {
      softDeleteTransactionsByGroupId(existing.transactionGroupId, new Date(), tx);
      reconcileCreditCardBillingInContext(new Date(), tx);
      return;
    }

    softDeleteTransaction(id, new Date(), tx);
    reconcileCreditCardBillingInContext(new Date(), tx);
  };

  if ("transaction" in context && typeof context.transaction === "function") {
    context.transaction(run);
  } else {
    run(context);
  }

  logTelemetryEvent("transaction_deleted", { type: deletedType });
}
