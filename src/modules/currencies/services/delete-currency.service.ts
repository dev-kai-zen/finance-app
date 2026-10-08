import { db, type DbContext } from "@/infrastructure/database/client";
import {
  deleteCurrencyByCode,
  getCurrencyByCode,
} from "../repositories/currencies.repository";
import { isCurrencyInUse } from "../repositories/currency-usage.repository";
import { refreshActiveCurrencyCatalog } from "./currency-catalog.service";

export function deleteCurrency(code: string, context: DbContext = db): void {
  const normalized = code.trim().toUpperCase();
  const existing = getCurrencyByCode(normalized, context);
  if (!existing) {
    throw new Error(`Currency ${normalized} was not found.`);
  }
  if (!existing.isCustom) {
    throw new Error("Built-in currencies cannot be deleted.");
  }
  if (isCurrencyInUse(normalized, context)) {
    throw new Error("This currency is in use and cannot be deleted.");
  }

  deleteCurrencyByCode(normalized, context);
  refreshActiveCurrencyCatalog(context);
}
