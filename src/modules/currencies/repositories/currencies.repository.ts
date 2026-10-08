import { asc, eq } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { currencies } from "@/infrastructure/database/schema";
import type { Currency } from "../types/currency.types";

export function listCurrencies(context: DbContext = db): Currency[] {
  const rows = context
    .select()
    .from(currencies)
    .where(eq(currencies.isActive, true))
    .orderBy(asc(currencies.sortOrder), asc(currencies.code))
    .all();

  return rows.map(mapCurrencyRow);
}

export function getCurrencyByCode(
  code: string,
  context: DbContext = db,
): Currency | null {
  const row = context
    .select()
    .from(currencies)
    .where(eq(currencies.code, code))
    .get();

  return row ? mapCurrencyRow(row) : null;
}

export function insertCurrency(
  input: Omit<Currency, "createdAt" | "updatedAt">,
  context: DbContext = db,
): Currency {
  const now = new Date();
  context
    .insert(currencies)
    .values({
      code: input.code,
      name: input.name,
      symbol: input.symbol,
      minorUnitExponent: input.minorUnitExponent,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      isCustom: input.isCustom,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return getCurrencyByCode(input.code, context)!;
}

export function updateCurrencyRecord(
  code: string,
  patch: Pick<Currency, "name" | "symbol" | "minorUnitExponent">,
  context: DbContext = db,
): Currency {
  const now = new Date();
  context
    .update(currencies)
    .set({
      name: patch.name,
      symbol: patch.symbol,
      minorUnitExponent: patch.minorUnitExponent,
      updatedAt: now,
    })
    .where(eq(currencies.code, code))
    .run();

  const updated = getCurrencyByCode(code, context);
  if (!updated) {
    throw new Error(`Currency ${code} was not found after update.`);
  }
  return updated;
}

export function deleteCurrencyByCode(code: string, context: DbContext = db): void {
  context.delete(currencies).where(eq(currencies.code, code)).run();
}

/** @deprecated Prefer insertCurrency / updateCurrencyRecord via services. */
export function upsertCurrency(
  input: Omit<Currency, "createdAt" | "updatedAt"> & {
    createdAt?: Date;
    updatedAt?: Date;
  },
  context: DbContext = db,
): void {
  const now = input.updatedAt ?? new Date();
  const createdAt = input.createdAt ?? now;

  context
    .insert(currencies)
    .values({
      code: input.code,
      name: input.name,
      symbol: input.symbol,
      minorUnitExponent: input.minorUnitExponent,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      isCustom: input.isCustom,
      createdAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: currencies.code,
      set: {
        name: input.name,
        symbol: input.symbol,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        updatedAt: now,
      },
    })
    .run();
}

function mapCurrencyRow(row: typeof currencies.$inferSelect): Currency {
  return {
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    minorUnitExponent: row.minorUnitExponent,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isCustom: row.isCustom,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
