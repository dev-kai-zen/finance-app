import React, {
  createContext,
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useLocales } from "expo-localization";
import { I18n } from "i18n-js";

import {
  getSupportedLanguage,
} from "@/infrastructure/localization/constants/localization.constants";
import {
  getLanguagePreference,
  resolveSupportedLocale,
  setLanguagePreference as saveLanguagePreference,
} from "@/infrastructure/localization/services/language-preference.service";
import { translations } from "@/infrastructure/localization/translations";
import type { TranslationKey } from "@/infrastructure/localization/translations";
import type {
  LanguagePreference,
  SupportedLanguage,
  SupportedLocale,
} from "@/infrastructure/localization/types/localization.types";

type TranslationOptions = Record<string, string | number | boolean | null | undefined>;

interface LocalizationContextValue {
  locale: SupportedLocale;
  preference: LanguagePreference;
  activeLanguage: SupportedLanguage;
  setLanguagePreference: (preference: LanguagePreference) => void;
  t: (key: TranslationKey, options?: TranslationOptions) => string;
}

const fallbackLanguage = getSupportedLanguage("en");

const LocalizationContext = createContext<LocalizationContextValue>({
  locale: "en",
  preference: "system",
  activeLanguage: fallbackLanguage,
  setLanguagePreference: () => {},
  t: (key) => key,
});

export function LocalizationProvider({ children }: PropsWithChildren) {
  const deviceLanguageCode = useLocales()[0]?.languageCode;
  const [preference, setPreference] = useState<LanguagePreference>(() => {
    try {
      return getLanguagePreference();
    } catch {
      return "system";
    }
  });
  const locale = resolveSupportedLocale(preference, deviceLanguageCode);

  const i18n = useMemo(() => {
    const instance = new I18n(translations);
    instance.defaultLocale = "en";
    instance.enableFallback = true;
    instance.locale = locale;
    return instance;
  }, [locale]);

  const updatePreference = useCallback((next: LanguagePreference) => {
    saveLanguagePreference(next);
    setPreference(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, options?: TranslationOptions) =>
      i18n.t(key, options),
    [i18n],
  );

  const value = useMemo<LocalizationContextValue>(
    () => ({
      locale,
      preference,
      activeLanguage: getSupportedLanguage(locale),
      setLanguagePreference: updatePreference,
      t,
    }),
    [locale, preference, t, updatePreference],
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): LocalizationContextValue {
  return React.use(LocalizationContext);
}
