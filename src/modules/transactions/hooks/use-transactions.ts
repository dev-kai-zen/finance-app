import { useCallback, useEffect, useState } from "react";
import {
  calculateTransactionStats,
  listTransactions,
  listDeletedTransactions,
} from "../repositories/transactions.repository";
import { createTransaction } from "../services/create-transaction.service";
import { createTransfer } from "../services/create-transfer.service";
import { removeTransaction } from "../services/delete-transaction.service";
import { restoreTransaction } from "../services/restore-transaction.service";
import { updateTransfer } from "../services/update-transfer.service";
import { updateTransaction } from "../services/update-transaction.service";
import type {
  CreateTransactionInput,
  CreateTransferInput,
  TransactionFilter,
  TransactionListItem,
  TransactionStats,
  UpdateTransferInput,
} from "../types/transaction.types";

export function useTransactions(initialFilter?: TransactionFilter) {
  const [filter, setFilter] = useState<TransactionFilter>(
    initialFilter ?? { type: "all" },
  );
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
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      const list = listTransactions(filter);
      const deletedList = listDeletedTransactions();
      const computedStats = calculateTransactionStats();
      setTransactions(list);
      setDeletedTransactions(deletedList);
      setStats(computedStats);
    } catch (err: any) {
      setError(err?.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const recordTransaction = useCallback(
    async (input: CreateTransactionInput): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        createTransaction(input);
        refresh();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to record transaction.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [refresh],
  );

  const recordTransfer = useCallback(
    async (input: CreateTransferInput): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        createTransfer(input);
        refresh();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to record transfer.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [refresh],
  );

  const deleteTx = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        removeTransaction(id);
        refresh();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to delete transaction.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [refresh],
  );

  const restoreTx = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        restoreTransaction(id);
        refresh();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to restore transaction.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [refresh],
  );

  const editTransfer = useCallback(
    async (input: UpdateTransferInput): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        updateTransfer(input);
        refresh();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to update transfer.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [refresh],
  );

  const editTransaction = useCallback(
    async (
      id: string,
      input: CreateTransactionInput,
    ): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        updateTransaction(id, input);
        refresh();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to update transaction.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [refresh],
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
    refresh,
  };
}
