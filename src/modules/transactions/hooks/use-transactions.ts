import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
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

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
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
        return result.id;
      } catch (err: any) {
        setError(err?.message || "Failed to record transaction.");
        return null;
      } finally {
        setPendingAction(false);
      }
    },
    [refresh],
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
        return result.outLeg.transactionGroupId ?? result.outLeg.id;
      } catch (err: any) {
        setError(err?.message || "Failed to record transfer.");
        return null;
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

  const permanentlyDeleteTx = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        permanentlyDeleteTransaction(id);
        refresh();
        return true;
      } catch (err: any) {
        setError(err?.message || "Failed to permanently delete transaction.");
        return false;
      } finally {
        setPendingAction(false);
      }
    },
    [refresh],
  );

  const permanentlyDeleteAllTx = useCallback(async (): Promise<boolean> => {
    try {
      setPendingAction(true);
      setError(null);
      permanentlyDeleteAllDeletedTransactions();
      refresh();
      return true;
    } catch (err: any) {
      setError(
        err?.message || "Failed to permanently delete all transactions.",
      );
      return false;
    } finally {
      setPendingAction(false);
    }
  }, [refresh]);

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
      attachmentChanges?: TransactionAttachmentChanges,
    ): Promise<boolean> => {
      try {
        setPendingAction(true);
        setError(null);
        await updateTransaction(id, input, attachmentChanges);
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
    permanentlyDeleteTx,
    permanentlyDeleteAllTx,
    clearError,
    refresh,
  };
}
