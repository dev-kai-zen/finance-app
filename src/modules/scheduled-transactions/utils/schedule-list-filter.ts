import type { ScheduledTransaction } from "../types/scheduled-transaction.types";

export type ScheduleListFilter = "active" | "completed" | "archived";

export const DEFAULT_SCHEDULE_LIST_FILTERS: readonly ScheduleListFilter[] = [
  "active",
];

export function getScheduleListFilter(
  schedule: Pick<ScheduledTransaction, "archivedAt" | "status">,
): ScheduleListFilter {
  if (schedule.archivedAt !== null) return "archived";
  if (schedule.status === "completed") return "completed";
  return "active";
}

export function filterSchedulesByStatus<T extends ScheduledTransaction>(
  schedules: readonly T[],
  selectedFilters: ReadonlySet<ScheduleListFilter>,
): T[] {
  return schedules.filter((schedule) =>
    selectedFilters.has(getScheduleListFilter(schedule)),
  );
}
