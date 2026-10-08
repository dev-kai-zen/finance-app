import { db, type DbContext } from "@/infrastructure/database/client";
import {
  getCurrencyByCode,
  updateCurrencyRecord,
} from "../repositories/currencies.repository";
import { isCurrencyReferencedInLedger } from "../repositories/currency-usage.repository";
import type { Currency, UpdateCurrencyInput } from "../types/currency.types";
import { refreshActiveCurrencyCatalog } from "./currency-catalog.service";

export function updateCurrency(
  input: UpdateCurrencyInput,
  context: DbContext = db,
): Currency {
  const code = input.code.trim().toUpperCase();
  const existing = getCurrencyByCode(code, context);
  if (!existing) {
    throw new Error(`Currency ${code} was not found.`);
  }
  if (isCurrencyReferencedInLedger(code, context)) {
    throw new Error(
      "This currency is used by accounts, goals, or as your default currency and cannot be changed.",
    );
  }

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const symbol = input.symbol !== undefined ? input.symbol.trim() : existing.symbol;
  const minorUnitExponent =
    input.minorUnitExponent !== undefined
      ? input.minorUnitExponent
      : existing.minorUnitExponent;

  if (!name) {
    throw new Error("Currency name is required.");
  }
  if (!symbol) {
    throw new Error("Currency symbol is required.");
  }
  if (
    !Number.isInteger(minorUnitExponent) ||
    minorUnitExponent < 0 ||
    minorUnitExponent > 18
  ) {
    throw new Error("Decimal places must be a whole number from 0 to 18.");
  }

  if (!existing.isCustom && (name !== existing.name || symbol !== existing.symbol)) {
    throw new Error("Built-in currencies cannot be renamed.");
  }

  const updated = updateCurrencyRecord(
    code,
    { name, symbol, minorUnitExponent },
    context,
  );

  refreshActiveCurrencyCatalog(context);
  return updated;
}
