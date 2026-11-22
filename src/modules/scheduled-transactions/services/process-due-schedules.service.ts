import { reconcileImportedCreditCardBillingWork } from "@/modules/credit-cards";
import { DeviceEventEmitter } from "react-native";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  recordTransactionInContext,
  type Transaction,
  type TransferResult,
} from "@/modules/transactions";
import { handleSubscriptionScheduleExecutedInContext } from "@/modules/subscriptions";
import {
  findScheduleOccurrence,
  findScheduleOccurrenceById,
  findScheduleOccurrenceByNominalDueAt,
  findScheduledTransaction,
  insertScheduleOccurrence,
  insertSchedulePosting,
  listDueScheduledTransactions,
  updateScheduleOccurrenceRecord,
  updateScheduledTransactionRecord,
} from "../repositories/scheduled-transactions.repository";
import type {
  CalculatedScheduleOccurrence,
  ScheduleOccurrence,
  ScheduledTransaction,
} from "../types/scheduled-transaction.types";
import { calculateScheduleOccurrence } from "../utils/recurrence";
import {
  type ScheduledTemplateSnapshot,
  serializeScheduleTemplateSnapshot,
} from "../utils/schedule-template-snapshot";

export function parseTemplateSnapshot(raw: string): ScheduledTemplateSnapshot {
  const parsed = JSON.parse(raw) as ScheduledTemplateSnapshot & {
    amountCents?: number;
  };
  return {
    ...parsed,
    amountMinorUnits: parsed.amountMinorUnits ?? parsed.amountCents ?? 0,
  };
}

export interface DueScheduleProcessingResult {
  processed: number;
  posted: number;
  due: number;
  skipped: number;
  failed: number;
}

const MAX_OCCURRENCES_PER_RUN = 1;

let suspended = false;
export function setScheduleProcessingSuspended(value: boolean): void { suspended = value; }
let requestedAt = 0;
let activeCatchUp: Promise<void> | null = null;
const yieldToInput = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Coalesced, restartable catch-up. Only private staging work yields inside a transaction. */
export function processDueSchedulesAsync(now = new Date(), options?: { isCancelled?: () => boolean }): Promise<void> {
  const { StagedDatabaseChangedError, withStagedDatabaseTransaction } = require("@/infrastructure/database/staged-transaction") as typeof import("@/infrastructure/database/staged-transaction");
  requestedAt = activeCatchUp ? Math.max(requestedAt, now.getTime()) : now.getTime();
  if (activeCatchUp) return activeCatchUp;
  const cancelled = () => suspended || Boolean(options?.isCancelled?.());
  activeCatchUp = (async () => {
    await yieldToInput();
    while (!cancelled() && listDueScheduledTransactions(new Date(requestedAt), 1).length) {
      now = new Date(requestedAt);
      try {
        const posted = await withStagedDatabaseTransaction(async (context) => {
          let count = 0;
          const accounts = new Set<string>();
          for (let index = 0; index < 8; index++) {
            await yieldToInput();
            if (cancelled()) throw new CatchUpCancelled();
            const schedule = listDueScheduledTransactions(now, 1, context)[0];
            if (!schedule) break;
            accounts.add(schedule.accountId);
            if (schedule.toAccountId) accounts.add(schedule.toAccountId);
            try { if (processNextOccurrence(schedule.id, now, context, false) === "posted") count++; }
            catch (cause) { throw new OccurrencePostingFailed(schedule, cause); }
          }
          if (count) for (const _step of reconcileImportedCreditCardBillingWork([...accounts], now, context)) {
            await yieldToInput();
            if (cancelled()) throw new CatchUpCancelled();
          }
          if (cancelled()) throw new CatchUpCancelled();
          return count;
        });
        if (posted) DeviceEventEmitter.emit("FINANCE_APP_TRANSACTION_MUTATED", { sourceId: "schedule-catch-up" });
        DeviceEventEmitter.emit("FINANCE_APP_SCHEDULES_CHANGED");
      } catch (error) {
        if (error instanceof CatchUpCancelled) break;
        if (error instanceof StagedDatabaseChangedError) { await yieldToInput(); continue; }
        // Retry just one occurrence through the existing failure-recording path.
        // This preserves failed snapshots without publishing any part of the rejected batch.
        if (!(error instanceof OccurrencePostingFailed)) throw error;
        const current = findScheduledTransaction(error.schedule.id);
        if (current && current.nextOccurrenceNumber === error.schedule.nextOccurrenceNumber &&
            serializeScheduleTemplateSnapshot(current) === serializeScheduleTemplateSnapshot(error.schedule)) {
          recordFailedOccurrence(current.id, now, error.cause);
        }
        DeviceEventEmitter.emit("FINANCE_APP_SCHEDULES_CHANGED");
      }
      await yieldToInput();
    }
  })().finally(() => { activeCatchUp = null; });
  return activeCatchUp;
}

class CatchUpCancelled extends Error {}
class OccurrencePostingFailed extends Error {
  constructor(readonly schedule: ScheduledTransaction, readonly cause: unknown) { super("Schedule posting failed"); }
}

