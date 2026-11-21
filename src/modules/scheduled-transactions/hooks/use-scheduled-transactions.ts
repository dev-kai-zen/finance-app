import { useCallback, useRef, useState } from "react";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import { useFocusEffect } from "expo-router";

import {
  listScheduleOccurrences,
  listScheduledTransactions,
} from "../repositories/scheduled-transactions.repository";
import { scheduledTransactionErrorMessage } from "../schemas/scheduled-transaction.schema";
import {
  endScheduledTransaction,
  getScheduleIdsWithPostings,
  permanentlyDeleteScheduledTransaction,
  removeScheduledTransaction,
  restoreScheduledTransaction,
  setScheduledTransactionPaused,
} from "../services/manage-scheduled-transaction.service";
import { advancePostScheduledTransaction } from "../services/advance-post-schedule.service";
import {
  postScheduledOccurrence,
  processDueSchedules,
  skipScheduledOccurrence,
} from "../services/process-due-schedules.service";
import { reconcileOrphanedSubscriptionSchedules } from "../services/reconcile-orphaned-schedules.service";
import { saveScheduledTransaction } from "../services/save-scheduled-transaction.service";
import type {
  SaveScheduledTransactionInput,
  ScheduleOccurrence,
  ScheduledTransaction,
} from "../types/scheduled-transaction.types";

export function useScheduledTransactions(options?: { skipQuery?: boolean; readOnly?: boolean }) {
  const skipQuery = options?.skipQuery ?? false;
  const readOnly = options?.readOnly ?? false;
  const cancelPendingRef = useRef<(() => void) | null>(null);
  const [schedules, setSchedules] = useState<ScheduledTransaction[]>([]);
  const [occurrences, setOccurrences] = useState<ScheduleOccurrence[]>([]);
  const [scheduleIdsWithPostings, setScheduleIdsWithPostings] = useState<
    Set<string>
  >(new Set());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    cancelPendingRef.current?.();
    if (skipQuery) return;
    cancelPendingRef.current = runDeferredSyncQuery({ hasCachedResult: false, setLoading }, () => {
      try {
        if (!readOnly) {
          reconcileOrphanedSubscriptionSchedules();
          processDueSchedules();
        }
        setSchedules(listScheduledTransactions({ includeArchived: true }));
        if (!readOnly) {
          setOccurrences(listScheduleOccurrences());
          setScheduleIdsWithPostings(getScheduleIdsWithPostings());
        }
        setError(null);
      } catch (cause) {
        setError(scheduledTransactionErrorMessage(cause));
      }
    });
  }, [readOnly, skipQuery]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      return () => cancelPendingRef.current?.();
    }, [refresh]),
  );

  const runMutation = useCallback(
    (operation: () => void): boolean => {
      try {
        setPending(true);
        setError(null);
        operation();
        refresh();
        return true;
      } catch (cause) {
        setError(scheduledTransactionErrorMessage(cause));
        return false;
      } finally {
        setPending(false);
      }
    },
    [refresh],
  );

  const save = useCallback(
    (input: SaveScheduledTransactionInput, id?: string): boolean =>
      runMutation(() => {
        saveScheduledTransaction(input, id);
      }),
    [runMutation],
  );

  const setPaused = useCallback(
    (id: string, paused: boolean): boolean =>
      runMutation(() => setScheduledTransactionPaused(id, paused)),
    [runMutation],
  );

  const end = useCallback(
    (id: string): boolean =>
      runMutation(() => endScheduledTransaction(id)),
    [runMutation],
  );

  const remove = useCallback(
    (id: string): boolean =>
      runMutation(() => {
        removeScheduledTransaction(id);
      }),
    [runMutation],
  );

  const permanentlyDelete = useCallback(
    (id: string): boolean =>
      runMutation(() => permanentlyDeleteScheduledTransaction(id)),
    [runMutation],
  );

  const restore = useCallback(
    (id: string): boolean =>
      runMutation(() => restoreScheduledTransaction(id)),
    [runMutation],
  );

  const postOccurrence = useCallback(
    (id: string): boolean =>
      runMutation(() => postScheduledOccurrence(id)),
    [runMutation],
  );

  const skipOccurrence = useCallback(
    (id: string): boolean =>
      runMutation(() => skipScheduledOccurrence(id)),
    [runMutation],
  );

  const advancePost = useCallback(
    (id: string, transactionDate?: Date): boolean =>
      runMutation(() => advancePostScheduledTransaction(id, { transactionDate })),
    [runMutation],
  );

  return {
    schedules,
    occurrences,
    scheduleIdsWithPostings,
    loading,
    pending,
    error,
    clearError: () => setError(null),
    refresh,
    save,
    setPaused,
    end,
    remove,
    permanentlyDelete,
    restore,
    postOccurrence,
    skipOccurrence,
    advancePost,
  };
}
