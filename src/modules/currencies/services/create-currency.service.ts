import { db, type DbContext } from "@/infrastructure/database/client";
import { insertCurrency } from "../repositories/currencies.repository";
import type { CreateCurrencyInput, Currency } from "../types/currency.types";
import {
  isCurrencyCodeInUse,
  refreshActiveCurrencyCatalog,
} from "./currency-catalog.service";

const CODE_PATTERN = /^[A-Z0-9]{3,8}$/;

export function createCurrency(
  input: CreateCurrencyInput,
  context: DbContext = db,
): Currency {
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  const symbol = input.symbol.trim();

  if (!CODE_PATTERN.test(code)) {
    throw new Error("Currency code must be 3–8 letters or numbers (e.g. CAD, AUD, KWD).");
  }
  if (!name) {
    throw new Error("Currency name is required.");
  }
  if (!symbol) {
    throw new Error("Currency symbol is required.");
  }
  if (
    !Number.isInteger(input.minorUnitExponent) ||
    input.minorUnitExponent < 0 ||
    input.minorUnitExponent > 3
  ) {
    throw new Error("Decimal places must be a whole number from 0 to 3.");
  }

  if (isCurrencyCodeInUse(code, [], context)) {
    throw new Error(`Currency ${code} already exists.`);
  }

  const created = insertCurrency(
    {
      code,
      name,
      symbol,
      minorUnitExponent: input.minorUnitExponent,
      sortOrder: 9000,
      isActive: true,
      isCustom: true,
    },
    context,
  );

  refreshActiveCurrencyCatalog(context);
  return created;
}
