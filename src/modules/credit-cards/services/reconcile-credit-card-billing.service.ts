import type { DbContext } from "@/infrastructure/database/client";
import { db } from "@/infrastructure/database/client";
import { getAccountsWithBalances } from "@/modules/accounts";
import { getAccountLedgerTransactions } from "@/modules/transactions";
import {
  findEntryForInstallment,
  findInstallmentPlanByTransactionId,
  findStatement,
  insertStatement,
  insertStatementEntry,
  listEntriesForStatements,
  listInstallmentPlansForAccount,
  listInstallmentsForPlans,
  listStatementsForAccount,
  newCreditCardBillingId,
  updateStatementIssuedAmount,
  updateInstallmentPlanStatus,
} from "../repositories/credit-card-billing.repository";
import {
  dueDateForStatement,
  nextDay,
  previousStatementDate,
  statementDateForTransaction,
  toCalendarDate,
} from "../utils/billing-dates";

function ensureStatement(
  accountId: string,
  statementOn: string,
  statementDay: number,
  paymentDueDay: number,
  context: DbContext,
) {
  const existing = findStatement(
    accountId,
    statementOn,
    "billing_cycle",
    context,
  );
  if (existing) return existing;
  const now = new Date();
  return insertStatement(
    {
      id: newCreditCardBillingId(context),
      accountId,
      kind: "billing_cycle",
      cycleStartOn: nextDay(
        previousStatementDate(statementOn, statementDay),
      ),
      cycleEndOn: statementOn,
      statementOn,
      dueOn: dueDateForStatement(statementOn, paymentDueDay),
      issuedAmountMinorUnits: 0,
      createdAt: now,
      updatedAt: now,
    },
    context,
  );
}

