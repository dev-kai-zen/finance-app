import { db, type DbContext } from "@/infrastructure/database/client";
import { CURRENCY_DECIMALS, setActiveCurrencyMinorUnitExponents } from "@/utils/currency";
import {
  CURRENCY_NAMES,
  SUPPORTED_CURRENCY_CODES,
} from "../constants/currency-preferences.constants";
import { getCurrencyByCode, listCurrencies } from "../repositories/currencies.repository";
import type { CurrencyListItem } from "../types/currency.types";

export function refreshActiveCurrencyCatalog(context: DbContext): void {
  const rows = listCurrencies(context);
  if (rows.length === 0) {
    setActiveCurrencyMinorUnitExponents(CURRENCY_DECIMALS);
    return;
  }

  const map: Record<string, number> = { ...CURRENCY_DECIMALS };
  for (const row of rows) {
    map[row.code] = row.minorUnitExponent;
  }
  setActiveCurrencyMinorUnitExponents(map);
}

export function isCurrencyCodeInUse(
  rawCode: string,
  loadedCurrencies: CurrencyListItem[] = [],
  context: DbContext = db,
): boolean {
  const normalized = rawCode.trim().toUpperCase();
  if (!normalized) return false;

  // 1. Check in-memory loaded list (fastest, covers custom currencies)
  if (loadedCurrencies.some((c) => c.code.trim().toUpperCase() === normalized)) {
    return true;
  }

  // 2. Check standard built-in ISO currency definitions
  if (
    Object.prototype.hasOwnProperty.call(CURRENCY_NAMES, normalized) ||
    SUPPORTED_CURRENCY_CODES.includes(normalized) ||
    Boolean(CURRENCY_NAMES[normalized])
  ) {
    return true;
  }

  // 3. Check SQLite database (covers inactive, unlisted or custom currencies)
  try {
    const existing = getCurrencyByCode(normalized, context);
    if (existing) return true;
  } catch {
    // Gracefully handle any transient error
  }

  return false;
}

