import { db, type DbContext } from "@/infrastructure/database/client";
import {
  findEntryForInstallment,
  findInstallmentPlanByTransactionId,
  listEntriesForTransaction,
  listInstallmentsForPlans,
} from "../repositories/credit-card-billing.repository";
import type {
  CreditCardInstallmentPlan,
  InstallmentPlanEditState,
} from "../types/credit-card.types";

export function getInstallmentPlanEditState(
  transactionId: string,
  context: DbContext = db,
): InstallmentPlanEditState {
  const plan = findInstallmentPlanByTransactionId(transactionId, context);
  const entries = listEntriesForTransaction(transactionId, context);
  const hasChargeStatementEntry = entries.some(
    (entry) => entry.entryType === "charge",
  );

  if (!plan) {
    return {
      plan: null,
      billedInstallmentCount: 0,
      canModifyInstallmentPlan: true,
      hasChargeStatementEntry,
    };
  }

  const installments = listInstallmentsForPlans([plan.id], context);
  let billedInstallmentCount = 0;
  for (const installment of installments) {
    if (findEntryForInstallment(installment.id, context)) {
      billedInstallmentCount += 1;
    }
  }

  return {
    plan,
    billedInstallmentCount,
    canModifyInstallmentPlan: billedInstallmentCount === 0,
    hasChargeStatementEntry,
  };
}

export function assertCanModifyInstallmentPlan(
  plan: CreditCardInstallmentPlan | null,
  billedInstallmentCount: number,
): void {
  if (!plan) return;
  if (billedInstallmentCount > 0) {
    throw new Error(
      "Installment settings cannot be changed after an installment has been billed on a statement.",
    );
  }
}
