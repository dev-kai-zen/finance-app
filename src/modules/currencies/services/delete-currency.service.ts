import { db, type DbContext } from "@/infrastructure/database/client";
import {
  deleteCurrencyByCode,
  getCurrencyByCode,
} from "../repositories/currencies.repository";
import { deleteExchangeRatesForCurrency } from "../repositories/exchange-rates.repository";
import { isCurrencyReferencedInLedger } from "../repositories/currency-usage.repository";
import { refreshActiveCurrencyCatalog } from "./currency-catalog.service";

export function deleteCurrency(code: string, context: DbContext = db): void {
  const normalized = code.trim().toUpperCase();
  const existing = getCurrencyByCode(normalized, context);
  if (!existing) {
    throw new Error(`Currency ${normalized} was not found.`);
  }
  if (isCurrencyReferencedInLedger(normalized, context)) {
    throw new Error(
      "This currency is used by accounts, goals, or as your default currency and cannot be deleted.",
    );
  }

  context.transaction((tx) => {
    deleteExchangeRatesForCurrency(normalized, tx);
    deleteCurrencyByCode(normalized, tx);
  });

  refreshActiveCurrencyCatalog(context);
}
