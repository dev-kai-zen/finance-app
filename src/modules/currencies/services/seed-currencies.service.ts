import { eq } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { currencies } from "@/infrastructure/database/schema";
import {
  CURRENCY_DECIMALS,
  CURRENCY_SYMBOLS,
} from "@/utils/currency";
import { CURRENCY_NAMES } from "../constants/currency-preferences.constants";
import { refreshActiveCurrencyCatalog } from "./currency-catalog.service";

export function seedCurrenciesIfEmpty(context: DbContext = db): void {
  const existingRows = context
    .select({
      code: currencies.code,
      sortOrder: currencies.sortOrder,
      isCustom: currencies.isCustom,
    })
    .from(currencies)
    .all();
  const existingByCode = new Map(existingRows.map((row) => [row.code, row]));

  const codes = Object.keys(CURRENCY_NAMES).sort();
  const missingEntries: Array<{ code: string; sortOrder: number }> = [];
  const outOfOrderEntries: Array<{ code: string; sortOrder: number }> = [];

  codes.forEach((code, index) => {
    const existing = existingByCode.get(code);
    if (!existing) {
      missingEntries.push({ code, sortOrder: index });
    } else if (!existing.isCustom && existing.sortOrder !== index) {
      outOfOrderEntries.push({ code, sortOrder: index });
    }
  });

  if (missingEntries.length > 0 || outOfOrderEntries.length > 0) {
    const now = new Date();
    const applyWrites = (tx: DbContext) => {
      for (const { code, sortOrder } of missingEntries) {
        tx.insert(currencies)
          .values({
            code,
            name: CURRENCY_NAMES[code] ?? code,
            symbol: CURRENCY_SYMBOLS[code] ?? `${code} `,
            minorUnitExponent: CURRENCY_DECIMALS[code] ?? 2,
            sortOrder,
            isActive: true,
            isCustom: false,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing()
          .run();
      }

      for (const { code, sortOrder } of outOfOrderEntries) {
        tx.update(currencies)
          .set({ sortOrder, updatedAt: now })
          .where(eq(currencies.code, code))
          .run();
      }
    };

    context.transaction((tx) => {
      applyWrites(tx);
    });
  }

  refreshActiveCurrencyCatalog(context);
}
