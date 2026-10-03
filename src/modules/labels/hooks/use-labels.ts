import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { listLabels } from "../repositories/labels.repository";
import type { Label } from "../types/label.types";

export function useLabels(options: { includeArchived?: boolean } = { includeArchived: true }) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      const data = listLabels({ includeArchived: options.includeArchived ?? true });
      setLabels(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load labels.");
    } finally {
      setLoading(false);
    }
  }, [options.includeArchived]);

  useFocusEffect(
    useCallback(() => {
      refresh();
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
