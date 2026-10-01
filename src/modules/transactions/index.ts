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
} from "./types/transaction.types";
export type {
  QuickPresetSaveRequest,
  TransactionPreset,
  TransactionPresetInput,
  TransactionPresetSubmission,
} from "./types/transaction-preset.types";
