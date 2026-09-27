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

export function createCreditCardInstallmentPlan(
  transaction: Transaction,
  input: InstallmentInput,
  context: DbContext,
): void {
  if (transaction.type !== "expense" || transaction.amountCents >= 0) {
    throw new Error("Installments are available only for credit-card expenses.");
  }
  if (!Number.isInteger(input.termMonths) || input.termMonths < 2 || input.termMonths > 120) {
    throw new Error("Installment term must be between 2 and 120 months.");
  }

  const details = getCreditCardDetails(transaction.accountId, context);
  if (!details) {
    throw new Error("Installments are available only for Credit Card accounts.");
  }

  const principal = Math.abs(transaction.amountCents);
  const firstStatementOn = statementDateForTransaction(
    transaction.occurredAt,
    details.statementDay,
  );
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
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    context,
  );

  const baseAmount = Math.floor(principal / input.termMonths);
  let remainder = principal % input.termMonths;
  insertInstallments(
    Array.from({ length: input.termMonths }, (_, index) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      return {
        id: newCreditCardBillingId(context),
        planId,
        installmentNumber: index + 1,
        scheduledStatementOn: addBillingMonths(
          firstStatementOn,
          index,
          details.statementDay,
        ),
        principalMinorUnits: baseAmount + extra,
        interestMinorUnits: 0,
        feeMinorUnits: 0,
        createdAt: now,
      };
    }),
    context,
  );
}
