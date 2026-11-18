import type { DbContext } from "@/infrastructure/database/client";
import {
  findScheduledTransaction,
  insertSchedulePosting,
  listUnprocessedScheduleOccurrences,
  updateScheduleOccurrenceRecord,
} from "../repositories/scheduled-transactions.repository";
import { advanceSchedule } from "./process-due-schedules.service";

/**
 * Marks any pending/due occurrences for a linked schedule as posted and advances the recurrence sequence.
 * Used when an external feature (e.g. Subscriptions) records a payment for a linked schedule.
 */
export function resolveScheduleOccurrencePaidInContext(
  scheduleId: string,
  transactionId: string,
  paidAt: Date,
  context: DbContext,
): void {
  const schedule = findScheduledTransaction(scheduleId, context);
  if (!schedule) return;

  const pendingOccurrences = listUnprocessedScheduleOccurrences(
    scheduleId,
    context,
  );

  if (pendingOccurrences.length > 0) {
    for (const occ of pendingOccurrences) {
      updateScheduleOccurrenceRecord(
        occ.id,
        {
          status: "posted",
          processedAt: paidAt,
          errorMessage: null,
          updatedAt: paidAt,
        },
        context,
      );
      insertSchedulePosting(occ.id, transactionId, paidAt, context);
    }
  }

  advanceSchedule(
    schedule,
    schedule.nextOccurrenceNumber + 1,
    paidAt,
    context,
  );
}
