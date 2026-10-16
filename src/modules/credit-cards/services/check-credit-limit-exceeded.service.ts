import { db, type DbContext } from "@/infrastructure/database/client";
import { findAccountById, getCreditCardDetails } from "@/modules/accounts";
import { computeCreditCardAccountMonitoring } from "./get-credit-card-monitoring.service";

export interface CheckCreditLimitInput {
  accountId: string;
  expenseAmountMinorUnits: number;
  excludeTransactionId?: string | null;
  occurredAt?: Date;
  context?: DbContext;
}

export interface CreditLimitCheckResult {
  hasCreditCard: boolean;
  accountName: string;
  currencyCode: string;
  creditLimitMinorUnits: number;
  currentOutstandingMinorUnits: number;
  additionalExpenseMinorUnits: number;
  newOutstandingMinorUnits: number;
  availableLimitBeforeMinorUnits: number;
  availableLimitAfterMinorUnits: number;
  exceeds: boolean;
  exceededByMinorUnits: number;
}

export function checkCreditLimitExceeded(
  input: CheckCreditLimitInput,
): CreditLimitCheckResult {
  const {
    accountId,
    expenseAmountMinorUnits,
    excludeTransactionId,
    occurredAt = new Date(),
    context = db,
  } = input;

  const noResult: CreditLimitCheckResult = {
    hasCreditCard: false,
    accountName: "",
    currencyCode: "",
    creditLimitMinorUnits: 0,
    currentOutstandingMinorUnits: 0,
    additionalExpenseMinorUnits: Math.abs(expenseAmountMinorUnits),
    newOutstandingMinorUnits: Math.abs(expenseAmountMinorUnits),
    availableLimitBeforeMinorUnits: 0,
    availableLimitAfterMinorUnits: 0,
    exceeds: false,
    exceededByMinorUnits: 0,
  };

  if (!accountId) {
    return noResult;
  }

  const account = findAccountById(accountId, context);
  if (!account) {
    return noResult;
  }

  const details = getCreditCardDetails(accountId, context);
  if (!details || details.creditLimitMinorUnits <= 0) {
    return {
      ...noResult,
      accountName: account.name,
      currencyCode: account.currencyCode,
    };
  }

  const cardMonitoring = computeCreditCardAccountMonitoring(
    {
      id: account.id,
      name: account.name,
      currencyCode: account.currencyCode,
      creditCardDetails: details,
    },
    occurredAt,
    excludeTransactionId,
  );

  const currentOutstanding = cardMonitoring?.outstandingMinorUnits ?? 0;
  const creditLimit = details.creditLimitMinorUnits;
  const additional = Math.abs(expenseAmountMinorUnits);
  const newOutstanding = currentOutstanding + additional;
  const availableBefore = Math.max(0, creditLimit - currentOutstanding);
  const availableAfter = Math.max(0, creditLimit - newOutstanding);
  const exceeds = newOutstanding > creditLimit;
  const exceededBy = Math.max(0, newOutstanding - creditLimit);

  return {
    hasCreditCard: true,
    accountName: account.name,
    currencyCode: account.currencyCode,
    creditLimitMinorUnits: creditLimit,
    currentOutstandingMinorUnits: currentOutstanding,
    additionalExpenseMinorUnits: additional,
    newOutstandingMinorUnits: newOutstanding,
    availableLimitBeforeMinorUnits: availableBefore,
    availableLimitAfterMinorUnits: availableAfter,
    exceeds,
    exceededByMinorUnits: exceededBy,
  };
}
