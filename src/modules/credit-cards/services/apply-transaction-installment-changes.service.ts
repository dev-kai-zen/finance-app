import type { DbContext } from "@/infrastructure/database/client";
import type { Transaction } from "@/modules/transactions";
import { createCreditCardInstallmentPlan } from "./create-installment-plan.service";
import {
  assertCanModifyInstallmentPlan,
  getInstallmentPlanEditState,
} from "./get-installment-plan-edit-state.service";
import { removeInstallmentPlanForTransaction } from "./remove-installment-plan-for-transaction.service";
import { replaceInstallmentPlanForTransaction } from "./replace-installment-plan-for-transaction.service";
import type { InstallmentInput } from "../types/credit-card.types";

/**
 * @param installment `undefined` leaves the plan unchanged; `null` removes it when allowed; object creates or replaces.
 */
export function applyTransactionInstallmentChanges(
  transaction: Transaction,
  installment: InstallmentInput | null | undefined,
  context: DbContext,
): void {
  if (installment === undefined) return;

  const editState = getInstallmentPlanEditState(transaction.id, context);
  assertCanModifyInstallmentPlan(editState.plan, editState.billedInstallmentCount);

  if (installment === null) {
    removeInstallmentPlanForTransaction(transaction.id, context);
    return;
  }

  if (editState.plan) {
    replaceInstallmentPlanForTransaction(
      transaction,
      editState.plan,
      installment,
      context,
    );
    return;
  }

  if (editState.hasChargeStatementEntry) {
    throw new Error(
      "Installments cannot be added after this purchase was billed on a statement.",
    );
  }

  createCreditCardInstallmentPlan(transaction, installment, context);
}
