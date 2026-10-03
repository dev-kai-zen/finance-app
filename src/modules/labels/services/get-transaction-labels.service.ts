import { db, type DbContext } from "@/infrastructure/database/client";
import {
  getLabelsForTransactionIds,
  listLabelsForTransaction,
} from "../repositories/transaction-labels.repository";
import type { Label } from "../types/label.types";

export function getLabelsByTransactionIds(
  transactionIds: string[],
  context: DbContext = db,
): Map<string, Label[]> {
  return getLabelsForTransactionIds(transactionIds, context);
}

export function getLabelsForTransaction(
  transactionId: string,
  context: DbContext = db,
): Label[] {
  return listLabelsForTransaction(transactionId, context);
}
