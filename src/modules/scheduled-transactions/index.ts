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

