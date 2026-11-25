import type { DbContext } from "@/infrastructure/database/client";
import { db } from "@/infrastructure/database/client";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database/database-replacement";
import { getAccountsWithBalances } from "@/modules/accounts";
import {
  getAccountLedgerTransactions,
  getTransactionsByIds,
} from "@/modules/transactions";
import {
  findEntryForInstallment,
  findInstallmentPlanByTransactionId,
  findStatement,
  insertStatement,
  insertStatementEntry,
  listBilledInstallmentIdsForPlans,
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
          entry.entryType === "opening_balance" ||
          (entry.entryType === "adjustment" && entry.transactionId === null),
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

  const activePlanIds = plans
    .filter((plan) => activePlanTransactionIds.has(plan.purchaseTransactionId))
    .map((plan) => plan.id);
  const installments = listInstallmentsForPlans(
    activePlanIds,
    context,
  );
  const billedInstallmentIds = listBilledInstallmentIdsForPlans(
    activePlanIds,
    context,
  );
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  for (const installment of installments) {
    yield;
    if (installment.scheduledStatementOn > todayOn) continue;
    if (billedInstallmentIds.has(installment.id)) continue;
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
    billedInstallmentIds.add(installment.id);
  }

  const completionPlanIds = plans
    .filter((plan) => {
      const purchase = transactionById.get(plan.purchaseTransactionId);
      return (
        plan.status !== "cancelled" && purchase && !purchase.deletedAt
      );
    })
    .map((plan) => plan.id);
  const installmentsForCompletion = listInstallmentsForPlans(
    completionPlanIds,
    context,
  );
  const billedInstallmentIdsForCompletion = listBilledInstallmentIdsForPlans(
    completionPlanIds,
    context,
  );
  for (const plan of plans) {
    yield;
    const purchase = transactionById.get(plan.purchaseTransactionId);
    if (!purchase || purchase.deletedAt || plan.status === "cancelled") {
      continue;
    }
    const billedPrincipal = installmentsForCompletion
      .filter(
        (installment) =>
          installment.planId === plan.id &&
          billedInstallmentIdsForCompletion.has(installment.id),
      )
      .reduce(
        (sum, installment) =>
          sum +
          installment.principalMinorUnits +
          installment.interestMinorUnits +
          installment.feeMinorUnits,
        0,
      );
    const remainingPrincipal = Math.max(0, plan.principalMinorUnits - billedPrincipal);
    if (remainingPrincipal === 0 && plan.status === "active") {
      updateInstallmentPlanStatus(plan.id, "completed", context);
      plan.status = "completed";
    } else if (remainingPrincipal > 0 && plan.status === "completed") {
      updateInstallmentPlanStatus(plan.id, "active", context);
      plan.status = "active";
    }
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

  const missingTxIds = [...entriesByTransaction.keys()].filter(
    (txId) => !transactionById.has(txId),
  );
  if (missingTxIds.length > 0) {
    const externalTransactions = getTransactionsByIds(missingTxIds, context);
    for (const tx of externalTransactions) {
      transactionById.set(tx.id, tx);
    }
  }

  const statementDateById = new Map(statements.map((s) => [s.id, s.statementOn]));
  const relevantTransactionIds = new Set([
    ...allTransactions.map((t) => t.id),
    ...entriesByTransaction.keys(),
  ]);

  for (const txId of relevantTransactionIds) {
    yield;
    const linkedEntries = entriesByTransaction.get(txId) ?? [];
    if (linkedEntries.length === 0) continue;

    const transaction = transactionById.get(txId);
    const isCharge = linkedEntries.some((entry) => entry.entryType === "charge");
    const isRemovedFromCard =
      !transaction || Boolean(transaction.deletedAt) || transaction.accountId !== account.id;

    if (isRemovedFromCard) {
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
            transactionId: txId,
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
            transactionId: txId,
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
    } else if (linkedEntries.some((entry) => entry.entryType === "installment")) {
      // Restore issued installments without replacing their original billing entries.
      const totalsByStatement = new Map<
        string,
        { issued: number; net: number; lastEntryId: string }
      >();
      for (const entry of linkedEntries) {
        yield;
        const totals = totalsByStatement.get(entry.statementId) ?? {
          issued: 0,
          net: 0,
          lastEntryId: entry.id,
        };
        if (entry.entryType === "installment") {
          totals.issued += entry.amountMinorUnits;
        }
        totals.net += entry.amountMinorUnits;
        totals.lastEntryId = entry.id;
        totalsByStatement.set(entry.statementId, totals);
      }
      for (const [statementId, totals] of totalsByStatement) {
        yield;
        const difference = totals.issued - totals.net;
        if (difference === 0) continue;
        insertStatementEntry(
          {
            id: newCreditCardBillingId(context),
            statementId,
            transactionId: txId,
            installmentId: null,
            entryType: "adjustment",
            amountMinorUnits: difference,
            descriptionSnapshot: "Transaction restored",
            occurredOnSnapshot: todayOn,
            reversesEntryId: totals.lastEntryId,
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
          return dateB.localeCompare(dateA) || b.localeCompare(a);
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
                transactionId: txId,
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
  statements.sort((left, right) =>
    left.statementOn.localeCompare(right.statementOn) || left.id.localeCompare(right.id),
  );
  const openingCredit = Math.max(0, account.openingBalanceMinorUnits);
  const openingDate = account.openingBalanceAt ?? new Date(0);
  const OPENING_CREDIT_KEY = "__opening_credit__";

  type CreditSource = {
    key: string;
    transactionId: string | null;
    amountMinorUnits: number;
    occurredAt: Date;
    createdAt: Date;
    type: "payment" | "refund";
    name: string;
  };

  const creditSources: CreditSource[] = [];
  if (openingCredit > 0) {
    creditSources.push({
      key: OPENING_CREDIT_KEY,
      transactionId: null,
      amountMinorUnits: openingCredit,
      occurredAt: openingDate,
      createdAt: openingDate,
      type: "payment",
      name: "Opening balance credit",
    });
  }
  for (const tx of activeTransactions.filter((t) => t.amountMinorUnits > 0)) {
    creditSources.push({
      key: tx.id,
      transactionId: tx.id,
      amountMinorUnits: tx.amountMinorUnits,
      occurredAt: tx.occurredAt,
      createdAt: tx.createdAt,
      type: tx.type === "transfer" ? "payment" : "refund",
      name: tx.name ?? (tx.type === "transfer" ? "Card payment" : "Card credit"),
    });
  }
  creditSources.sort((left, right) =>
    left.occurredAt.getTime() - right.occurredAt.getTime() ||
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.key.localeCompare(right.key),
  );

  const cycleStatementIds = new Set(
    statements.filter((statement) => statement.kind === "billing_cycle").map((statement) => statement.id),
  );
  const creditIds = new Set(creditSources.map((source) => source.key));
  for (const entry of entries) {
    if (entry.transactionId && (entry.entryType === "payment" || entry.entryType === "refund")) {
      creditIds.add(entry.transactionId);
    }
    if (!entry.transactionId && cycleStatementIds.has(entry.statementId) && (entry.entryType === "payment" || entry.entryType === "adjustment")) {
      creditIds.add(OPENING_CREDIT_KEY);
    }
  }
  const remainingByStatementId = new Map<string, number>();
  const chargesByStatementId = new Map<string, number>();
  for (const statement of statements) remainingByStatementId.set(statement.id, 0);
  for (const entry of entries) {
    yield;
    remainingByStatementId.set(
      entry.statementId,
      (remainingByStatementId.get(entry.statementId) ?? 0) + entry.amountMinorUnits,
    );
    const isCreditEntry =
      (entry.transactionId && creditIds.has(entry.transactionId)) ||
      (!entry.transactionId && cycleStatementIds.has(entry.statementId) && (entry.entryType === "payment" || entry.entryType === "adjustment"));
    if (!isCreditEntry) {
      chargesByStatementId.set(entry.statementId,
        (chargesByStatementId.get(entry.statementId) ?? 0) + entry.amountMinorUnits);
    }
  }

  const allocationsByCreditKey = new Map<
    string,
    Map<string, { amount: number; lastEntryId: string }>
  >();
  const entriesByCreditKey = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.transactionId ?? (cycleStatementIds.has(entry.statementId) ? OPENING_CREDIT_KEY : null);
    if (!key) continue;
    const group = entriesByCreditKey.get(key) ?? [];
    group.push(entry);
    entriesByCreditKey.set(key, group);
    const isCredit =
      key === OPENING_CREDIT_KEY
        ? (entry.entryType === "payment" || entry.entryType === "adjustment")
        : creditIds.has(key);
    if (isCredit) {
      const allocations = allocationsByCreditKey.get(key) ??
        new Map<string, { amount: number; lastEntryId: string }>();
      const allocation = allocations.get(entry.statementId) ?? { amount: 0, lastEntryId: entry.id };
      allocation.amount -= entry.amountMinorUnits;
      allocation.lastEntryId = entry.id;
      allocations.set(entry.statementId, allocation);
      allocationsByCreditKey.set(key, allocations);
    }
  }

  // Compare with oldest-first targets so restored older bills regain their credit too.
  const targetAllocations = new Map<string, Map<string, number>>();
  const unallocatedCharges = new Map(statements.map((statement) =>
    [statement.id, Math.max(0, chargesByStatementId.get(statement.id) ?? 0)],
  ));
  let targetStatementIndex = 0;
  for (const source of creditSources) {
    yield;
    let available = source.amountMinorUnits;
    const targets = new Map<string, number>();
    while (available > 0 && targetStatementIndex < statements.length) {
      yield;
      const statement = statements[targetStatementIndex];
      const remaining = unallocatedCharges.get(statement.id) ?? 0;
      if (remaining <= 0) {
        targetStatementIndex++;
        continue;
      }
      const applied = Math.min(available, remaining);
      targets.set(statement.id, applied);
      unallocatedCharges.set(statement.id, remaining - applied);
      available -= applied;
      if (remaining === applied) targetStatementIndex++;
    }
    targetAllocations.set(source.key, targets);
  }

  // Release only allocation differences; original payment/refund entries stay intact.
  for (const [key, allocations] of allocationsByCreditKey) {
    for (const [statementId, allocation] of allocations) {
      yield;
      const target = targetAllocations.get(key)?.get(statementId) ?? 0;
      const release = allocation.amount - target;
      if (release <= 0) continue;
      const txId = key === OPENING_CREDIT_KEY ? null : key;
      const adjustment: (typeof entries)[number] = {
        id: newCreditCardBillingId(context),
        statementId,
        transactionId: txId,
        installmentId: null,
        entryType: "adjustment",
        amountMinorUnits: release,
        descriptionSnapshot: key === OPENING_CREDIT_KEY
          ? "Opening credit allocation adjusted"
          : "Credit allocation adjusted",
        occurredOnSnapshot: todayOn,
        reversesEntryId: allocation.lastEntryId,
        createdAt: new Date(),
      };
      insertStatementEntry(adjustment, context);
      const group = entriesByCreditKey.get(key) ?? [];
      group.push(adjustment);
      entriesByCreditKey.set(key, group);
      remainingByStatementId.set(statementId,
        (remainingByStatementId.get(statementId) ?? 0) + release);
    }
  }

  let statementIndex = 0;
  for (const source of creditSources) {
    yield;
    const allocated = Math.max(
      0,
      (entriesByCreditKey.get(source.key) ?? []).reduce(
        (sum, entry) => sum - entry.amountMinorUnits,
        0,
      ),
    );
    let available = source.amountMinorUnits - allocated;
    if (available <= 0) continue;
    while (available > 0 && statementIndex < statements.length) {
      yield;
      const statement = statements[statementIndex];
      const remaining = Math.max(
        0,
        remainingByStatementId.get(statement.id) ?? 0,
      );
      if (remaining <= 0) {
        statementIndex++;
        continue;
      }
      const applied = Math.min(available, remaining);
      insertStatementEntry(
        {
          id: newCreditCardBillingId(context),
          statementId: statement.id,
          transactionId: source.transactionId,
          installmentId: null,
          entryType: source.type,
          amountMinorUnits: -applied,
          descriptionSnapshot: source.name,
          occurredOnSnapshot: toCalendarDate(source.occurredAt),
          reversesEntryId: null,
          createdAt: new Date(),
        },
        context,
      );
      remainingByStatementId.set(statement.id, remaining - applied);
      available -= applied;
      if (remaining === applied) statementIndex++;
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
    const isCreditAdjustment = entry.entryType === "adjustment" && (
      (entry.transactionId && creditTransactionIds.has(entry.transactionId)) ||
      (!entry.transactionId && cycleStatementIds.has(entry.statementId))
    );
    if (isCreditAdjustment) continue;
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
  const cards = getAccountsWithBalances(context, {
    includeManagementFlags: false,
  }).filter((account) => account.creditCardDetails);
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
