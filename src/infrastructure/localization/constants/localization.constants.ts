import type {
  LanguagePreference,
  SupportedLanguage,
  SupportedLocale,
} from "@/infrastructure/localization/types/localization.types";

export const LANGUAGE_PREFERENCE_SETTING_KEY = "app_language_preference";

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  { code: "en", englishName: "English", nativeName: "English" },
  { code: "fil", englishName: "Filipino", nativeName: "Filipino" },
  { code: "es", englishName: "Spanish", nativeName: "Español" },
] as const;

export const SUPPORTED_LOCALE_CODES = SUPPORTED_LANGUAGES.map(
  ({ code }) => code,
) as SupportedLocale[];

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return SUPPORTED_LOCALE_CODES.includes(value as SupportedLocale);
}

export function isLanguagePreference(
  value: unknown,
): value is LanguagePreference {
  return value === "system" || isSupportedLocale(value);
}

export function getSupportedLanguage(
  locale: SupportedLocale,
): SupportedLanguage {
  return (
    SUPPORTED_LANGUAGES.find((language) => language.code === locale) ??
    SUPPORTED_LANGUAGES[0]
  );
}
