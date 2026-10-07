import type { DbContext } from "@/infrastructure/database/client";
import {
  DEFAULT_LOCALE,
  LANGUAGE_PREFERENCE_SETTING_KEY,
  isLanguagePreference,
  isSupportedLocale,
} from "@/infrastructure/localization/constants/localization.constants";
import {
  readLanguagePreferenceValue,
  writeLanguagePreferenceValue,
} from "@/infrastructure/localization/repositories/language-preference.repository";
import type {
  LanguagePreference,
  SupportedLocale,
} from "@/infrastructure/localization/types/localization.types";

export function getLanguagePreference(
  context?: DbContext,
): LanguagePreference {
  const stored = readLanguagePreferenceValue(
    LANGUAGE_PREFERENCE_SETTING_KEY,
    context,
  );

  return isLanguagePreference(stored) ? stored : "system";
}

export function setLanguagePreference(
  preference: LanguagePreference,
  context?: DbContext,
): void {
  writeLanguagePreferenceValue(
    LANGUAGE_PREFERENCE_SETTING_KEY,
    preference,
    context,
  );
}

export function resolveSupportedLocale(
  preference: LanguagePreference,
  deviceLanguageCode: string | null | undefined,
): SupportedLocale {
  if (preference !== "system") return preference;

  const normalizedCode = deviceLanguageCode?.toLowerCase();
  if (normalizedCode === "tl") return "fil";
  if (isSupportedLocale(normalizedCode)) return normalizedCode;

  return DEFAULT_LOCALE;
}