export function processDueSchedules(
  now = new Date(),
  limit = MAX_OCCURRENCES_PER_RUN,
): DueScheduleProcessingResult {
  const result: DueScheduleProcessingResult = {
    processed: 0,
    posted: 0,
    due: 0,
    skipped: 0,
    failed: 0,
  };

  while (result.processed < Math.min(limit, MAX_OCCURRENCES_PER_RUN)) {
    const schedule = listDueScheduledTransactions(now, 1)[0];
    if (!schedule) break;

    try {
      const status = db.transaction((tx) =>
        processNextOccurrence(schedule.id, now, tx),
      );
      result[status] += 1;
    } catch (error) {
      recordFailedOccurrence(schedule.id, now, error);
      result.failed += 1;
    }
    result.processed += 1;
  }

  if (result.posted > 0) {
    DeviceEventEmitter.emit("FINANCE_APP_TRANSACTION_MUTATED", { sourceId: "schedule-processing" });
  }

  if (result.processed) DeviceEventEmitter.emit("FINANCE_APP_SCHEDULE_CATCH_UP_REQUESTED");
  return result;
}

function processNextOccurrence(
  scheduleId: string,
  now: Date,
  context: DbContext,
  reconcileBilling = true,
): "posted" | "due" | "skipped" {
  const schedule = findScheduledTransaction(scheduleId, context);
  if (!schedule || schedule.status !== "active") {
    throw new Error("The scheduled transaction is no longer active.");
  }

  const occurrence = calculateScheduleOccurrence(
    schedule,
    schedule.nextOccurrenceNumber,
  );
  if (!occurrence) {
    updateScheduledTransactionRecord(
      schedule.id,
      {
        status: "completed",
        nextNominalAt: null,
        nextEffectiveAt: null,
        updatedAt: now,
      },
      context,
    );
    return "skipped";
  }

  const processAt = occurrence.effectiveAt ?? occurrence.nominalAt;
  if (processAt.getTime() > now.getTime()) {
    throw new Error("The next occurrence is not due yet.");
  }

  const existing = resolveRecordedOccurrence(
    schedule.id,
    occurrence,
    context,
  );
  if (existing) {
    advanceSchedule(schedule, occurrence.sequenceNumber + 1, now, context);
    return recordedOccurrenceProcessingStatus(existing);
  }

  const created = insertScheduleOccurrence(
    {
      scheduleId: schedule.id,
      sequenceNumber: occurrence.sequenceNumber,
      nominalDueAt: occurrence.nominalAt,
      effectiveDueAt: occurrence.effectiveAt,
      templateSnapshot: serializeScheduleTemplateSnapshot(schedule),
      status: occurrence.skippedForWeekend
        ? "skipped"
        : schedule.autoPost
          ? "posted"
          : "due",
      processedAt:
        occurrence.skippedForWeekend || schedule.autoPost ? now : null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    },
    context,
  );

  if (!occurrence.skippedForWeekend && schedule.autoPost) {
    const postedResult = postSnapshot(
      parseTemplateSnapshot(created.templateSnapshot),
      created.id,
      occurrence.effectiveAt ?? occurrence.nominalAt,
      now,
      context,
      reconcileBilling,
    );
    if (schedule.subscriptionId && postedResult && "id" in postedResult) {
      try {
        handleSubscriptionScheduleExecutedInContext(
          schedule.subscriptionId,
          postedResult.id,
          occurrence.effectiveAt ?? occurrence.nominalAt,
          Math.abs(schedule.amountMinorUnits),
          context,
        );
      } catch {
        // Keep auto-post working even if sub record sync fails
      }
    }
  }

  advanceSchedule(schedule, occurrence.sequenceNumber + 1, now, context);
  return occurrence.skippedForWeekend
    ? "skipped"
    : schedule.autoPost
      ? "posted"
      : "due";
}

function recordFailedOccurrence(
  scheduleId: string,
  now: Date,
  error: unknown,
): void {
  db.transaction((tx) => {
    const schedule = findScheduledTransaction(scheduleId, tx);
    if (!schedule || schedule.status !== "active") return;
    const calculated = calculateScheduleOccurrence(
      schedule,
      schedule.nextOccurrenceNumber,
    );
    if (!calculated) return;

    const existing = resolveRecordedOccurrence(
      schedule.id,
      calculated,
      tx,
    );
    if (!existing) {
      insertScheduleOccurrence(
        {
          scheduleId: schedule.id,
          sequenceNumber: calculated.sequenceNumber,
          nominalDueAt: calculated.nominalAt,
          effectiveDueAt: calculated.effectiveAt,
          templateSnapshot: serializeScheduleTemplateSnapshot(schedule),
          status: "failed",
          processedAt: now,
          errorMessage:
            error instanceof Error ? error.message : "Automatic posting failed.",
          createdAt: now,
          updatedAt: now,
        },
        tx,
      );
    }
    advanceSchedule(schedule, calculated.sequenceNumber + 1, now, tx);
  });
}

