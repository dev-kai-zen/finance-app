import { useCallback, useEffect, useState } from "react";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database/database-replacement";
import { seedCurrenciesIfEmpty } from "../services/seed-currencies.service";
import { listCurrenciesWithUsage } from "../services/list-currencies-with-usage.service";
import type { CurrencyListItem } from "../types/currency.types";

export function useCurrencies(): {
  currencies: CurrencyListItem[];
  loading: boolean;
  refresh: () => void;
} {
  const [currencies, setCurrencies] = useState<CurrencyListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    try {
      seedCurrenciesIfEmpty();
      setCurrencies(listCurrenciesWithUsage());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(
    () => subscribeToDatabaseReplacement(refresh),
    [refresh],
  );

  return { currencies, loading, refresh };
}
