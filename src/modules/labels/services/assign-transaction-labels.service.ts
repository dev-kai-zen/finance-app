import { db, type DbContext } from "@/infrastructure/database/client";
import { setTransactionLabels } from "../repositories/transaction-labels.repository";

export function assignTransactionLabels(
  transactionId: string,
  labelIds: string[],
  context: DbContext = db,
): void {
  setTransactionLabels(transactionId, labelIds, context);
}