export function postScheduledOccurrence(
  occurrenceId: string,
  now = new Date(),
): void {
  db.transaction((tx) => {
    const occurrence = findScheduleOccurrenceById(occurrenceId, tx);
    if (!occurrence) throw new Error("Scheduled occurrence was not found.");
    if (occurrence.status !== "due" && occurrence.status !== "failed") {
      throw new Error("Only due or failed occurrences can be posted.");
    }

    const postedResult = postSnapshot(
      parseTemplateSnapshot(occurrence.templateSnapshot),
      occurrence.id,
      occurrence.effectiveDueAt ?? occurrence.nominalDueAt,
      now,
      tx,
    );
    const sched = findScheduledTransaction(occurrence.scheduleId, tx);
    if (sched?.subscriptionId && postedResult && "id" in postedResult) {
      try {
        handleSubscriptionScheduleExecutedInContext(
          sched.subscriptionId,
          postedResult.id,
          occurrence.effectiveDueAt ?? occurrence.nominalDueAt,
          Math.abs(sched.amountMinorUnits),
          tx,
        );
      } catch {
        // ignore
      }
    }
    updateScheduleOccurrenceRecord(
      occurrence.id,
      {
        status: "posted",
        processedAt: now,
        errorMessage: null,
        updatedAt: now,
      },
      tx,
    );
  });
  DeviceEventEmitter.emit("FINANCE_APP_TRANSACTION_MUTATED");
}

export function skipScheduledOccurrence(
  occurrenceId: string,
  now = new Date(),
): void {
  db.transaction((tx) => {
    const occurrence = findScheduleOccurrenceById(occurrenceId, tx);
    if (!occurrence) throw new Error("Scheduled occurrence was not found.");
    if (occurrence.status !== "due" && occurrence.status !== "failed") {
      throw new Error("Only due or failed occurrences can be skipped.");
    }
    updateScheduleOccurrenceRecord(
      occurrence.id,
      {
        status: "skipped",
        processedAt: now,
        errorMessage: null,
        updatedAt: now,
      },
      tx,
    );
  });
}

export function postSnapshot(
  snapshot: ScheduledTemplateSnapshot,
  occurrenceId: string,
  occurredAt: Date,
  now: Date,
  context: DbContext,
  reconcileBilling = true,
): Transaction | TransferResult {
  let result: Transaction | TransferResult;
  if (snapshot.transactionType === "transfer") {
    result = recordTransactionInContext(
      {
        kind: "transfer",
        input: {
          fromAccountId: snapshot.accountId,
          toAccountId: snapshot.toAccountId!,
          fromPocketId: snapshot.pocketId,
          toPocketId: snapshot.toPocketId,
          amountMinorUnits: snapshot.amountMinorUnits,
          name: snapshot.name,
          note: snapshot.note,
          occurredAt,
        },
      },
      context,
      { reconcileBilling },
    );
    insertSchedulePosting(occurrenceId, result.outLeg.id, now, context);
    insertSchedulePosting(occurrenceId, result.inLeg.id, now, context);
    return result;
  }

  result = recordTransactionInContext(
    {
      kind: "transaction",
      input: {
        accountId: snapshot.accountId,
        categoryId: snapshot.categoryId!,
        pocketId: snapshot.pocketId,
        type: snapshot.transactionType,
        amountMinorUnits: snapshot.amountMinorUnits,
        name: snapshot.name,
        note: snapshot.note,
        occurredAt,
      },
    },
    context,
    { reconcileBilling },
  );
  insertSchedulePosting(occurrenceId, result.id, now, context);
  return result;
}

export function resolveRecordedOccurrence(
  scheduleId: string,
  occurrence: Pick<CalculatedScheduleOccurrence, "sequenceNumber" | "nominalAt">,
  context: DbContext,
): ScheduleOccurrence | null {
  const bySequence = findScheduleOccurrence(
    scheduleId,
    occurrence.sequenceNumber,
    context,
  );
  if (bySequence) return bySequence;

  return findScheduleOccurrenceByNominalDueAt(
    scheduleId,
    occurrence.nominalAt,
    context,
  );
}

function recordedOccurrenceProcessingStatus(
  occurrence: ScheduleOccurrence,
): "posted" | "due" | "skipped" {
  return occurrence.status === "posted"
    ? "posted"
    : occurrence.status === "due"
      ? "due"
      : "skipped";
}

export function advanceSchedule(
  schedule: ScheduledTransaction,
  sequenceNumber: number,
  now: Date,
  context: DbContext,
): void {
  const next = calculateScheduleOccurrence(schedule, sequenceNumber);
  updateScheduledTransactionRecord(
    schedule.id,
    next
      ? {
          nextOccurrenceNumber: sequenceNumber,
          nextNominalAt: next.nominalAt,
          nextEffectiveAt: next.effectiveAt ?? next.nominalAt,
          updatedAt: now,
        }
      : {
          status: "completed",
          nextOccurrenceNumber: sequenceNumber,
          nextNominalAt: null,
          nextEffectiveAt: null,
          updatedAt: now,
        },
    context,
  );
}

