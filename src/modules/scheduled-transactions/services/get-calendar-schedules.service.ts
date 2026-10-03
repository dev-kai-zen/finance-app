import {
  listScheduleOccurrences,
  listScheduledTransactions,
} from "../repositories/scheduled-transactions.repository";
import type {
  ScheduleOccurrenceStatus,
  ScheduledTransactionType,
} from "../types/scheduled-transaction.types";
import { calculateScheduleOccurrence } from "../utils/recurrence";

export interface CalendarScheduleOccurrence {
  id: string;
  scheduleId: string;
  scheduleName: string;
  transactionType: ScheduledTransactionType;
  amountCents: number;
  nominalDueAt: Date;
  effectiveDueAt: Date;
  status: ScheduleOccurrenceStatus | "upcoming";
  sequenceNumber: number;
  accountId: string;
  pocketId: string | null;
  categoryId: string | null;
  toAccountId: string | null;
  toPocketId: string | null;
  autoPost: boolean;
  isProjected: boolean;
}

export function getCalendarScheduleOccurrences(options: {
  startDate: Date;
  endDate: Date;
}): CalendarScheduleOccurrence[] {
  const { startDate, endDate } = options;
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  const schedules = listScheduledTransactions({ includeArchived: false });
  const allOccurrences = listScheduleOccurrences();

  const scheduleMap = new Map(schedules.map((s) => [s.id, s]));
  const occurrencesBySchedule = new Map<string, typeof allOccurrences>();

  for (const occ of allOccurrences) {
    const list = occurrencesBySchedule.get(occ.scheduleId) ?? [];
    list.push(occ);
    occurrencesBySchedule.set(occ.scheduleId, list);
  }

  const results: CalendarScheduleOccurrence[] = [];

  for (const schedule of schedules) {
    const recordedList = occurrencesBySchedule.get(schedule.id) ?? [];
    const handledSeqNumbers = new Set<number>();

    // 1. Include already recorded occurrences within the date window
    for (const occ of recordedList) {
      const occEffective = occ.effectiveDueAt ?? occ.nominalDueAt;
      const occTime = occEffective.getTime();
      handledSeqNumbers.add(occ.sequenceNumber);

      if (occTime >= startMs && occTime <= endMs) {
        let snapshotData: {
          name?: string | null;
          amountCents?: number;
          transactionType?: ScheduledTransactionType;
          accountId?: string;
          pocketId?: string | null;
          categoryId?: string | null;
          toAccountId?: string | null;
          toPocketId?: string | null;
        } = {};

        try {
          if (occ.templateSnapshot) {
            snapshotData = JSON.parse(occ.templateSnapshot);
          }
        } catch {
          // ignore snapshot parse errors, fallback to schedule
        }

        results.push({
          id: occ.id,
          scheduleId: schedule.id,
          scheduleName:
            snapshotData.name ||
            schedule.name ||
            (schedule.transactionType === "transfer"
              ? "Scheduled Transfer"
              : `Scheduled ${schedule.transactionType}`),
          transactionType:
            snapshotData.transactionType || schedule.transactionType,
          amountCents: snapshotData.amountCents ?? schedule.amountCents,
          nominalDueAt: occ.nominalDueAt,
          effectiveDueAt: occEffective,
          status: occ.status,
          sequenceNumber: occ.sequenceNumber,
          accountId: snapshotData.accountId || schedule.accountId,
          pocketId: snapshotData.pocketId ?? schedule.pocketId,
          categoryId: snapshotData.categoryId ?? schedule.categoryId,
          toAccountId: snapshotData.toAccountId ?? schedule.toAccountId,
          toPocketId: snapshotData.toPocketId ?? schedule.toPocketId,
          autoPost: schedule.autoPost,
          isProjected: false,
        });
      }
    }

    // 2. Project future occurrences if schedule is active
    if (schedule.status === "active") {
      let seq = schedule.nextOccurrenceNumber;
      let iterations = 0;
      const MAX_PROJECTIONS = 100;

      while (iterations < MAX_PROJECTIONS) {
        iterations++;
        const calc = calculateScheduleOccurrence(schedule, seq);
        if (!calc) break;

        const effectiveDate = calc.effectiveAt ?? calc.nominalAt;
        const effectiveTime = effectiveDate.getTime();

        if (effectiveTime > endMs) {
          // Beyond the end date, stop projecting
          break;
        }

        if (effectiveTime >= startMs && !handledSeqNumbers.has(seq)) {
          results.push({
            id: `proj-${schedule.id}-${seq}`,
            scheduleId: schedule.id,
            scheduleName:
              schedule.name ||
              (schedule.transactionType === "transfer"
                ? "Scheduled Transfer"
                : `Scheduled ${schedule.transactionType}`),
            transactionType: schedule.transactionType,
            amountCents: schedule.amountCents,
            nominalDueAt: calc.nominalAt,
            effectiveDueAt: effectiveDate,
            status: "upcoming",
            sequenceNumber: seq,
            accountId: schedule.accountId,
            pocketId: schedule.pocketId,
            categoryId: schedule.categoryId,
            toAccountId: schedule.toAccountId,
            toPocketId: schedule.toPocketId,
            autoPost: schedule.autoPost,
            isProjected: true,
          });
        }

        seq++;
      }
    }
  }

  // Sort chronologically
  results.sort(
    (a, b) => a.effectiveDueAt.getTime() - b.effectiveDueAt.getTime(),
  );

  return results;
}
