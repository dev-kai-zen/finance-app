import type { DbContext } from "@/infrastructure/database/client";
import { db } from "@/infrastructure/database/client";
import { findInstallmentPlanByTransactionId } from "../repositories/credit-card-billing.repository";

export function getInstallmentPlanForTransaction(
  transactionId: string,
  context: DbContext = db,
) {
  return findInstallmentPlanByTransactionId(transactionId, context);
}
