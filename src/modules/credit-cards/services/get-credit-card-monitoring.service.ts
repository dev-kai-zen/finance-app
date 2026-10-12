import { getAccountsWithBalances } from "@/modules/accounts";
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
import { reconcileCreditCardBilling } from "./reconcile-credit-card-billing.service";

export function getCreditCardMonitoring(
  today = new Date(),
): CreditCardMonitoringSummary {
  reconcileCreditCardBilling(today);
  const todayOn = toCalendarDate(today);
  const currentMonthEnd = endOfMonth(today);
  const cards: CreditCardMonitoringItem[] = getAccountsWithBalances()
    .filter((account) => account.creditCardDetails && !account.isArchived)
    .map((account) => {
      const details = account.creditCardDetails!;
      const statements = listStatementsForAccount(account.id);
      const entries = listEntriesForStatements(
        statements.map((statement) => statement.id),
      );
      const statementSummaries = statements.map((statement) => ({
        ...statement,
        remainingAmountMinorUnits: Math.max(
          0,
          entries
            .filter((entry) => entry.statementId === statement.id)
            .reduce((sum, entry) => sum + entry.amountMinorUnits, 0),
        ),
        entries: entries.filter((entry) => entry.statementId === statement.id),
      }));
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
      const ledger = getAccountLedgerTransactions(account.id);
      const plans = listInstallmentPlansForAccount(account.id);
      const planTransactionIds = new Set(
        plans.map((plan) => plan.purchaseTransactionId),
      );
      const billedTransactionIds = new Set(
        entries
          .filter(
            (entry) =>
              entry.transactionId &&
              ["charge", "installment"].includes(entry.entryType),
          )
          .map((entry) => entry.transactionId!),
      );
      const billedItems = statementSummaries
        .filter((statement) => statement.remainingAmountMinorUnits > 0)
        .flatMap((statement) =>
          statement.entries
            .filter((entry) =>
              ["opening_balance", "charge", "installment"].includes(
                entry.entryType,
              ),
            )
            .map((entry) => ({
              id: entry.id,
              description: entry.descriptionSnapshot ?? "Billed item",
              amountMinorUnits: Math.max(0, entry.amountMinorUnits),
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
        const purchase = ledger.find(
          (transaction) => transaction.id === plan.purchaseTransactionId,
        );
        if (!purchase) continue;
        const billedPrincipal = entries
          .filter(
            (entry) =>
              entry.transactionId === plan.purchaseTransactionId &&
              entry.entryType === "installment",
          )
          .reduce((sum, entry) => sum + entry.amountMinorUnits, 0);
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
      const unbilledGross = unbilledItems.reduce(
        (sum, item) => sum + item.amountMinorUnits,
        0,
      );
      const unallocatedCredits = ledger
        .filter((transaction) => transaction.amountMinorUnits > 0)
        .reduce((sum, transaction) => {
          const allocated = entries
            .filter(
              (entry) =>
                entry.transactionId === transaction.id &&
                entry.amountMinorUnits < 0,
            )
            .reduce((eSum, entry) => eSum + Math.abs(entry.amountMinorUnits), 0);
          return sum + Math.max(0, transaction.amountMinorUnits - allocated);
        }, 0);
      const billed = calculateCreditCardBilled(statementSummaries);
      const unbilled = calculateCreditCardUnbilled(
        unbilledItems,
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
        billedItems,
        unbilledItems,
        statements: statementSummaries.reverse(),
      };
    });
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
