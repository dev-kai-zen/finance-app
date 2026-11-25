import type { TranslationKey } from "@/infrastructure/localization/translations";
import type { ScheduledTransaction } from "../types/scheduled-transaction.types";

type TranslateFn = (
  key: TranslationKey,
  options?: Record<string, string | number | boolean | null | undefined>,
) => string;

type RecurrenceSchedule = Pick<
  ScheduledTransaction,
  "frequency" | "intervalCount" | "endMode" | "maxOccurrences" | "endsOn"
>;

function formatEndsOn(endsOn: ScheduledTransaction["endsOn"]): string {
  if (!endsOn) return "";
  const parsed = new Date(endsOn);
  return Number.isNaN(parsed.getTime()) ? String(endsOn) : parsed.toLocaleDateString();
}

function recurrenceUnitKey(schedule: RecurrenceSchedule): TranslationKey {
  if (schedule.frequency === "once") {
    return "scheduledTransactions.recurrence.once";
  }
  if (schedule.intervalCount === 1) {
    if (schedule.frequency === "daily") return "scheduledTransactions.recurrence.daily";
    if (schedule.frequency === "weekly") return "scheduledTransactions.recurrence.weekly";
    if (schedule.frequency === "monthly") return "scheduledTransactions.recurrence.monthly";
    return "scheduledTransactions.recurrence.yearly";
  }
  if (schedule.frequency === "daily") return "scheduledTransactions.recurrence.everyDays";
  if (schedule.frequency === "weekly") return "scheduledTransactions.recurrence.everyWeeks";
  if (schedule.frequency === "monthly") return "scheduledTransactions.recurrence.everyMonths";
  return "scheduledTransactions.recurrence.everyYears";
}

export function formatScheduleRecurrence(
  schedule: RecurrenceSchedule,
  t: TranslateFn,
): string {
  const unitKey = recurrenceUnitKey(schedule);
  const unit =
    schedule.frequency !== "once" && schedule.intervalCount > 1
      ? t(unitKey, { count: schedule.intervalCount })
      : t(unitKey);

  if (schedule.endMode === "after_count" && schedule.maxOccurrences != null) {
    return t("scheduledTransactions.recurrence.afterCount", {
      summary: unit,
      count: schedule.maxOccurrences,
    });
  }
  if (schedule.endMode === "on_date" && schedule.endsOn) {
    return t("scheduledTransactions.recurrence.throughDate", {
      summary: unit,
      date: formatEndsOn(schedule.endsOn),
    });
  }
  return unit;
}