import { deferComponent, deferFunction } from "@/utils/deferred-module";

export const TransactionsScreen = deferComponent(
  () => require("./screens/transactions-screen").TransactionsScreen,
  "TransactionsScreen",
) as typeof import("./screens/transactions-screen").TransactionsScreen;

export const TransactionFormModal = deferComponent(
  () =>
    require("./components/transaction-form-modal").TransactionFormModal,
  "TransactionFormModal",
) as typeof import("./components/transaction-form-modal").TransactionFormModal;

export const TransactionDetailModal = deferComponent(
  () =>
    require("./components/transaction-detail-modal").TransactionDetailModal,
  "TransactionDetailModal",
) as typeof import("./components/transaction-detail-modal").TransactionDetailModal;

export const TransactionFilterModal = deferComponent(
  () =>
    require("./components/transaction-filter-modal").TransactionFilterModal,
  "TransactionFilterModal",
) as typeof import("./components/transaction-filter-modal").TransactionFilterModal;

export const TransactionRow = deferComponent(
  () => require("./components/transaction-row").TransactionRow,
  "TransactionRow",
) as typeof import("./components/transaction-row").TransactionRow;

export const TransactionTypePicker = deferComponent(
  () =>
    require("./components/transaction-type-picker").TransactionTypePicker,
  "TransactionTypePicker",
) as typeof import("./components/transaction-type-picker").TransactionTypePicker;

export const TransactionDateTimePickerModal = deferComponent(
  () =>
    require("./components/transaction-date-time-picker-modal")
      .TransactionDateTimePickerModal,
  "TransactionDateTimePickerModal",
) as typeof import("./components/transaction-date-time-picker-modal").TransactionDateTimePickerModal;

export const TransactionAttachmentsSyncProcessor = deferComponent(
  () =>
    require("./components/transaction-attachments-sync-processor")
      .TransactionAttachmentsSyncProcessor,
  "TransactionAttachmentsSyncProcessor",
) as typeof import("./components/transaction-attachments-sync-processor").TransactionAttachmentsSyncProcessor;

export const AttachmentViewerModal = deferComponent(
  () =>
    require("./components/attachment-viewer-modal").AttachmentViewerModal,
  "AttachmentViewerModal",
) as typeof import("./components/attachment-viewer-modal").AttachmentViewerModal;

export const useTransactions = deferFunction(
  () => require("./hooks/use-transactions").useTransactions,
) as typeof import("./hooks/use-transactions").useTransactions;

export const useTransactionPresets = deferFunction(
  () =>
    require("./hooks/use-transaction-presets").useTransactionPresets,
) as typeof import("./hooks/use-transaction-presets").useTransactionPresets;

export const reassignTransactionPresetCategory = deferFunction(
  () =>
    require("./services/reassign-transaction-preset-category.service")
      .reassignTransactionPresetCategory,
) as typeof import("./services/reassign-transaction-preset-category.service").reassignTransactionPresetCategory;

export const createTransaction = deferFunction(
  () => require("./services/create-transaction.service").createTransaction,
) as typeof import("./services/create-transaction.service").createTransaction;

export const createTransfer = deferFunction(
  () => require("./services/create-transfer.service").createTransfer,
) as typeof import("./services/create-transfer.service").createTransfer;

export const recordTransactionInContext = deferFunction(
  () =>
    require("./services/record-transaction.service")
      .recordTransactionInContext,
) as typeof import("./services/record-transaction.service").recordTransactionInContext;

export const removeTransaction = deferFunction(
  () => require("./services/delete-transaction.service").removeTransaction,
) as typeof import("./services/delete-transaction.service").removeTransaction;

export const permanentlyDeleteTransaction = deferFunction(
  () =>
    require("./services/permanently-delete-transaction.service")
      .permanentlyDeleteTransaction,
) as typeof import("./services/permanently-delete-transaction.service").permanentlyDeleteTransaction;

export const restoreTransaction = deferFunction(
  () =>
    require("./services/restore-transaction.service").restoreTransaction,
) as typeof import("./services/restore-transaction.service").restoreTransaction;

export const updateTransfer = deferFunction(
  () => require("./services/update-transfer.service").updateTransfer,
) as typeof import("./services/update-transfer.service").updateTransfer;

export const updateTransaction = deferFunction(
  () => require("./services/update-transaction.service").updateTransaction,
) as typeof import("./services/update-transaction.service").updateTransaction;

export const getAccountBalanceDeltas = deferFunction(
  () =>
    require("./services/get-account-balance-deltas.service")
      .getAccountBalanceDeltas,
) as typeof import("./services/get-account-balance-deltas.service").getAccountBalanceDeltas;

export const getAccountBalanceDeltasAtDates = deferFunction(
  () =>
    require("./services/get-account-balance-deltas.service")
      .getAccountBalanceDeltasAtDates,
) as typeof import("./services/get-account-balance-deltas.service").getAccountBalanceDeltasAtDates;

