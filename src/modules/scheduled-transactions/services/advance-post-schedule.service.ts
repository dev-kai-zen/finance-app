import { db } from "@/infrastructure/database/client";
import {
  findScheduledTransaction,
  insertScheduleOccurrence,
  updateScheduleOccurrenceRecord,
  updateScheduledTransactionRecord,
} from "../repositories/scheduled-transactions.repository";
import { calculateScheduleOccurrence } from "../utils/recurrence";
import { serializeScheduleTemplateSnapshot } from "../utils/schedule-template-snapshot";
import {
  advanceSchedule,
  parseTemplateSnapshot,
  postSnapshot,
  resolveRecordedOccurrence,
} from "./process-due-schedules.service";

export interface AdvancePostScheduleOptions {
  transactionDate?: Date;
  now?: Date;
}

export function advancePostScheduledTransaction(
  scheduleId: string,
  options?: AdvancePostScheduleOptions,
): void {
  const now = options?.now ?? new Date();
  const transactionDate = options?.transactionDate ?? now;

  db.transaction((tx) => {
    const schedule = findScheduledTransaction(scheduleId, tx);
    if (!schedule) {
      throw new Error("Scheduled transaction was not found.");
    }
    if (schedule.status !== "active") {
      throw new Error("Only active scheduled transactions can be advance posted.");
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
        tx,
      );
      throw new Error("No upcoming occurrences to advance post.");
    }

    const existing = resolveRecordedOccurrence(
      schedule.id,
      occurrence,
      tx,
    );

    if (existing) {
      if (existing.status === "posted") {
        throw new Error("This occurrence has already been posted.");
      }
      postSnapshot(
        parseTemplateSnapshot(existing.templateSnapshot),
        existing.id,
        transactionDate,
        now,
        tx,
      );
      updateScheduleOccurrenceRecord(
        existing.id,
        {
          status: "posted",
          processedAt: now,
          errorMessage: null,
          updatedAt: now,
        },
        tx,
      );
    } else {
      const created = insertScheduleOccurrence(
        {
          scheduleId: schedule.id,
          sequenceNumber: occurrence.sequenceNumber,
          nominalDueAt: occurrence.nominalAt,
          effectiveDueAt: occurrence.effectiveAt,
          templateSnapshot: serializeScheduleTemplateSnapshot(schedule),
          status: "posted",
          processedAt: now,
          errorMessage: null,
          createdAt: now,
          updatedAt: now,
        },
        tx,
      );

      postSnapshot(
        parseTemplateSnapshot(created.templateSnapshot),
        created.id,
        transactionDate,
        now,
        tx,
      );
    }

    advanceSchedule(schedule, occurrence.sequenceNumber + 1, now, tx);
  });
}

