import { eq } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { exchangeRates } from "@/infrastructure/database/schema";
import {
  DEFAULT_BASE_CURRENCY,
  DEFAULT_EXCHANGE_RATES_TO_PHP_BPS,
} from "@/utils/currency";
import type {
  ExchangeRate,
  UpsertExchangeRateInput,
} from "../types/currency.types";

export function getExchangeRates(
  baseCurrency: string = DEFAULT_BASE_CURRENCY,
  context: DbContext = db,
): ExchangeRate[] {
  const rows = context
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.baseCurrency, baseCurrency))
    .all();

  return rows.map((r) => ({
    id: r.id,
    baseCurrency: r.baseCurrency,
    quoteCurrency: r.quoteCurrency,
    rateBasisPoints: r.rateBasisPoints,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export function getExchangeRateMap(
  baseCurrency: string = DEFAULT_BASE_CURRENCY,
  context: DbContext = db,
): Map<string, number> {
  const rates = getExchangeRates(baseCurrency, context);
  const map = new Map<string, number>();

  for (const r of rates) {
    map.set(r.quoteCurrency, r.rateBasisPoints);
  }

  // Ensure default offline rates exist as fallbacks
  if (baseCurrency === DEFAULT_BASE_CURRENCY) {
    for (const [curr, bps] of Object.entries(DEFAULT_EXCHANGE_RATES_TO_PHP_BPS)) {
      if (!map.has(curr)) {
        map.set(curr, bps);
      }
    }
  }

  return map;
}

export function upsertExchangeRate(
  input: UpsertExchangeRateInput,
  context: DbContext = db,
): void {
  const now = new Date();
  const id = `rate_${input.baseCurrency.toLowerCase()}_${input.quoteCurrency.toLowerCase()}`;

  context
    .insert(exchangeRates)
    .values({
      id,
      baseCurrency: input.baseCurrency,
      quoteCurrency: input.quoteCurrency,
      rateBasisPoints: input.rateBasisPoints,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [exchangeRates.baseCurrency, exchangeRates.quoteCurrency],
      set: {
        rateBasisPoints: input.rateBasisPoints,
        updatedAt: now,
      },
    })
    .run();
}

export function seedDefaultExchangeRates(context: DbContext = db): void {
  const now = new Date();
  for (const [quote, bps] of Object.entries(DEFAULT_EXCHANGE_RATES_TO_PHP_BPS)) {
    upsertExchangeRate(
      {
        baseCurrency: DEFAULT_BASE_CURRENCY,
        quoteCurrency: quote,
        rateBasisPoints: bps,
      },
      context,
    );
  }
}
