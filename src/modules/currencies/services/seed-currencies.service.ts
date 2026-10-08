import { db, type DbContext } from "@/infrastructure/database/client";
import { currencies } from "@/infrastructure/database/schema";
import {
  CURRENCY_DECIMALS,
  CURRENCY_SYMBOLS,
} from "@/utils/currency";
import { CURRENCY_NAMES } from "../constants/currency-preferences.constants";
import { upsertCurrency } from "../repositories/currencies.repository";
import { refreshActiveCurrencyCatalog } from "./currency-catalog.service";

export function seedCurrenciesIfEmpty(context: DbContext = db): void {
  const existing = context.select({ code: currencies.code }).from(currencies).limit(1).get();
  if (existing) {
    refreshActiveCurrencyCatalog(context);
    return;
  }

  const now = new Date();
  const codes = Object.keys(CURRENCY_NAMES).sort();
  codes.forEach((code, index) => {
    upsertCurrency(
      {
        code,
        name: CURRENCY_NAMES[code] ?? code,
        symbol: CURRENCY_SYMBOLS[code] ?? `${code} `,
        minorUnitExponent: CURRENCY_DECIMALS[code] ?? 2,
        sortOrder: code === "PHP" ? 0 : index + 1,
        isActive: true,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
      },
      context,
    );
  });

  refreshActiveCurrencyCatalog(context);
}
