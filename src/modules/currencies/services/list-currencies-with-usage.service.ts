import { db, type DbContext } from "@/infrastructure/database/client";
import { listCurrencies } from "../repositories/currencies.repository";
import {
  isCurrencyInUse,
  isCurrencyReferencedInLedger,
} from "../repositories/currency-usage.repository";
import type { CurrencyListItem } from "../types/currency.types";

export function listCurrenciesWithUsage(
  context: DbContext = db,
): CurrencyListItem[] {
  return listCurrencies(context).map((currency) => ({
    ...currency,
    isUsed: isCurrencyInUse(currency.code, context),
    isLocked: isCurrencyReferencedInLedger(currency.code, context),
  }));
}
