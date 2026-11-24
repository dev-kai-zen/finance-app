import { db, type DbContext } from "@/infrastructure/database/client";
import { findAccountById, getCreditCardDetails } from "@/modules/accounts";
import { getAccountTransactionDelta } from "@/modules/transactions";

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

  const balance = account.openingBalanceMinorUnits +
    getAccountTransactionDelta(accountId, context, { excludeTransactionId });
  const currentOutstanding = Math.max(0, -balance);
  const creditLimit = details.creditLimitMinorUnits;
  const additional = Math.abs(expenseAmountMinorUnits);
  // Preserve prepaid credit until the replacement expense has been applied.
  const newOutstanding = Math.max(0, additional - balance);
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
