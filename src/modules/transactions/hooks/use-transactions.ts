import { useCallback, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { useFocusEffect } from "expo-router";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import {
  calculateTransactionStats,
  listTransactions,
  listDeletedTransactions,
} from "../repositories/transactions.repository";
import { recordTransaction as recordTransactionService } from "../services/record-transaction.service";
import { removeTransaction } from "../services/delete-transaction.service";
import { permanentlyDeleteAllDeletedTransactions } from "../services/permanently-delete-all-deleted-transactions.service";
import { permanentlyDeleteTransaction } from "../services/permanently-delete-transaction.service";
import { restoreTransaction } from "../services/restore-transaction.service";
import { updateTransfer } from "../services/update-transfer.service";
import { updateTransaction } from "../services/update-transaction.service";
import type {
  CreateTransactionInput,
  CreateTransferInput,
  Transaction,
  TransferResult,
  TransactionFilter,
  TransactionAttachmentChanges,
  TransactionListItem,
  TransactionStats,
  UpdateTransferInput,
} from "../types/transaction.types";
import type { TransactionPresetSubmission } from "../types/transaction-preset.types";

export interface UseTransactionsOptions {
  initialFilter?: TransactionFilter;
  filter?: TransactionFilter;
  skipQuery?: boolean;
  includeDeleted?: boolean;
  includeStats?: boolean;
}

let nextTransactionsHookId = 1;

function isUseTransactionsOptions(
  value: TransactionFilter | UseTransactionsOptions | undefined,
): value is UseTransactionsOptions {
  return Boolean(
    value &&
      ("skipQuery" in value ||
        "initialFilter" in value ||
        "filter" in value ||
        "includeDeleted" in value ||
        "includeStats" in value),
  );
}

export function useTransactions(
  filterOrOptions?: TransactionFilter | UseTransactionsOptions,
) {
  const skipQuery = isUseTransactionsOptions(filterOrOptions)
    ? Boolean(filterOrOptions.skipQuery)
    : false;
  const initialFilterFromOptions = isUseTransactionsOptions(filterOrOptions)
    ? filterOrOptions.initialFilter
    : filterOrOptions;
  const controlledFilter = isUseTransactionsOptions(filterOrOptions)
    ? filterOrOptions.filter
    : undefined;
  const includeDeleted = isUseTransactionsOptions(filterOrOptions)
    ? (filterOrOptions.includeDeleted ?? true)
    : true;
  const includeStats = isUseTransactionsOptions(filterOrOptions)
    ? (filterOrOptions.includeStats ?? true)
    : true;

  const [internalFilter, setInternalFilter] = useState<TransactionFilter>(
    controlledFilter ?? initialFilterFromOptions ?? { type: "all" },
  );

  const filter = controlledFilter ?? internalFilter;
  const setFilter = setInternalFilter;
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [deletedTransactions, setDeletedTransactions] = useState<
    TransactionListItem[]
  >([]);
  const [stats, setStats] = useState<TransactionStats>({
    totalInflowMinorUnits: 0,
    totalOutflowMinorUnits: 0,
    netCashflowMinorUnits: 0,
    transactionCount: 0,
  });
  const [loading, setLoading] = useState(!skipQuery);
  const [pendingAction, setPendingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const hookInstanceIdRef = useRef<number>(nextTransactionsHookId++);
  const cancelPendingRef = useRef<(() => void) | null>(null);

  const emitTransactionMutated = useCallback(() => {
    DeviceEventEmitter.emit("FINANCE_APP_TRANSACTION_MUTATED", {
      sourceId: hookInstanceIdRef.current,
    });
  }, []);

  const refreshDeletedTransactions = useCallback(() => {
    try {
      setError(null);
      setDeletedTransactions(listDeletedTransactions());
    } catch (err: any) {
      setError(err?.message || "Failed to load deleted transactions.");
    }
  }, []);

  const refresh = useCallback(() => {
    if (skipQuery) {
      return;
    }
    cancelPendingRef.current?.();
    cancelPendingRef.current = runDeferredSyncQuery(
      {
        hasCachedResult: hasLoadedOnceRef.current,
        setLoading,
        onMarkLoaded: () => {
          hasLoadedOnceRef.current = true;
        },
      },
      () => {
        cancelPendingRef.current = null;
        try {
          setError(null);
          const list = listTransactions(filter);
          const deletedList = includeDeleted ? listDeletedTransactions() : [];
          const computedStats = includeStats
            ? calculateTransactionStats()
            : {
                totalInflowMinorUnits: 0,
                totalOutflowMinorUnits: 0,
                netCashflowMinorUnits: 0,
                transactionCount: 0,
              };
          setTransactions(list);
          if (includeDeleted) {
            setDeletedTransactions(deletedList);
          }
          if (includeStats) {
            setStats(computedStats);
          }
        } catch (err: any) {
          setError(err?.message || "Failed to load transactions.");
        }
      },
    );
  }, [filter, includeDeleted, includeStats, skipQuery]);

  useFocusEffect(
    useCallback(() => {
      if (skipQuery) {
        return;
      }
      refresh();
      const sub = DeviceEventEmitter.addListener(
        "FINANCE_APP_TRANSACTION_MUTATED",
        (payload?: { sourceId?: number }) => {
          if (payload?.sourceId !== hookInstanceIdRef.current) {
            refresh();
          }
        },
      );
      return () => {
        sub.remove();
        cancelPendingRef.current?.();
        cancelPendingRef.current = null;
      };
    }, [refresh, skipQuery]),
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const recordTransaction = useCallback(
    async (
      input: CreateTransactionInput,
      preset?: TransactionPresetSubmission,
      attachmentChanges?: TransactionAttachmentChanges,
    ): Promise<string | null> => {
      try {
        setPendingAction(true);
        setError(null);
        const result = (await recordTransactionService(
          { kind: "transaction", input, preset },
          attachmentChanges,
        )) as Transaction;
        refresh();
        emitTransactionMutated();
        return result.id;
      } catch (err: any) {
        setError(err?.message || "Failed to record transaction.");
        return null;
      } finally {
        setPendingAction(false);
      }
    },
    [emitTransactionMutated, refresh],
  );

  const recordTransfer = useCallback(
    async (
      input: CreateTransferInput,
      preset?: TransactionPresetSubmission,
      attachmentChanges?: TransactionAttachmentChanges,
    ): Promise<string | null> => {
      try {
        setPendingAction(true);
        setError(null);
        const result = (await recordTransactionService(
          { kind: "transfer", input, preset },
          attachmentChanges,
        )) as TransferResult;
        refresh();
        emitTransactionMutated();
        return result.outLeg.transactionGroupId ?? result.outLeg.id;
      } catch (err: any) {
        setError(err?.message || "Failed to record transfer.");
        return null;
      } finally {
        setPendingAction(false);
      }
    },
    [emitTransactionMutated, refresh],
  );

  const deleteTx = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        removeTransaction(id);
        refresh();
        emitTransactionMutated();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to delete transaction.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [emitTransactionMutated, refresh],
  );

  const restoreTx = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        restoreTransaction(id);
        refresh();
        if (!includeDeleted) {
          refreshDeletedTransactions();
        }
        emitTransactionMutated();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to restore transaction.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [emitTransactionMutated, includeDeleted, refresh, refreshDeletedTransactions],
  );

  const permanentlyDeleteTx = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        permanentlyDeleteTransaction(id);
        refresh();
        if (!includeDeleted) {
          refreshDeletedTransactions();
        }
        emitTransactionMutated();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to permanently delete transaction.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [emitTransactionMutated, includeDeleted, refresh, refreshDeletedTransactions],
  );

  const permanentlyDeleteAllTx = useCallback(async (): Promise<boolean> => {
    try {
      setPendingAction(true);
      setError(null);
      permanentlyDeleteAllDeletedTransactions();
      refresh();
      if (!includeDeleted) {
        setDeletedTransactions([]);
      }
      emitTransactionMutated();
      return true;
    } catch (err: any) {
      setError(
        err?.message || "Failed to permanently delete all transactions.",
      );
      return false;
    } finally {
      setPendingAction(false);
    }
  }, [emitTransactionMutated, includeDeleted, refresh]);

  const editTransfer = useCallback(
    async (
      input: UpdateTransferInput,
      attachmentChanges?: TransactionAttachmentChanges,
    ): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        await updateTransfer(input, attachmentChanges);
        refresh();
        emitTransactionMutated();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to update transfer.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [emitTransactionMutated, refresh],
  );

  const editTransaction = useCallback(
    async (
      id: string,
      input: CreateTransactionInput,
      attachmentChanges?: TransactionAttachmentChanges,
    ): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        await updateTransaction(id, input, attachmentChanges);
        refresh();
        emitTransactionMutated();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to update transaction.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [emitTransactionMutated, refresh],
  );

  return {
    transactions,
    deletedTransactions,
    stats,
    loading,
    pendingAction,
    error,
    filter,
    setFilter,
    recordTransaction,
    recordTransfer,
    editTransfer,
    editTransaction,
    deleteTx,
    restoreTx,
    permanentlyDeleteTx,
    permanentlyDeleteAllTx,
    clearError,
    refresh,
    refreshDeletedTransactions,
  };
}
