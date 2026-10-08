import { db, type DbContext } from "@/infrastructure/database/client";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import { getExchangeRateMap } from "../repositories/exchange-rates.repository";

export type CurrencyMinorUnitsBucket = Map<string, number>;

export function createCurrencyMinorUnitsBucket(): CurrencyMinorUnitsBucket {
  return new Map();
}

export function addToCurrencyMinorUnitsBucket(
  buckets: CurrencyMinorUnitsBucket,
  currencyCode: string,
  amountMinorUnits: number,
): void {
  if (amountMinorUnits === 0) return;
  const code = currencyCode.trim().toUpperCase();
  buckets.set(code, (buckets.get(code) ?? 0) + amountMinorUnits);
}

export function sumCurrencyMinorUnitsBucketsToTarget(
  buckets: CurrencyMinorUnitsBucket,
  targetCurrency: string,
  options?: {
    ratesMap?: Map<string, number> | Record<string, number>;
    baseCurrency?: string;
    context?: DbContext;
  },
): number {
  const baseCurrency = options?.baseCurrency ?? DEFAULT_BASE_CURRENCY;
  const ratesMap =
    options?.ratesMap ??
    getExchangeRateMap(baseCurrency, options?.context ?? db);
  const target = targetCurrency.trim().toUpperCase();
  let total = 0;
  for (const [code, amount] of buckets) {
    total += convertCurrencyMinorUnits(
      amount,
      code,
      target,
      ratesMap,
      baseCurrency,
    );
  }
  return total;
}

export function sumRowsByCurrencyToTarget(
  rows: ReadonlyArray<{ currencyCode: string; amountMinorUnits: number }>,
  targetCurrency: string,
  options?: {
    ratesMap?: Map<string, number> | Record<string, number>;
    baseCurrency?: string;
    context?: DbContext;
  },
): number {
  const buckets = createCurrencyMinorUnitsBucket();
  for (const row of rows) {
    addToCurrencyMinorUnitsBucket(
      buckets,
      row.currencyCode,
      row.amountMinorUnits,
    );
  }
  return sumCurrencyMinorUnitsBucketsToTarget(buckets, targetCurrency, options);
}
