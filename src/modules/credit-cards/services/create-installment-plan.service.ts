import type { DbContext } from "@/infrastructure/database/client";
import { getCreditCardDetails } from "@/modules/accounts";
import type { Transaction } from "@/modules/transactions";
import {
  insertInstallmentPlan,
  insertInstallments,
  newCreditCardBillingId,
} from "../repositories/credit-card-billing.repository";
import type { InstallmentInput } from "../types/credit-card.types";
import {
  addBillingMonths,
  statementDateForTransaction,
} from "../utils/billing-dates";
import { buildInstallmentScheduleRows } from "../utils/build-installment-schedule";

export function createCreditCardInstallmentPlan(
  transaction: Transaction,
  input: InstallmentInput,
  context: DbContext,
): void {
  if (transaction.type !== "expense" || transaction.amountMinorUnits >= 0) {
    throw new Error("Installments are available only for credit-card expenses.");
  }
  if (!Number.isInteger(input.termMonths) || input.termMonths < 2 || input.termMonths > 120) {
    throw new Error("Installment term must be between 2 and 120 months.");
  }

  const deferredMonths = Math.max(0, Math.floor(input.deferredMonths ?? 0));
  if (deferredMonths < 0 || deferredMonths > 36) {
    throw new Error("Deferred billing months must be between 0 and 36.");
  }

  const details = getCreditCardDetails(transaction.accountId, context);
  if (!details) {
    throw new Error("Installments are available only for Credit Card accounts.");
  }

  const principal = Math.abs(transaction.amountMinorUnits);
  const baseStatementOn = statementDateForTransaction(
    transaction.occurredAt,
    details.statementDay,
  );
  const firstStatementOn =
    deferredMonths > 0
      ? addBillingMonths(baseStatementOn, deferredMonths, details.statementDay)
      : baseStatementOn;
  const now = new Date();
  const planId = newCreditCardBillingId(context);
  insertInstallmentPlan(
    {
      id: planId,
      accountId: transaction.accountId,
      purchaseTransactionId: transaction.id,
      termMonths: input.termMonths,
      principalMinorUnits: principal,
      firstStatementOn,
      deferredMonths,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    context,
  );

  insertInstallments(
    buildInstallmentScheduleRows({
      planId,
      termMonths: input.termMonths,
      principalMinorUnits: principal,
      firstStatementOn,
      statementDay: details.statementDay,
      createdAt: now,
      newInstallmentId: () => newCreditCardBillingId(context),
    }),
    context,
  );
}
