import { deferComponent, deferFunction } from "@/utils/deferred-module";

export const ScheduledTransactionsScreen = deferComponent(
  () =>
    require("./screens/scheduled-transactions-screen")
      .ScheduledTransactionsScreen,
  "ScheduledTransactionsScreen",
) as typeof import("./screens/scheduled-transactions-screen").ScheduledTransactionsScreen;

export const ScheduledTransactionsProcessor = deferComponent(
  () =>
    require("./components/scheduled-transactions-processor")
      .ScheduledTransactionsProcessor,
  "ScheduledTransactionsProcessor",
) as typeof import("./components/scheduled-transactions-processor").ScheduledTransactionsProcessor;

export const clearScheduledTransactionWorkspace = deferFunction(
  () =>
    require("./services/manage-scheduled-transaction.service")
      .clearScheduledTransactionWorkspace,
) as typeof import("./services/manage-scheduled-transaction.service").clearScheduledTransactionWorkspace;

export const permanentlyDeleteScheduledTransaction = deferFunction(
  () =>
    require("./services/manage-scheduled-transaction.service")
      .permanentlyDeleteScheduledTransaction,
) as typeof import("./services/manage-scheduled-transaction.service").permanentlyDeleteScheduledTransaction;

export const hasScheduledTransactionPostings = deferFunction(
  () =>
    require("./services/manage-scheduled-transaction.service")
      .hasScheduledTransactionPostings,
) as typeof import("./services/manage-scheduled-transaction.service").hasScheduledTransactionPostings;

export const hasSchedulesForAccount = deferFunction(
  () =>
    require("./services/manage-scheduled-transaction.service")
      .hasSchedulesForAccount,
) as typeof import("./services/manage-scheduled-transaction.service").hasSchedulesForAccount;

export const getAccountIdsWithSchedules = deferFunction(
  () =>
    require("./services/manage-scheduled-transaction.service")
      .getAccountIdsWithSchedules,
) as typeof import("./services/manage-scheduled-transaction.service").getAccountIdsWithSchedules;

export const useScheduledTransactions = deferFunction(
  () => require("./hooks/use-scheduled-transactions").useScheduledTransactions,
) as typeof import("./hooks/use-scheduled-transactions").useScheduledTransactions;

export const getCalendarScheduleOccurrences = deferFunction(
  () =>
    require("./services/get-calendar-schedules.service")
      .getCalendarScheduleOccurrences,
) as typeof import("./services/get-calendar-schedules.service").getCalendarScheduleOccurrences;

export const postScheduledOccurrence = deferFunction(
  () =>
    require("./services/process-due-schedules.service").postScheduledOccurrence,
) as typeof import("./services/process-due-schedules.service").postScheduledOccurrence;

export const skipScheduledOccurrence = deferFunction(
  () =>
    require("./services/process-due-schedules.service").skipScheduledOccurrence,
) as typeof import("./services/process-due-schedules.service").skipScheduledOccurrence;

export type {
  CalculatedScheduleOccurrence,
  SaveScheduledTransactionInput,
  ScheduleEndMode,
  ScheduleFrequency,
  ScheduleOccurrence,
  ScheduleOccurrenceStatus,
  ScheduleStatus,
  ScheduleWeekendPolicy,
  ScheduledTransaction,
  ScheduledTransactionListItem,
  ScheduledTransactionType,
} from "./types/scheduled-transaction.types";
export type { CalendarScheduleOccurrence } from "./services/get-calendar-schedules.service";

