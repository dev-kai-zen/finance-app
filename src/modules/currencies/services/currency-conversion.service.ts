import { db, type DbContext } from "@/infrastructure/database/client";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import { getExchangeRateMap } from "../repositories/exchange-rates.repository";

export interface AccountBalanceSource {
  id: string;
  currencyCode: string;
  currentBalanceMinorUnits?: number;
  openingBalanceMinorUnits?: number;
}

/**
 * Converts a single account's balance to base currency (e.g. PHP) using database or cached rates.
 */
export function convertAccountBalanceToBase(
  account: { currencyCode: string; currentBalanceMinorUnits: number },
  baseCurrency: string = DEFAULT_BASE_CURRENCY,
  ratesMap?: Map<string, number>,
  context: DbContext = db,
): number {
  const activeRates = ratesMap ?? getExchangeRateMap(baseCurrency, context);
  return convertCurrencyMinorUnits(
    account.currentBalanceMinorUnits,
    account.currencyCode,
    baseCurrency,
    activeRates,
    baseCurrency,
  );
}

/**
 * Batch convert an array of accounts to base currency minor units.
 */
export function convertAccountsTotalToBase(
  accountsList: Array<{ currencyCode: string; currentBalanceMinorUnits: number }>,
  baseCurrency: string = DEFAULT_BASE_CURRENCY,
  ratesMap?: Map<string, number>,
  context: DbContext = db,
): number {
  const activeRates = ratesMap ?? getExchangeRateMap(baseCurrency, context);
  let total = 0;
  for (const acc of accountsList) {
    total += convertCurrencyMinorUnits(
      acc.currentBalanceMinorUnits,
      acc.currencyCode,
      baseCurrency,
      activeRates,
      baseCurrency,
    );
  }
  return total;
}
