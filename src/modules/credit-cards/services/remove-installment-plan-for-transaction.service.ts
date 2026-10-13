import type { DbContext } from "@/infrastructure/database/client";
import {
  deleteInstallmentPlanById,
  findInstallmentPlanByTransactionId,
} from "../repositories/credit-card-billing.repository";

export function removeInstallmentPlanForTransaction(
  transactionId: string,
  context: DbContext,
): void {
  const plan = findInstallmentPlanByTransactionId(transactionId, context);
  if (!plan) return;
  deleteInstallmentPlanById(plan.id, context);
}
