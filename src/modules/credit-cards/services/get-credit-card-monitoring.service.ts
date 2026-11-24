import {
  getAccountsWithBalances,
  type AccountListItem,
} from "@/modules/accounts";
import {
  getCurrencyPreferences,
  getExchangeRateMap,
} from "@/modules/currencies";
import { getAccountLedgerTransactions } from "@/modules/transactions";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import {
  listEntriesForStatements,
  listInstallmentPlansForAccount,
  listStatementsForAccount,
} from "../repositories/credit-card-billing.repository";
import type {
  CreditCardMonitoringItem,
  CreditCardMonitoringSummary,
} from "../types/credit-card.types";
import { endOfMonth, toCalendarDate } from "../utils/billing-dates";
import {
  calculateCreditCardAvailableLimit,
  calculateCreditCardBilled,
  calculateCreditCardOutstanding,
  calculateCreditCardUnbilled,
  calculateCreditCardUtilization,
} from "../utils/credit-card-computations";
import { ensureCreditCardBillingReconciled } from "./reconcile-credit-card-billing.service";

function sortCreditCardActivityNewestFirst<
  T extends { occurredOn: string; id: string },
>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const byDate = right.occurredOn.localeCompare(left.occurredOn);
    if (byDate !== 0) return byDate;
    return right.id.localeCompare(left.id);
  });
}

export function computeCreditCardAccountMonitoring(
  account: {
    id: string;
    name: string;
    currencyCode: string;
    creditCardDetails?: {
      creditLimitMinorUnits: number;
      statementDay: number;
      paymentDueDay: number;
    } | null;
  },
  today = new Date(),
  excludeTransactionId?: string | null,
): CreditCardMonitoringItem | null {
  if (!account.creditCardDetails) {
    return null;
  }
  const details = account.creditCardDetails;
  const todayOn = toCalendarDate(today);
  const currentMonthEnd = endOfMonth(today);

  const statements = listStatementsForAccount(account.id);
  const entries = listEntriesForStatements(
    statements.map((statement) => statement.id),
  );
  const entriesByStatementId = new Map<string, typeof entries>();
  const billedTransactionIds = new Set<string>();
  const installmentBilledByTxId = new Map<string, number>();
  const allocatedCreditsByTxId = new Map<string, number>();

  for (const entry of entries) {
    let bucket = entriesByStatementId.get(entry.statementId);
    if (!bucket) {
      bucket = [];
      entriesByStatementId.set(entry.statementId, bucket);
    }
    bucket.push(entry);

    if (entry.transactionId) {
      if (entry.entryType === "charge" || entry.entryType === "installment") {
        billedTransactionIds.add(entry.transactionId);
      }
      if (entry.entryType === "installment") {
        installmentBilledByTxId.set(
          entry.transactionId,
          (installmentBilledByTxId.get(entry.transactionId) ?? 0) +
            entry.amountMinorUnits,
        );
      }
      allocatedCreditsByTxId.set(
        entry.transactionId,
        (allocatedCreditsByTxId.get(entry.transactionId) ?? 0) - entry.amountMinorUnits,
      );
    }
  }

  const statementSummaries = statements.map((statement) => {
    const statementEntries = entriesByStatementId.get(statement.id) ?? [];
    let totalAmount = 0;
    for (const entry of statementEntries) {
      totalAmount += entry.amountMinorUnits;
    }
    return {
      ...statement,
      remainingAmountMinorUnits: Math.max(0, totalAmount),
      entries: statementEntries,
    };
  });
  const dueThisMonth = statementSummaries
    .filter(
      (statement) =>
        statement.dueOn <= currentMonthEnd &&
        statement.remainingAmountMinorUnits > 0,
    )
    .reduce(
      (sum, statement) => sum + statement.remainingAmountMinorUnits,
      0,
    );
  const overdue = statementSummaries
    .filter(
      (statement) =>
        statement.dueOn < todayOn &&
        statement.remainingAmountMinorUnits > 0,
    )
    .reduce(
      (sum, statement) => sum + statement.remainingAmountMinorUnits,
      0,
    );
  const nextDue =
    statementSummaries.find(
      (statement) => statement.remainingAmountMinorUnits > 0,
    )?.dueOn ?? null;
  const rawLedger = getAccountLedgerTransactions(account.id);
  const ledger = rawLedger.filter((transaction) =>
    !transaction.deletedAt && transaction.id !== excludeTransactionId,
  );
  const ledgerById = new Map(ledger.map((transaction) => [transaction.id, transaction]));
  const plans = listInstallmentPlansForAccount(account.id);
  const planTransactionIds = new Set(
    plans.map((plan) => plan.purchaseTransactionId),
  );
  const billedItems = statementSummaries
    .filter((statement) => statement.remainingAmountMinorUnits > 0)
    .flatMap((statement) =>
      statement.entries
        .filter((entry) =>
          ["opening_balance", "charge", "installment"].includes(entry.entryType) &&
          (entry.transactionId ? ledgerById.has(entry.transactionId) : entry.entryType === "opening_balance"),
        )
        .map((entry) => ({
          id: entry.id,
          description: entry.descriptionSnapshot ?? "Billed item",
          amountMinorUnits: entry.entryType === "charge" && entry.transactionId
            ? Math.max(0, -ledgerById.get(entry.transactionId)!.amountMinorUnits)
            : Math.max(0, entry.amountMinorUnits),
          occurredOn: entry.occurredOnSnapshot,
          detail:
            statement.kind === "opening"
              ? "Opening balance"
              : `Due ${statement.dueOn}`,
        })),
    );
  const unbilledItems = ledger
    .filter(
      (transaction) =>
        transaction.amountMinorUnits < 0 &&
        !planTransactionIds.has(transaction.id) &&
        !billedTransactionIds.has(transaction.id),
    )
    .map((transaction) => ({
      id: transaction.id,
      description: transaction.name ?? transaction.note ?? "Card purchase",
      amountMinorUnits: Math.abs(transaction.amountMinorUnits),
      occurredOn: toCalendarDate(transaction.occurredAt),
      detail: "One-time purchase",
    }));
  for (const plan of plans.filter((item) => item.status === "active")) {
    if (
      excludeTransactionId &&
      plan.purchaseTransactionId === excludeTransactionId
    ) {
      continue;
    }
    const purchase = ledgerById.get(plan.purchaseTransactionId);
    if (!purchase) continue;
    const billedPrincipal =
      installmentBilledByTxId.get(plan.purchaseTransactionId) ?? 0;
    const remainingPrincipal = Math.max(
      0,
      plan.principalMinorUnits - billedPrincipal,
    );
    if (remainingPrincipal <= 0) continue;
    const isDeferred =
      (plan.deferredMonths ?? 0) > 0 && plan.firstStatementOn > todayOn;
    const detail = isDeferred
      ? `${plan.termMonths}-mo installment · BNPL: First bill on ${plan.firstStatementOn}`
      : `${plan.termMonths}-month installment · remaining principal`;
    unbilledItems.push({
      id: plan.id,
      description: purchase.name ?? "Installment purchase",
      amountMinorUnits: remainingPrincipal,
      occurredOn: toCalendarDate(purchase.occurredAt),
      detail,
    });
  }
  const sortedBilledItems = sortCreditCardActivityNewestFirst(billedItems);
  const sortedUnbilledItems =
    sortCreditCardActivityNewestFirst(unbilledItems);
  const unallocatedCredits = ledger
    .filter((transaction) => transaction.amountMinorUnits > 0)
    .reduce((sum, transaction) => {
      const allocated = Math.max(0, allocatedCreditsByTxId.get(transaction.id) ?? 0);
      return sum + Math.max(0, transaction.amountMinorUnits - allocated);
    }, 0);
  const billed = calculateCreditCardBilled(statementSummaries);
  const unbilled = calculateCreditCardUnbilled(
    sortedUnbilledItems,
    unallocatedCredits,
  );
  const outstanding = calculateCreditCardOutstanding(billed, unbilled);
  const availableCredit = calculateCreditCardAvailableLimit(
    details.creditLimitMinorUnits,
    outstanding,
  );
  const utilizationPercent = calculateCreditCardUtilization(
    details.creditLimitMinorUnits,
    outstanding,
  );
  return {
    accountId: account.id,
    accountName: account.name,
    currencyCode: account.currencyCode,
    creditLimitMinorUnits: details.creditLimitMinorUnits,
    billedMinorUnits: billed,
    unbilledMinorUnits: unbilled,
    outstandingMinorUnits: outstanding,
    availableCreditMinorUnits: availableCredit,
    utilizationPercent,
    dueThisMonthMinorUnits: Math.min(dueThisMonth, billed),
    overdueMinorUnits: Math.min(overdue, billed),
    nextDueOn: nextDue,
    activeInstallmentCount: plans.filter(
      (plan) => plan.status === "active",
    ).length,
    billedItems: sortedBilledItems,
    unbilledItems: sortedUnbilledItems,
    statements: statementSummaries.reverse(),
  };
}

