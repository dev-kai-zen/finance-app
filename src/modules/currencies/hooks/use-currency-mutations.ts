import { useCallback, useState } from "react";
import { createCurrency } from "../services/create-currency.service";
import { deleteCurrency } from "../services/delete-currency.service";
import { updateCurrency } from "../services/update-currency.service";
import type { CreateCurrencyInput, UpdateCurrencyInput } from "../types/currency.types";

export function useCurrencyMutations(onSuccess: () => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const run = useCallback(
    (action: () => void): boolean => {
      setPending(true);
      setError(null);
      try {
        action();
        onSuccess();
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Something went wrong.");
        return false;
      } finally {
        setPending(false);
      }
    },
    [onSuccess],
  );

  return {
    pending,
    error,
    clearError,
    create: (input: CreateCurrencyInput) => run(() => createCurrency(input)),
    update: (input: UpdateCurrencyInput) => run(() => updateCurrency(input)),
    remove: (code: string) => run(() => deleteCurrency(code)),
  };
}
