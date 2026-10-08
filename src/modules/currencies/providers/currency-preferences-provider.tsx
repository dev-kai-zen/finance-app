import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useLocales } from "expo-localization";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database/database-replacement";
import {
  DEFAULT_CURRENCY_PREFERENCES,
  setActiveCurrencyFormattingPreferences,
  type CurrencyPreferences,
} from "@/utils/currency";
import {
  getCurrencyPreferences,
  saveCurrencyPreferences,
  subscribeToCurrencyPreferences,
} from "../services/currency-preferences.service";

interface CurrencyPreferencesContextValue {
  preferences: CurrencyPreferences;
  updatePreferences: (
    update: Partial<CurrencyPreferences> | CurrencyPreferences,
  ) => void;
}

export const CurrencyPreferencesContext =
  createContext<CurrencyPreferencesContextValue>({
    preferences: DEFAULT_CURRENCY_PREFERENCES,
    updatePreferences: () => {},
  });

export function CurrencyPreferencesProvider({ children }: PropsWithChildren) {
  const locale = useLocales()[0]?.languageTag ?? "en-PH";
  const [preferences, setPreferences] = useState<CurrencyPreferences>(() => {
    try {
      return getCurrencyPreferences();
    } catch {
      return DEFAULT_CURRENCY_PREFERENCES;
    }
  });

  setActiveCurrencyFormattingPreferences(preferences, locale);

  useEffect(
    () => subscribeToCurrencyPreferences(setPreferences),
    [],
  );

  useEffect(
    () =>
      subscribeToDatabaseReplacement(() => {
        try {
          setPreferences(getCurrencyPreferences());
        } catch {
          setPreferences(DEFAULT_CURRENCY_PREFERENCES);
        }
      }),
    [],
  );

  const updatePreferences = useCallback(
    (update: Partial<CurrencyPreferences> | CurrencyPreferences) => {
      const next = { ...preferences, ...update };
      setPreferences(saveCurrencyPreferences(next));
    },
    [preferences],
  );

  const value = useMemo(
    () => ({ preferences, updatePreferences }),
    [preferences, updatePreferences],
  );

  return (
    <CurrencyPreferencesContext.Provider value={value}>
      {children}
    </CurrencyPreferencesContext.Provider>
  );
}