export const getAccountBalanceDeltasAtDate = deferFunction(
  () =>
    require("./services/get-account-balance-deltas.service")
      .getAccountBalanceDeltasAtDate,
) as typeof import("./services/get-account-balance-deltas.service").getAccountBalanceDeltasAtDate;

export const getRecentTransactions = deferFunction(
  () =>
    require("./services/get-recent-transactions.service").getRecentTransactions,
) as typeof import("./services/get-recent-transactions.service").getRecentTransactions;

export const getAccountLedgerTransactions = deferFunction(
  () =>
    require("./services/get-account-ledger-transactions.service")
      .getAccountLedgerTransactions,
) as typeof import("./services/get-account-ledger-transactions.service").getAccountLedgerTransactions;

export const getPocketTransactionBalanceDeltas = deferFunction(
  () =>
    require("./services/get-pocket-transaction-balance-deltas.service")
      .getPocketTransactionBalanceDeltas,
) as typeof import("./services/get-pocket-transaction-balance-deltas.service").getPocketTransactionBalanceDeltas;

export const getPocketBalanceDeltasAtDate = deferFunction(
  () =>
    require("./services/get-pocket-transaction-balance-deltas.service")
      .getPocketBalanceDeltasAtDate,
) as typeof import("./services/get-pocket-transaction-balance-deltas.service").getPocketBalanceDeltasAtDate;

export const getCategoryExpenseTotal = deferFunction(
  () =>
    require("./services/get-category-expense-summary.service")
      .getCategoryExpenseTotal,
) as typeof import("./services/get-category-expense-summary.service").getCategoryExpenseTotal;

export const getCategoryExpenseTotalsGrouped = deferFunction(
  () =>
    require("./services/get-category-expense-summary.service")
      .getCategoryExpenseTotalsGrouped,
) as typeof import("./services/get-category-expense-summary.service").getCategoryExpenseTotalsGrouped;

export const getCategoryBreakdown = deferFunction(
  () =>
    require("./services/get-category-breakdown.service").getCategoryBreakdown,
) as typeof import("./services/get-category-breakdown.service").getCategoryBreakdown;

export const getCashFlowHistory = deferFunction(
  () =>
    require("./services/get-cashflow-history.service").getCashFlowHistory,
) as typeof import("./services/get-cashflow-history.service").getCashFlowHistory;

export const hasTransactions = deferFunction(
  () => require("./services/has-transactions.service").hasTransactions,
) as typeof import("./services/has-transactions.service").hasTransactions;

export const clearTransactionWorkspace = deferFunction(
  () =>
    require("./services/workspace-transactions.service")
      .clearTransactionWorkspace,
) as typeof import("./services/workspace-transactions.service").clearTransactionWorkspace;

export const createSampleTransactions = deferFunction(
  () =>
    require("./services/workspace-transactions.service")
      .createSampleTransactions,
) as typeof import("./services/workspace-transactions.service").createSampleTransactions;

export const archiveTransactionPreset = deferFunction(
  () =>
    require("./services/archive-transaction-preset.service")
      .archiveTransactionPreset,
) as typeof import("./services/archive-transaction-preset.service").archiveTransactionPreset;

export const restoreTransactionPreset = deferFunction(
  () =>
    require("./services/restore-transaction-preset.service")
      .restoreTransactionPreset,
) as typeof import("./services/restore-transaction-preset.service").restoreTransactionPreset;

export const permanentlyDeleteTransactionPreset = deferFunction(
  () =>
    require("./services/permanently-delete-transaction-preset.service")
      .permanentlyDeleteTransactionPreset,
) as typeof import("./services/permanently-delete-transaction-preset.service").permanentlyDeleteTransactionPreset;

export const isAccountInUseByTransactions = deferFunction(
  () =>
    require("./services/is-account-in-use.service").isAccountInUseByTransactions,
) as typeof import("./services/is-account-in-use.service").isAccountInUseByTransactions;

export const getAccountIdsInUseByTransactions = deferFunction(
  () =>
    require("./services/is-account-in-use.service")
      .getAccountIdsInUseByTransactions,
) as typeof import("./services/is-account-in-use.service").getAccountIdsInUseByTransactions;

export type {
  Transaction,
  TransactionListItem,
  CreateTransactionInput,
  CreateTransferInput,
  UpdateTransferInput,
  TransferResult,
  TransactionFilter,
  TransactionStats,
  TransactionType,
  TransactionAttachment,
  TransactionAttachmentChanges,
  TransactionAttachmentDraft,
  TransactionAttachmentSyncStatus,
} from "./types/transaction.types";
export type {
  ListPresetsOptions,
  PresetSortBy,
  QuickPresetSaveRequest,
  TransactionPreset,
  TransactionPresetInput,
  TransactionPresetSubmission,
} from "./types/transaction-preset.types";
export type {
  CategoryBreakdownItem,
  CategoryBreakdownQuery,
  CategoryBreakdownResult,
} from "./services/get-category-breakdown.service";
export type {
  CashFlowHistoryQuery,
  CashFlowHistoryResult,
  CashFlowPeriodPoint,
} from "./services/get-cashflow-history.service";
