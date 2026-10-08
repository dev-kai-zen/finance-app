import { db, type DbContext } from "@/infrastructure/database/client";
import { listCurrencies } from "../repositories/currencies.repository";
import { listUsedCurrencyCodes } from "../repositories/currency-usage.repository";
import type { CurrencyListItem } from "../types/currency.types";

export function listCurrenciesWithUsage(
  context: DbContext = db,
): CurrencyListItem[] {
  const used = listUsedCurrencyCodes(context);
  return listCurrencies(context).map((currency) => ({
    ...currency,
    isUsed: used.has(currency.code),
  }));
}
