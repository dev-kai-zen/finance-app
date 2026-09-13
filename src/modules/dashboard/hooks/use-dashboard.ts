import { useCallback, useEffect, useState } from "react";
import { getDashboardSummary } from "../repositories/dashboard.repository";
import type { DashboardSummary } from "../types/dashboard.types";

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      const data = getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    summary,
    loading,
    error,
    refresh,
  };
}
