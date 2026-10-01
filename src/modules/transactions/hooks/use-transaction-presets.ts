import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { listActiveTransactionPresets } from "../repositories/transaction-presets.repository";
import { transactionPresetErrorMessage } from "../schemas/transaction-preset.schema";
import { deleteTransactionPreset } from "../services/delete-transaction-preset.service";
import { reorderTransactionPresets } from "../services/reorder-transaction-presets.service";
import { saveTransactionPreset } from "../services/save-transaction-preset.service";
import type {
  TransactionPreset,
  TransactionPresetInput,
} from "../types/transaction-preset.types";

export function useTransactionPresets() {
  const [presets, setPresets] = useState<TransactionPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      setLoading(true);
      setPresets(listActiveTransactionPresets());
      setError(null);
    } catch (cause) {
      setError(transactionPresetErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const save = useCallback(
    async (input: TransactionPresetInput, id?: string): Promise<boolean> => {
      try {
        setPending(true);
        setError(null);
        saveTransactionPreset(input, id);
        refresh();
        return true;
      } catch (cause) {
        setError(transactionPresetErrorMessage(cause));
        return false;
      } finally {
        setPending(false);
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setPending(true);
        setError(null);
        deleteTransactionPreset(id);
        refresh();
        return true;
      } catch (cause) {
        setError(transactionPresetErrorMessage(cause));
        return false;
      } finally {
        setPending(false);
      }
    },
    [refresh],
  );

  const reorder = useCallback(
    async (orderedIds: string[]): Promise<boolean> => {
      try {
        setPending(true);
        setError(null);
        reorderTransactionPresets(orderedIds);
        refresh();
        return true;
      } catch (cause) {
        setError(transactionPresetErrorMessage(cause));
        return false;
      } finally {
        setPending(false);
      }
    },
    [refresh],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    presets,
    loading,
    pending,
    error,
    refresh,
    savePreset: save,
    deletePreset: remove,
    reorderPresets: reorder,
    clearError,
  };
}