function reconcileAccount(
  account: ReturnType<typeof getAccountsWithBalances>[number],
  today: Date,
  context: DbContext,
) {
  const details = account.creditCardDetails;
  if (!details) return;
  const todayOn = toCalendarDate(today);
  const allTransactions = getAccountLedgerTransactions(account.id, context, {
    includeDeleted: true,
  });
  const activeTransactions = allTransactions.filter((item) => !item.deletedAt);
  const transactionById = new Map(allTransactions.map((item) => [item.id, item]));

  const openingOn = toCalendarDate(account.openingBalanceAt);
  const openingTarget = Math.max(0, -account.openingBalanceMinorUnits);
  let openingStatement = listStatementsForAccount(account.id, context).find(
    (statement) => statement.kind === "opening",
  );
  if (openingTarget > 0 || openingStatement) {
    if (!openingStatement && openingTarget > 0) {
      const now = new Date();
      openingStatement = insertStatement(
        {
          id: newCreditCardBillingId(context),
          accountId: account.id,
          kind: "opening",
          cycleStartOn: openingOn,
          cycleEndOn: openingOn,
          statementOn: openingOn,
          dueOn: dueDateForStatement(openingOn, details.paymentDueDay),
          issuedAmountMinorUnits: openingTarget,
          createdAt: now,
          updatedAt: now,
        },
        context,
      );
      insertStatementEntry(
        {
          id: newCreditCardBillingId(context),
          statementId: openingStatement.id,
          transactionId: null,
          installmentId: null,
          entryType: "opening_balance",
          amountMinorUnits: openingTarget,
          descriptionSnapshot: "Opening billed balance",
          occurredOnSnapshot: openingOn,
          reversesEntryId: null,
          createdAt: now,
        },
        context,
      );
    }
    if (openingStatement) {
      const openingEntries = listEntriesForStatements(
        [openingStatement.id],
        context,
      );
      const openingBase = openingEntries
        .filter((entry) =>
          ["opening_balance", "adjustment"].includes(entry.entryType),
        )
        .reduce((sum, entry) => sum + entry.amountMinorUnits, 0);
      const openingDifference = openingTarget - openingBase;
      if (openingDifference !== 0) {
        insertStatementEntry(
          {
            id: newCreditCardBillingId(context),
            statementId: openingStatement.id,
            transactionId: null,
            installmentId: null,
            entryType: "adjustment",
            amountMinorUnits: openingDifference,
            descriptionSnapshot: "Opening balance adjusted",
            occurredOnSnapshot: openingOn,
            reversesEntryId: openingEntries.at(-1)?.id ?? null,
            createdAt: new Date(),
          },
          context,
        );
      }
    }
  }

  const plans = listInstallmentPlansForAccount(account.id, context);
  for (const plan of plans) {
    const purchase = transactionById.get(plan.purchaseTransactionId);
    if (purchase?.deletedAt && plan.status === "active") {
      updateInstallmentPlanStatus(plan.id, "cancelled", context);
      plan.status = "cancelled";
    } else if (purchase && !purchase.deletedAt && plan.status === "cancelled") {
      updateInstallmentPlanStatus(plan.id, "active", context);
      plan.status = "active";
    }
  }
  const activePlanTransactionIds = new Set(
    plans
      .filter(
        (plan) =>
          plan.status === "active" &&
          !transactionById.get(plan.purchaseTransactionId)?.deletedAt,
      )
      .map((plan) => plan.purchaseTransactionId),
  );

  for (const transaction of activeTransactions) {
    if (transaction.amountMinorUnits >= 0) continue;
    if (activePlanTransactionIds.has(transaction.id)) continue;
    const statementOn = statementDateForTransaction(
      transaction.occurredAt,
      details.statementDay,
    );
    if (statementOn > todayOn) continue;
    const existingEntries = listStatementsForAccount(account.id, context);
    const linked = listEntriesForStatements(
      existingEntries.map((statement) => statement.id),
      context,
    ).some(
      (entry) =>
        entry.transactionId === transaction.id &&
        entry.entryType !== "adjustment",
    );
    if (linked) continue;
    const statement = ensureStatement(
      account.id,
      statementOn,
      details.statementDay,
      details.paymentDueDay,
      context,
    );
    insertStatementEntry(
      {
        id: newCreditCardBillingId(context),
        statementId: statement.id,
        transactionId: transaction.id,
        installmentId: null,
        entryType: "charge",
        amountMinorUnits: Math.abs(transaction.amountMinorUnits),
        descriptionSnapshot: transaction.name ?? transaction.note ?? "Card purchase",
        occurredOnSnapshot: toCalendarDate(transaction.occurredAt),
        reversesEntryId: null,
        createdAt: new Date(),
      },
      context,
    );
  }

  const installments = listInstallmentsForPlans(
    plans.filter((plan) => activePlanTransactionIds.has(plan.purchaseTransactionId)).map((plan) => plan.id),
    context,
  );
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  for (const installment of installments) {
    if (installment.scheduledStatementOn > todayOn) continue;
    if (findEntryForInstallment(installment.id, context)) continue;
    const plan = planById.get(installment.planId);
    if (!plan) continue;
    const purchase = transactionById.get(plan.purchaseTransactionId);
    if (!purchase || purchase.deletedAt) continue;
    const statement = ensureStatement(
      account.id,
      installment.scheduledStatementOn,
      details.statementDay,
      details.paymentDueDay,
      context,
    );
    insertStatementEntry(
      {
        id: newCreditCardBillingId(context),
        statementId: statement.id,
        transactionId: purchase.id,
        installmentId: installment.id,
        entryType: "installment",
        amountMinorUnits:
          installment.principalMinorUnits +
          installment.interestMinorUnits +
          installment.feeMinorUnits,
        descriptionSnapshot: `${purchase.name ?? "Installment purchase"} — ${installment.installmentNumber} of ${plan.termMonths}`,
        occurredOnSnapshot: installment.scheduledStatementOn,
        reversesEntryId: null,
        createdAt: new Date(),
      },
      context,
    );
  }

  let statements = listStatementsForAccount(account.id, context);
  let entries = listEntriesForStatements(
    statements.map((statement) => statement.id),
    context,
  );

  const entriesByTransaction = new Map<string, typeof entries>();
  for (const entry of entries) {
    if (!entry.transactionId) continue;
    const group = entriesByTransaction.get(entry.transactionId) ?? [];
    group.push(entry);
    entriesByTransaction.set(entry.transactionId, group);
  }
  for (const transaction of allTransactions) {
    const linkedEntries = entriesByTransaction.get(transaction.id) ?? [];
    if (linkedEntries.length === 0) continue;
    const statementIds = [...new Set(linkedEntries.map((entry) => entry.statementId))];
    for (const statementId of statementIds) {
      const statementEntries = linkedEntries.filter(
        (entry) => entry.statementId === statementId,
      );
      const base = statementEntries
        .filter((entry) => entry.entryType !== "adjustment")
        .reduce((sum, entry) => sum + entry.amountMinorUnits, 0);
      const net = statementEntries.reduce(
        (sum, entry) => sum + entry.amountMinorUnits,
        0,
      );
      const target = transaction.deletedAt ? 0 : base;
      const difference = target - net;
      if (difference === 0) continue;
      insertStatementEntry(
        {
          id: newCreditCardBillingId(context),
          statementId,
          transactionId: transaction.id,
          installmentId: null,
          entryType: "adjustment",
          amountMinorUnits: difference,
          descriptionSnapshot: transaction.deletedAt
            ? "Transaction removed"
            : "Transaction restored",
          occurredOnSnapshot: todayOn,
          reversesEntryId: statementEntries.at(-1)?.id ?? null,
          createdAt: new Date(),
        },
        context,
      );
    }
  }

  statements = listStatementsForAccount(account.id, context);
  entries = listEntriesForStatements(
    statements.map((statement) => statement.id),
    context,
  );
  const statementById = new Map(statements.map((statement) => [statement.id, statement]));
  const remainingByStatementId = new Map<string, number>();
  for (const statement of statements) remainingByStatementId.set(statement.id, 0);
  for (const entry of entries) {
    remainingByStatementId.set(
      entry.statementId,
      (remainingByStatementId.get(entry.statementId) ?? 0) + entry.amountMinorUnits,
    );
  }

  for (const transaction of activeTransactions) {
    if (transaction.amountMinorUnits <= 0) continue;
    const allocated = (entriesByTransaction.get(transaction.id) ?? [])
      .filter((entry) => entry.amountMinorUnits < 0)
      .reduce((sum, entry) => sum + Math.abs(entry.amountMinorUnits), 0);
    let available = transaction.amountMinorUnits - allocated;
    if (available <= 0) continue;
    const eligibleStatements = statements.filter(
      (statement) =>
        (remainingByStatementId.get(statement.id) ?? 0) > 0,
    );
    for (const statement of eligibleStatements) {
      if (available <= 0) break;
      const remaining = Math.max(
        0,
        remainingByStatementId.get(statement.id) ?? 0,
      );
      const applied = Math.min(available, remaining);
      if (applied <= 0) continue;
      insertStatementEntry(
        {
          id: newCreditCardBillingId(context),
          statementId: statement.id,
          transactionId: transaction.id,
          installmentId: null,
          entryType: transaction.type === "transfer" ? "payment" : "refund",
          amountMinorUnits: -applied,
          descriptionSnapshot:
            transaction.name ??
            (transaction.type === "transfer" ? "Card payment" : "Card credit"),
          occurredOnSnapshot: toCalendarDate(transaction.occurredAt),
          reversesEntryId: null,
          createdAt: new Date(),
        },
        context,
      );
      remainingByStatementId.set(statement.id, remaining - applied);
      available -= applied;
    }
  }

  entries = listEntriesForStatements(
    statements.map((statement) => statement.id),
    context,
  );
  for (const statement of statements) {
    const issuedAmount = entries
      .filter(
        (entry) =>
          entry.statementId === statement.id &&
          ["opening_balance", "charge", "installment", "refund"].includes(
            entry.entryType,
          ),
      )
      .reduce((sum, entry) => sum + entry.amountMinorUnits, 0);
    updateStatementIssuedAmount(
      statement.id,
      Math.max(0, issuedAmount),
      context,
    );
  }
}

export function reconcileCreditCardBillingInContext(
  today: Date,
  context: DbContext,
): void {
  const cards = getAccountsWithBalances(context).filter(
    (account) => account.creditCardDetails,
  );
  for (const card of cards) reconcileAccount(card, today, context);
}

export function reconcileCreditCardBilling(today = new Date()): void {
  db.transaction((tx) => reconcileCreditCardBillingInContext(today, tx));
}