export function getCreditCardMonitoring(
  today = new Date(),
  preloadedAccounts?: readonly AccountListItem[],
): CreditCardMonitoringSummary {
  ensureCreditCardBillingReconciled(today);
  const sourceAccounts =
    preloadedAccounts ??
    getAccountsWithBalances(undefined, { includeManagementFlags: false });
  const cards: CreditCardMonitoringItem[] = sourceAccounts
    .filter((account) => account.creditCardDetails && !account.isArchived)
    .map((account) => computeCreditCardAccountMonitoring(account, today)!)
    .filter(Boolean);
  const homeCurrency = getCurrencyPreferences().defaultCurrency;
  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY);

  return {
    cards,
    dueThisMonthMinorUnits: cards.reduce(
      (sum, card) =>
        sum +
        convertCurrencyMinorUnits(
          card.dueThisMonthMinorUnits,
          card.currencyCode,
          homeCurrency,
          ratesMap,
          DEFAULT_BASE_CURRENCY,
        ),
      0,
    ),
    overdueMinorUnits: cards.reduce(
      (sum, card) =>
        sum +
        convertCurrencyMinorUnits(
          card.overdueMinorUnits,
          card.currencyCode,
          homeCurrency,
          ratesMap,
          DEFAULT_BASE_CURRENCY,
        ),
      0,
    ),
  };
}
