import type { DbContext } from "@/infrastructure/database/client";
import {
  findScheduledTransaction,
  findSchedulePostingByTransactionId,
  insertSchedulePosting,
  listUnprocessedScheduleOccurrences,
  updateScheduleOccurrenceRecord,
} from "../repositories/scheduled-transactions.repository";
import { advanceSchedule } from "./process-due-schedules.service";

/**
 * Marks the oldest pending/due occurrence as posted for an external payment and advances
 * the schedule by one step. Used when Subscriptions records Mark Paid.
 */
export function resolveScheduleOccurrencePaidInContext(
  scheduleId: string,
  transactionId: string,
  paidAt: Date,
  context: DbContext,
): void {
  if (findSchedulePostingByTransactionId(transactionId, context)) {
    return;
  }

  const schedule = findScheduledTransaction(scheduleId, context);
  if (!schedule) return;

  const pendingOccurrences = listUnprocessedScheduleOccurrences(
    scheduleId,
    context,
  );

  if (pendingOccurrences.length > 0) {
    const target = pendingOccurrences[0];
    updateScheduleOccurrenceRecord(
      target.id,
      {
        status: "posted",
        processedAt: paidAt,
        errorMessage: null,
        updatedAt: paidAt,
      },
      context,
    );
    insertSchedulePosting(target.id, transactionId, paidAt, context);
    advanceSchedule(schedule, target.sequenceNumber + 1, paidAt, context);
    return;
  }

  advanceSchedule(
    schedule,
    schedule.nextOccurrenceNumber + 1,
    paidAt,
    context,
  );
}