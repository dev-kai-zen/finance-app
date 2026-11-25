import { DeviceEventEmitter } from "react-native";
import { useCallback, useRef, useState } from "react";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import { useFocusEffect } from "expo-router";

import {
  listActionableScheduleOccurrences,
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
  isScheduleCatchUpActive,
  postScheduledOccurrence,
  processDueSchedulesAsync,
  skipScheduledOccurrence,
} from "../services/process-due-schedules.service";
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
  const [hasMoreOccurrences, setHasMoreOccurrences] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const reloadScheduledData = useCallback(() => {
    cancelPendingRef.current?.();
    if (skipQuery) return;
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
          setSchedules(listScheduledTransactions({ includeArchived: true }));
          if (!readOnly) {
            const rows = listActionableScheduleOccurrences(101);
            setOccurrences(rows.slice(0, 100));
            setHasMoreOccurrences(rows.length > 100);
            setScheduleIdsWithPostings(getScheduleIdsWithPostings());
          }
          setError(null);
        } catch (cause) {
          setError(scheduledTransactionErrorMessage(cause));
        }
      },
    );
  }, [readOnly, skipQuery]);

  const requestCatchUpIfIdle = useCallback(() => {
    if (readOnly || isScheduleCatchUpActive()) return;
    void processDueSchedulesAsync().catch((cause) =>
      setError(scheduledTransactionErrorMessage(cause)),
    );
  }, [readOnly]);

  const refresh = useCallback(
    (options?: { requestCatchUp?: boolean }) => {
      reloadScheduledData();
      if (options?.requestCatchUp) {
        requestCatchUpIfIdle();
      }
    },
    [reloadScheduledData, requestCatchUpIfIdle],
  );

  useFocusEffect(
    useCallback(() => {
      refresh({ requestCatchUp: true });
      const subscription = DeviceEventEmitter.addListener(
        "FINANCE_APP_SCHEDULES_CHANGED",
        () => refresh(),
      );
      return () => {
        cancelPendingRef.current?.();
        subscription.remove();
      };
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

  const loadMoreOccurrences = useCallback(() => {
    if (loading || !hasMoreOccurrences || !occurrences.length) return;
    const last = occurrences[occurrences.length - 1];
    cancelPendingRef.current?.();
    cancelPendingRef.current = runDeferredSyncQuery({ hasCachedResult: true, setLoading }, () => {
      try {
        const rows = listActionableScheduleOccurrences(101, undefined, { date: last.nominalDueAt, id: last.id });
        setOccurrences((previous) => [...previous, ...rows.slice(0, 100)]);
        setHasMoreOccurrences(rows.length > 100);
      } catch (cause) { setError(scheduledTransactionErrorMessage(cause)); }
    });
  }, [loading, hasMoreOccurrences, occurrences]);

  return {
    schedules,
    occurrences,
    hasMoreOccurrences,
    loadMoreOccurrences,
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
