import { db, type DbContext } from "@/infrastructure/database/client";
import {
  recordTransactionInContext,
  type Transaction,
  type TransferResult,
} from "@/modules/transactions";
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

function parseTemplateSnapshot(raw: string): ScheduledTemplateSnapshot {
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

const MAX_OCCURRENCES_PER_RUN = 500;

export function processDueSchedules(
  now = new Date(),
): DueScheduleProcessingResult {
  const result: DueScheduleProcessingResult = {
    processed: 0,
    posted: 0,
    due: 0,
    skipped: 0,
    failed: 0,
  };

  while (result.processed < MAX_OCCURRENCES_PER_RUN) {
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

  return result;
}

function processNextOccurrence(
  scheduleId: string,
  now: Date,
  context: DbContext,
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
    postSnapshot(
      parseTemplateSnapshot(created.templateSnapshot),
      created.id,
      occurrence.effectiveAt ?? occurrence.nominalAt,
      now,
      context,
    );
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

    postSnapshot(
      parseTemplateSnapshot(occurrence.templateSnapshot),
      occurrence.id,
      occurrence.effectiveDueAt ?? occurrence.nominalDueAt,
      now,
      tx,
    );
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

function postSnapshot(
  snapshot: ScheduledTemplateSnapshot,
  occurrenceId: string,
  occurredAt: Date,
  now: Date,
  context: DbContext,
): void {
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
    );
    insertSchedulePosting(occurrenceId, result.outLeg.id, now, context);
    insertSchedulePosting(occurrenceId, result.inLeg.id, now, context);
    return;
  }

  result = recordTransactionInContext(
    {
      kind: "transaction",
      input: {
        accountId: snapshot.accountId,
        categoryId: snapshot.categoryId!,
        pocketId: snapshot.pocketId,
        type: snapshot.transactionType,
        amountMinorUnits:
          snapshot.transactionType === "expense"
            ? -snapshot.amountMinorUnits
            : snapshot.amountMinorUnits,
        name: snapshot.name,
        note: snapshot.note,
        occurredAt,
      },
    },
    context,
  );
  insertSchedulePosting(occurrenceId, result.id, now, context);
}

function resolveRecordedOccurrence(
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

function advanceSchedule(
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

