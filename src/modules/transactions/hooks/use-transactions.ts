import { useCallback, useEffect, useState } from "react";
import {
  calculateTransactionStats,
  listTransactions,
} from "../repositories/transactions.repository";
import { createTransaction } from "../services/create-transaction.service";
import { createTransfer } from "../services/create-transfer.service";
import { removeTransaction } from "../services/delete-transaction.service";
import type {
  CreateTransactionInput,
  CreateTransferInput,
  TransactionFilter,
  TransactionListItem,
  TransactionStats,
} from "../types/transaction.types";

export function useTransactions(initialFilter?: TransactionFilter) {
  const [filter, setFilter] = useState<TransactionFilter>(
    initialFilter ?? { type: "all" },
  );
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
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
      const computedStats = calculateTransactionStats();
      setTransactions(list);
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

  return {
    transactions,
    stats,
    loading,
    pendingAction,
    error,
    filter,
    setFilter,
    recordTransaction,
    recordTransfer,
    deleteTx,
    refresh,
  };
}
