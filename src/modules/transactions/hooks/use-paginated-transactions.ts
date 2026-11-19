import { useCallback, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { useFocusEffect } from "expo-router";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
import {
  findTransactionListItemById,
  listDeletedTransactions,
  listTransactionsPage,
} from "../repositories/transactions.repository";
import { getTransactionsForExport } from "../services/get-transactions-for-export.service";
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
  TransactionAttachmentChanges,
  TransactionListItem,
  TransactionPageCursor,
  TransactionPageFilter,
  TransferResult,
  UpdateTransferInput,
} from "../types/transaction.types";
import type { TransactionPresetSubmission } from "../types/transaction-preset.types";

let nextPaginatedHookId = 100000;

export interface UsePaginatedTransactionsOptions {
  filter: TransactionPageFilter;
  pageSize?: number;
}

export function usePaginatedTransactions({
  filter,
  pageSize = 50,
}: UsePaginatedTransactionsOptions) {
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [deletedTransactions, setDeletedTransactions] = useState<
    TransactionListItem[]
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingAction, setPendingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedFilter, setResolvedFilter] =
    useState<TransactionPageFilter | null>(null);

  const isFilterTransitioning =
    resolvedFilter !== null && resolvedFilter !== filter;

  const hasLoadedOnceRef = useRef(false);
  const hookInstanceIdRef = useRef<number>(nextPaginatedHookId++);
  const requestIdRef = useRef(0);
  const nextCursorRef = useRef<TransactionPageCursor | null>(null);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const cancelPendingRefreshRef = useRef<(() => void) | null>(null);
  const cancelPendingLoadMoreRef = useRef<(() => void) | null>(null);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const cancelPending = useCallback(() => {
    cancelPendingRefreshRef.current?.();
    cancelPendingRefreshRef.current = null;
    cancelPendingLoadMoreRef.current?.();
    cancelPendingLoadMoreRef.current = null;
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, []);

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
    cancelPending();
    const requestId = ++requestIdRef.current;

    cancelPendingRefreshRef.current = runDeferredSyncQuery(
      {
        hasCachedResult: hasLoadedOnceRef.current,
        setLoading,
        onMarkLoaded: () => {
          hasLoadedOnceRef.current = true;
        },
      },
      () => {
        cancelPendingRefreshRef.current = null;
        if (requestId !== requestIdRef.current) {
          return;
        }
        try {
          setError(null);
          const page = listTransactionsPage({
            filter,
            limit: pageSize,
            cursor: null,
            includeTotalCount: true,
          });
          if (requestId !== requestIdRef.current) {
            return;
          }
          nextCursorRef.current = page.nextCursor;
          hasMoreRef.current = page.hasMore;
          setTransactions(page.items);
          setHasMore(page.hasMore);
          setTotalCount(page.totalCount ?? page.items.length);
          setResolvedFilter(filter);
        } catch (err: any) {
          setError(err?.message || "Failed to load transactions.");
          setResolvedFilter(filter);
        }
      },
    );
  }, [cancelPending, filter, pageSize]);

  const loadMore = useCallback(() => {
    if (!hasMoreRef.current || loadingMoreRef.current || !nextCursorRef.current) {
      return;
    }

    const requestId = requestIdRef.current;
    const cursor = nextCursorRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    cancelPendingLoadMoreRef.current?.();
    cancelPendingLoadMoreRef.current = scheduleAfterPaint(() => {
      cancelPendingLoadMoreRef.current = null;
      if (requestId !== requestIdRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
        return;
      }
      try {
        const page = listTransactionsPage({
          filter: filterRef.current,
          limit: pageSize,
          cursor,
          includeTotalCount: false,
        });
        if (requestId !== requestIdRef.current) {
          return;
        }
        nextCursorRef.current = page.nextCursor;
        hasMoreRef.current = page.hasMore;
        setHasMore(page.hasMore);
        setTransactions((prev) => {
          if (page.items.length === 0) return prev;
          const seen = new Set(prev.map((item) => item.id));
          const uniqueNext = page.items.filter((item) => !seen.has(item.id));
          return uniqueNext.length > 0 ? [...prev, ...uniqueNext] : prev;
        });
      } catch (err: any) {
        setError(err?.message || "Failed to load more transactions.");
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    });
  }, [pageSize]);

  useFocusEffect(
    useCallback(() => {
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
        requestIdRef.current += 1;
        cancelPending();
      };
    }, [cancelPending, refresh]),
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getTransactionById = useCallback((id: string): TransactionListItem | null => {
    return findTransactionListItemById(id);
  }, []);

  const getExportRows = useCallback((): TransactionListItem[] => {
    return getTransactionsForExport(filterRef.current);
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
        refreshDeletedTransactions();
        emitTransactionMutated();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to restore transaction.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [emitTransactionMutated, refresh, refreshDeletedTransactions],
  );

  const permanentlyDeleteTx = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        permanentlyDeleteTransaction(id);
        refresh();
        refreshDeletedTransactions();
        emitTransactionMutated();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to permanently delete transaction.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [emitTransactionMutated, refresh, refreshDeletedTransactions],
  );

  const permanentlyDeleteAllTx = useCallback(async (): Promise<boolean> => {
    try {
      setPendingAction(true);
      setError(null);
      permanentlyDeleteAllDeletedTransactions();
      refresh();
      setDeletedTransactions([]);
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
  }, [emitTransactionMutated, refresh]);

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
    totalCount,
    hasMore,
    loading,
    isFilterTransitioning,
    loadingMore,
    pendingAction,
    error,
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
    loadMore,
    refreshDeletedTransactions,
    getTransactionById,
    getExportRows,
  };
}
