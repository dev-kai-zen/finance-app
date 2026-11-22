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

export const removeScheduledTransaction = deferFunction(
  () =>
    require("./services/manage-scheduled-transaction.service")
      .removeScheduledTransaction,
) as typeof import("./services/manage-scheduled-transaction.service").removeScheduledTransaction;

export const getScheduledTransaction = deferFunction(
  () =>
    require("./services/manage-scheduled-transaction.service")
      .getScheduledTransaction,
) as typeof import("./services/manage-scheduled-transaction.service").getScheduledTransaction;

export const getScheduleBySubscriptionId = deferFunction(
  () =>
    require("./services/manage-scheduled-transaction.service")
      .getScheduleBySubscriptionId,
) as typeof import("./services/manage-scheduled-transaction.service").getScheduleBySubscriptionId;

export const restoreScheduledTransaction = deferFunction(
  () =>
    require("./services/manage-scheduled-transaction.service")
      .restoreScheduledTransaction,
) as typeof import("./services/manage-scheduled-transaction.service").restoreScheduledTransaction;

export const unlinkScheduledTransactionSubscription = deferFunction(
  () =>
    require("./services/manage-scheduled-transaction.service")
      .unlinkScheduledTransactionSubscription,
) as typeof import("./services/manage-scheduled-transaction.service").unlinkScheduledTransactionSubscription;

export const setScheduledTransactionPaused = deferFunction(
  () =>
    require("./services/manage-scheduled-transaction.service")
      .setScheduledTransactionPaused,
) as typeof import("./services/manage-scheduled-transaction.service").setScheduledTransactionPaused;

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

export const getPocketIdsWithSchedules = deferFunction(
  () =>
    require("./services/manage-scheduled-transaction.service")
      .getPocketIdsWithSchedules,
) as typeof import("./services/manage-scheduled-transaction.service").getPocketIdsWithSchedules;

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

export const processDueSchedules = deferFunction(
  () =>
    require("./services/process-due-schedules.service").processDueSchedules,
) as typeof import("./services/process-due-schedules.service").processDueSchedules;

export const processDueSchedulesAsync = deferFunction(
  () => require("./services/process-due-schedules.service").processDueSchedulesAsync,
) as typeof import("./services/process-due-schedules.service").processDueSchedulesAsync;

export const reconcileOrphanedSubscriptionSchedules = deferFunction(
  () =>
    require("./services/reconcile-orphaned-schedules.service")
      .reconcileOrphanedSubscriptionSchedules,
) as typeof import("./services/reconcile-orphaned-schedules.service").reconcileOrphanedSubscriptionSchedules;

export const advancePostScheduledTransaction = deferFunction(
  () =>
    require("./services/advance-post-schedule.service")
      .advancePostScheduledTransaction,
) as typeof import("./services/advance-post-schedule.service").advancePostScheduledTransaction;

export const saveScheduledTransaction = deferFunction(
  () =>
    require("./services/save-scheduled-transaction.service")
      .saveScheduledTransaction,
) as typeof import("./services/save-scheduled-transaction.service").saveScheduledTransaction;

export const saveScheduledTransactionInContext = deferFunction(
  () =>
    require("./services/save-scheduled-transaction.service")
      .saveScheduledTransactionInContext,
) as typeof import("./services/save-scheduled-transaction.service").saveScheduledTransactionInContext;

export const resolveScheduleOccurrencePaidInContext = deferFunction(
  () =>
    require("./services/resolve-schedule-paid.service")
      .resolveScheduleOccurrencePaidInContext,
) as typeof import("./services/resolve-schedule-paid.service").resolveScheduleOccurrencePaidInContext;

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

