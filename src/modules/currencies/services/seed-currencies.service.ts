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
  const existingRows = context.select({ code: currencies.code }).from(currencies).all();
  const existingSet = new Set(existingRows.map((r) => r.code));

  const codes = Object.keys(CURRENCY_NAMES).sort();
  const missingCodes = codes.filter((code) => !existingSet.has(code));

  if (missingCodes.length > 0) {
    const now = new Date();
    missingCodes.forEach((code, index) => {
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
  }

  refreshActiveCurrencyCatalog(context);
}
