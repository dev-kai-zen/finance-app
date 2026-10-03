import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  listActiveTransactionPresets,
  listArchivedTransactionPresets,
} from "../repositories/transaction-presets.repository";
import { transactionPresetErrorMessage } from "../schemas/transaction-preset.schema";
import { archiveTransactionPreset } from "../services/archive-transaction-preset.service";
import { deleteTransactionPreset } from "../services/delete-transaction-preset.service";
import { permanentlyDeleteTransactionPreset } from "../services/permanently-delete-transaction-preset.service";
import { reorderTransactionPresets } from "../services/reorder-transaction-presets.service";
import { restoreTransactionPreset } from "../services/restore-transaction-preset.service";
import { saveTransactionPreset } from "../services/save-transaction-preset.service";
import type {
  PresetSortBy,
  TransactionPreset,
  TransactionPresetInput,
} from "../types/transaction-preset.types";
import {
  readPresetSortPreference,
  writePresetSortPreference,
} from "../utils/preset-sort-preference";

export function useTransactionPresets(initialSortBy?: PresetSortBy) {
  const [sortBy, setSortByState] = useState<PresetSortBy>(
    () => initialSortBy ?? readPresetSortPreference(),
  );
  const [presets, setPresets] = useState<TransactionPreset[]>([]);
  const [archivedPresets, setArchivedPresets] = useState<TransactionPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      setLoading(true);
      setPresets(listActiveTransactionPresets({ sortBy }));
      setArchivedPresets(listArchivedTransactionPresets({ sortBy }));
      setError(null);
    } catch (cause) {
      setError(transactionPresetErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const setSortBy = useCallback((newSort: PresetSortBy) => {
    setSortByState(newSort);
    writePresetSortPreference(newSort);
  }, []);

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

  const archive = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setPending(true);
        setError(null);
        archiveTransactionPreset(id);
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

  const restore = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setPending(true);
        setError(null);
        restoreTransactionPreset(id);
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

  const permanentlyDelete = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setPending(true);
        setError(null);
        permanentlyDeleteTransactionPreset(id);
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
    archivedPresets,
    sortBy,
    setSortBy,
    loading,
    pending,
    error,
    refresh,
    savePreset: save,
    archivePreset: archive,
    deletePreset: remove,
    restorePreset: restore,
    permanentlyDeletePreset: permanentlyDelete,
    reorderPresets: reorder,
    clearError,
  };
}
