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

export interface ScheduleListSearchContext {
  getAccountName: (accountId: string) => string | undefined;
  getCategoryName: (categoryId: string | null) => string | undefined;
}

export function normalizeScheduleSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

export function scheduleMatchesSearchQuery(
  schedule: Pick<
    ScheduledTransaction,
    "name" | "note" | "accountId" | "toAccountId" | "categoryId"
  >,
  normalizedQuery: string,
  context: ScheduleListSearchContext,
): boolean {
  if (!normalizedQuery) return true;

  const fields: string[] = [];
  const name = schedule.name?.trim();
  if (name) fields.push(name);
  const note = schedule.note?.trim();
  if (note) fields.push(note);

  const categoryName = context.getCategoryName(schedule.categoryId);
  if (categoryName) fields.push(categoryName);

  const sourceName = context.getAccountName(schedule.accountId);
  if (sourceName) fields.push(sourceName);

  if (schedule.toAccountId) {
    const destinationName = context.getAccountName(schedule.toAccountId);
    if (destinationName) fields.push(destinationName);
  }

  return fields.some((field) =>
    field.toLocaleLowerCase().includes(normalizedQuery),
  );
}

export function filterSchedulesBySearch<T extends ScheduledTransaction>(
  schedules: readonly T[],
  searchQuery: string,
  context: ScheduleListSearchContext,
): T[] {
  const normalizedQuery = normalizeScheduleSearchQuery(searchQuery);
  if (!normalizedQuery) return [...schedules];

  return schedules.filter((schedule) =>
    scheduleMatchesSearchQuery(schedule, normalizedQuery, context),
  );
}
