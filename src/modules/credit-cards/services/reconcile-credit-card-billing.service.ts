import type { DbContext } from "@/infrastructure/database/client";
import { db } from "@/infrastructure/database/client";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database/database-replacement";
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

function* reconcileAccount(
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
    yield;
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

  const existingStatements = listStatementsForAccount(account.id, context);
  const linkedTransactionIds = new Set(
    listEntriesForStatements(existingStatements.map((statement) => statement.id), context)
      .filter((entry) => entry.entryType !== "adjustment")
      .map((entry) => entry.transactionId),
  );

  for (const transaction of activeTransactions) {
    yield;
    if (transaction.amountMinorUnits >= 0) continue;
    if (activePlanTransactionIds.has(transaction.id)) continue;
    const statementOn = statementDateForTransaction(
      transaction.occurredAt,
      details.statementDay,
    );
    if (statementOn > todayOn) continue;
    if (linkedTransactionIds.has(transaction.id)) continue;
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
    yield;
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
    yield;
    if (!entry.transactionId) continue;
    const group = entriesByTransaction.get(entry.transactionId) ?? [];
    group.push(entry);
    entriesByTransaction.set(entry.transactionId, group);
  }
  const statementDateById = new Map(existingStatements.map((s) => [s.id, s.statementOn]));

  for (const transaction of allTransactions) {
    yield;
    const linkedEntries = entriesByTransaction.get(transaction.id) ?? [];
    if (linkedEntries.length === 0) continue;

    const isCharge = linkedEntries.some((entry) => entry.entryType === "charge");

    if (transaction.deletedAt) {
      const statementIds = [...new Set(linkedEntries.map((entry) => entry.statementId))];
      for (const statementId of statementIds) {
        yield;
        const statementEntries = linkedEntries.filter(
          (entry) => entry.statementId === statementId,
        );
        const net = statementEntries.reduce(
          (sum, entry) => sum + entry.amountMinorUnits,
          0,
        );
        if (net === 0) continue;
        insertStatementEntry(
          {
            id: newCreditCardBillingId(context),
            statementId,
            transactionId: transaction.id,
            installmentId: null,
            entryType: "adjustment",
            amountMinorUnits: -net,
            descriptionSnapshot: "Transaction removed",
            occurredOnSnapshot: todayOn,
            reversesEntryId: statementEntries.at(-1)?.id ?? null,
            createdAt: new Date(),
          },
          context,
        );
      }
      continue;
    }

    if (isCharge) {
      const statementIds = [...new Set(linkedEntries.map((entry) => entry.statementId))];
      for (const statementId of statementIds) {
        yield;
        const statementEntries = linkedEntries.filter(
          (entry) => entry.statementId === statementId,
        );
        const net = statementEntries.reduce(
          (sum, entry) => sum + entry.amountMinorUnits,
          0,
        );
        const target = Math.max(0, -transaction.amountMinorUnits);
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
            descriptionSnapshot:
              net === 0 ? "Transaction restored" : "Transaction amount adjusted",
            occurredOnSnapshot: todayOn,
            reversesEntryId: statementEntries.at(-1)?.id ?? null,
            createdAt: new Date(),
          },
          context,
        );
      }
    } else {
      const netAllocated = linkedEntries.reduce(
        (sum, entry) => sum - entry.amountMinorUnits,
        0,
      );
      const targetAllocated = Math.max(0, transaction.amountMinorUnits);
      if (netAllocated > targetAllocated) {
        let excessToRelease = netAllocated - targetAllocated;
        const linkedStatementIds = [
          ...new Set(linkedEntries.map((e) => e.statementId)),
        ].sort((a, b) => {
          const dateA = statementDateById.get(a) ?? "";
          const dateB = statementDateById.get(b) ?? "";
          return dateB.localeCompare(dateA);
        });

        for (const statementId of linkedStatementIds) {
          yield;
          if (excessToRelease <= 0) break;
          const statementEntries = linkedEntries.filter(
            (e) => e.statementId === statementId,
          );
          const statementNetPayment = statementEntries.reduce(
            (sum, e) => sum - e.amountMinorUnits,
            0,
          );
          if (statementNetPayment <= 0) continue;

          const releaseAmount = Math.min(excessToRelease, statementNetPayment);
          if (releaseAmount > 0) {
            insertStatementEntry(
              {
                id: newCreditCardBillingId(context),
                statementId,
                transactionId: transaction.id,
                installmentId: null,
                entryType: "adjustment",
                amountMinorUnits: releaseAmount,
                descriptionSnapshot: "Payment amount adjusted",
                occurredOnSnapshot: todayOn,
                reversesEntryId: statementEntries.at(-1)?.id ?? null,
                createdAt: new Date(),
              },
              context,
            );
            excessToRelease -= releaseAmount;
          }
        }
      }
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
    yield;
    remainingByStatementId.set(
      entry.statementId,
      (remainingByStatementId.get(entry.statementId) ?? 0) + entry.amountMinorUnits,
    );
  }

  entriesByTransaction.clear();
  for (const entry of entries) {
    if (!entry.transactionId) continue;
    const group = entriesByTransaction.get(entry.transactionId) ?? [];
    group.push(entry);
    entriesByTransaction.set(entry.transactionId, group);
  }

  for (const transaction of activeTransactions) {
    yield;
    if (transaction.amountMinorUnits <= 0) continue;
    const allocated = Math.max(
      0,
      (entriesByTransaction.get(transaction.id) ?? []).reduce(
        (sum, entry) => sum - entry.amountMinorUnits,
        0,
      ),
    );
    let available = transaction.amountMinorUnits - allocated;
    if (available <= 0) continue;
    const eligibleStatements = statements.filter(
      (statement) =>
        (remainingByStatementId.get(statement.id) ?? 0) > 0,
    );
    for (const statement of eligibleStatements) {
      yield;
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
  // Payment and credit reversals restore the remaining balance but do not increase issued charges.
  const creditTransactionIds = new Set(
    entries
      .filter((entry) => entry.entryType === "payment" || entry.entryType === "refund")
      .map((entry) => entry.transactionId),
  );
  const issuedByStatement = new Map<string, number>();
  for (const entry of entries) {
    yield;
    if (entry.entryType === "payment" || entry.entryType === "refund") continue;
    if (entry.entryType === "adjustment" && entry.transactionId &&
        creditTransactionIds.has(entry.transactionId)) continue;
    issuedByStatement.set(entry.statementId,
      (issuedByStatement.get(entry.statementId) ?? 0) + entry.amountMinorUnits);
  }
  for (const statement of statements) {
    yield;
    const nextIssuedAmount = Math.max(0, issuedByStatement.get(statement.id) ?? 0);
    if (nextIssuedAmount !== statement.issuedAmountMinorUnits) {
      updateStatementIssuedAmount(statement.id, nextIssuedAmount, context);
    }
  }
}

let lastReconciledCalendarDate: string | null = null;
let lastReconciledDb: unknown = null;

subscribeToDatabaseReplacement(() => {
  lastReconciledCalendarDate = null;
  lastReconciledDb = null;
});

export function reconcileCreditCardBillingInContext(
  today: Date,
  context: DbContext,
): void {
  const cards = getAccountsWithBalances(context).filter(
    (account) => account.creditCardDetails,
  );
  // Existing callers drain the work synchronously inside their transaction.
  for (const card of cards) {
    const work = reconcileAccount(card, today, context);
    while (!work.next().done) { /* Continue reconciliation. */ }
  }
  lastReconciledCalendarDate = toCalendarDate(today);
  lastReconciledDb = db;
}

export function reconcileCreditCardBilling(today = new Date()): void {
  db.transaction((tx) => reconcileCreditCardBillingInContext(today, tx));
}

export function ensureCreditCardBillingReconciled(today = new Date()): void {
  const todayOn = toCalendarDate(today);
  if (lastReconciledDb === db && lastReconciledCalendarDate === todayOn) {
    return;
  }
  reconcileCreditCardBilling(today);
}

/** Stage only affected cards; do not update live reconciliation caches before publication. */
export function* reconcileImportedCreditCardBillingWork(
  accountIds: string[], today: Date, context: DbContext,
): Generator<void> {
  const ids = new Set(accountIds);
  const cards = getAccountsWithBalances(context, { includeManagementFlags: false }).filter(
    (account) => ids.has(account.id) && account.creditCardDetails,
  );
  for (const card of cards) {
    yield;
    yield* reconcileAccount(card, today, context);
  }
}
