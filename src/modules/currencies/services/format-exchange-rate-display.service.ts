import { db, type DbContext } from "@/infrastructure/database/client";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
  formatCurrency,
  getCurrencyMinorUnitExponent,
} from "@/utils/currency";
import { getExchangeRateMap } from "../repositories/exchange-rates.repository";

/**
 * Human-readable rate for one major unit of `fromCurrency` expressed in `toCurrency`.
 * Example: "1 USD = ₱58.50"
 */
export function formatOneMajorUnitExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  options?: {
    ratesMap?: Map<string, number> | Record<string, number>;
    baseCurrency?: string;
    context?: DbContext;
  },
): string {
  const from = fromCurrency.trim().toUpperCase();
  const to = toCurrency.trim().toUpperCase();
  if (from === to) return "";

  const baseCurrency = options?.baseCurrency ?? DEFAULT_BASE_CURRENCY;
  const ratesMap =
    options?.ratesMap ??
    getExchangeRateMap(baseCurrency, options?.context ?? db);
  const oneMajorInMinor = 10 ** getCurrencyMinorUnitExponent(from);
  const convertedMinor = convertCurrencyMinorUnits(
    oneMajorInMinor,
    from,
    to,
    ratesMap,
    baseCurrency,
  );

  return `1 ${from} = ${formatCurrency(convertedMinor, to, false)}`;
}
