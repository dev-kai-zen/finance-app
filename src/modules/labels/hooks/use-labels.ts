import { useCallback, useRef, useState } from "react";
import { runDeferredSyncQuery } from "@/utils/run-deferred-sync-query";
import { useFocusEffect } from "expo-router";
import { listLabels } from "../repositories/labels.repository";
import type { Label } from "../types/label.types";

export function useLabels(options: { includeArchived?: boolean; skipQuery?: boolean } = { includeArchived: true }) {
  const skipQuery = options.skipQuery ?? false;
  const cancelPendingRef = useRef<(() => void) | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    cancelPendingRef.current?.();
    if (skipQuery) return;
    cancelPendingRef.current = runDeferredSyncQuery({ hasCachedResult: false, setLoading }, () => {
      try {
        const data = listLabels({ includeArchived: options.includeArchived ?? true });
        setLabels(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load labels.");
      }
    });
  }, [options.includeArchived, skipQuery]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      return () => cancelPendingRef.current?.();
    }, [refresh]),
  );

  const activeLabels = labels.filter((l) => !l.isArchived);
  const archivedLabels = labels.filter((l) => l.isArchived);

  return {
    labels,
    activeLabels,
    archivedLabels,
    loading,
    error,
    refresh,
  };
}
