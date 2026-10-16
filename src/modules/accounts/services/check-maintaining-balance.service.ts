import { db, type DbContext } from "@/infrastructure/database/client";
import { findAccountById } from "../repositories/accounts.repository";
import { getAccountLedgerTransactions } from "@/modules/transactions";

export interface CheckMaintainingBalanceInput {
  accountId: string;
  expenseAmountMinorUnits: number;
  excludeTransactionId?: string | null;
  context?: DbContext;
}

export interface MaintainingBalanceCheckResult {
  hasMaintainingBalance: boolean;
  accountName: string;
  currencyCode: string;
  maintainingBalanceMinorUnits: number;
  currentBalanceMinorUnits: number;
  additionalExpenseMinorUnits: number;
  projectedBalanceMinorUnits: number;
  shortfallMinorUnits: number;
  isUnderMaintaining: boolean;
}

export function checkMaintainingBalance(
  input: CheckMaintainingBalanceInput,
): MaintainingBalanceCheckResult {
  const {
    accountId,
    expenseAmountMinorUnits,
    excludeTransactionId,
    context = db,
  } = input;

  const noResult: MaintainingBalanceCheckResult = {
    hasMaintainingBalance: false,
    accountName: "",
    currencyCode: "",
    maintainingBalanceMinorUnits: 0,
    currentBalanceMinorUnits: 0,
    additionalExpenseMinorUnits: Math.abs(expenseAmountMinorUnits),
    projectedBalanceMinorUnits: 0,
    shortfallMinorUnits: 0,
    isUnderMaintaining: false,
  };

  if (!accountId) {
    return noResult;
  }

  const account = findAccountById(accountId, context);
  if (!account) {
    return noResult;
  }

  if (
    account.maintainingBalanceMinorUnits == null ||
    account.maintainingBalanceMinorUnits <= 0
  ) {
    return {
      ...noResult,
      accountName: account.name,
      currencyCode: account.currencyCode,
    };
  }

  const ledger = getAccountLedgerTransactions(accountId, context);
  const delta = ledger
    .filter((tx) => !excludeTransactionId || tx.id !== excludeTransactionId)
    .reduce((sum, tx) => sum + tx.amountMinorUnits, 0);

  const currentBalance = account.openingBalanceMinorUnits + delta;
  const additional = Math.abs(expenseAmountMinorUnits);
  const projectedBalance = currentBalance - additional;
  const maintainingBalance = account.maintainingBalanceMinorUnits;
  const isUnderMaintaining = projectedBalance < maintainingBalance;
  const shortfall = Math.max(0, maintainingBalance - projectedBalance);

  return {
    hasMaintainingBalance: true,
    accountName: account.name,
    currencyCode: account.currencyCode,
    maintainingBalanceMinorUnits: maintainingBalance,
    currentBalanceMinorUnits: currentBalance,
    additionalExpenseMinorUnits: additional,
    projectedBalanceMinorUnits: projectedBalance,
    shortfallMinorUnits: shortfall,
    isUnderMaintaining,
  };
}
