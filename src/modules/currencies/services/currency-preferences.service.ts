import { db, type DbContext } from "@/infrastructure/database/client";
import {
  DEFAULT_CURRENCY_PREFERENCES,
  setActiveCurrencyFormattingPreferences,
  type CurrencyPreferences,
  type DecimalFormat,
  type NegativeNumberFormat,
} from "@/utils/currency";
import {
  CURRENCY_PREFERENCE_KEYS,
  SUPPORTED_CURRENCY_CODES,
} from "../constants/currency-preferences.constants";
import {
  getCurrencyPreferenceEntries,
  saveCurrencyPreferenceEntries,
} from "../repositories/currency-preferences.repository";

type CurrencyPreferencesListener = (preferences: CurrencyPreferences) => void;
const listeners = new Set<CurrencyPreferencesListener>();

const DECIMAL_FORMATS: DecimalFormat[] = [
  "automatic",
  "comma-dot",
  "dot-comma",
  "space-dot",
  "space-comma",
];
const NEGATIVE_FORMATS: NegativeNumberFormat[] = ["minus", "parentheses"];

export function getCurrencyPreferences(
  context: DbContext = db,
): CurrencyPreferences {
  const entries = getCurrencyPreferenceEntries(
    Object.values(CURRENCY_PREFERENCE_KEYS),
    context,
  );
  const defaultCurrency = entries[CURRENCY_PREFERENCE_KEYS.defaultCurrency];
  const negativeFormat = entries[CURRENCY_PREFERENCE_KEYS.negativeFormat];
  const decimalFormat = entries[CURRENCY_PREFERENCE_KEYS.decimalFormat];
  const decimalDigits = Number(
    entries[CURRENCY_PREFERENCE_KEYS.decimalDigits],
  );

  return {
    defaultCurrency: SUPPORTED_CURRENCY_CODES.includes(defaultCurrency)
      ? defaultCurrency
      : DEFAULT_CURRENCY_PREFERENCES.defaultCurrency,
    displayCurrency: parseBoolean(
      entries[CURRENCY_PREFERENCE_KEYS.displayCurrency],
      DEFAULT_CURRENCY_PREFERENCES.displayCurrency,
    ),
    colorAmounts: parseBoolean(
      entries[CURRENCY_PREFERENCE_KEYS.colorAmounts],
      DEFAULT_CURRENCY_PREFERENCES.colorAmounts,
    ),
    negativeFormat: NEGATIVE_FORMATS.includes(
      negativeFormat as NegativeNumberFormat,
    )
      ? (negativeFormat as NegativeNumberFormat)
      : DEFAULT_CURRENCY_PREFERENCES.negativeFormat,
    decimalDigits:
      Number.isInteger(decimalDigits) && decimalDigits >= 0 && decimalDigits <= 9
        ? decimalDigits
        : DEFAULT_CURRENCY_PREFERENCES.decimalDigits,
    decimalFormat: DECIMAL_FORMATS.includes(decimalFormat as DecimalFormat)
      ? (decimalFormat as DecimalFormat)
      : DEFAULT_CURRENCY_PREFERENCES.decimalFormat,
  };
}

export function saveCurrencyPreferences(
  preferences: CurrencyPreferences,
  context: DbContext = db,
): CurrencyPreferences {
  const validated = validateCurrencyPreferences(preferences);

  context.transaction((tx) => {
    saveCurrencyPreferenceEntries(
      {
        [CURRENCY_PREFERENCE_KEYS.defaultCurrency]: validated.defaultCurrency,
        [CURRENCY_PREFERENCE_KEYS.displayCurrency]: String(
          validated.displayCurrency,
        ),
        [CURRENCY_PREFERENCE_KEYS.colorAmounts]: String(validated.colorAmounts),
        [CURRENCY_PREFERENCE_KEYS.negativeFormat]: validated.negativeFormat,
        [CURRENCY_PREFERENCE_KEYS.decimalDigits]: String(
          validated.decimalDigits,
        ),
        [CURRENCY_PREFERENCE_KEYS.decimalFormat]: validated.decimalFormat,
      },
      tx,
    );
  });

  setActiveCurrencyFormattingPreferences(validated);
  listeners.forEach((listener) => listener(validated));
  return validated;
}

export function subscribeToCurrencyPreferences(
  listener: CurrencyPreferencesListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function validateCurrencyPreferences(
  preferences: CurrencyPreferences,
): CurrencyPreferences {
  if (!SUPPORTED_CURRENCY_CODES.includes(preferences.defaultCurrency)) {
    throw new Error("Choose a supported currency.");
  }
  if (
    !Number.isInteger(preferences.decimalDigits) ||
    preferences.decimalDigits < 0 ||
    preferences.decimalDigits > 9
  ) {
    throw new Error("Decimal digits must be a whole number from 0 to 9.");
  }
  if (!NEGATIVE_FORMATS.includes(preferences.negativeFormat)) {
    throw new Error("Choose a supported negative number format.");
  }
  if (!DECIMAL_FORMATS.includes(preferences.decimalFormat)) {
    throw new Error("Choose a supported decimal format.");
  }
  return { ...preferences };
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

