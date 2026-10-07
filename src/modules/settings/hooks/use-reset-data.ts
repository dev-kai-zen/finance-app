import { useCallback, useState } from "react";

import { resetAppData } from "../services/reset-app-data.service";

export function useResetData() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetData = useCallback(async (): Promise<boolean> => {
    setPending(true);
    setError(null);

    try {
      await resetAppData();
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The app data could not be reset.",
      );
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  return {
    error,
    pending,
    clearError: () => setError(null),
    resetData,
  };
}
