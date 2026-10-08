import { eq } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  accounts,
  exchangeRates,
  goals,
  settings,
} from "@/infrastructure/database/schema";
import { CURRENCY_PREFERENCE_KEYS } from "../constants/currency-preferences.constants";

export function listUsedCurrencyCodes(context: DbContext = db): Set<string> {
  const used = new Set<string>();

  const accountRows = context
    .select({ code: accounts.currencyCode })
    .from(accounts)
    .all();
  for (const row of accountRows) {
    used.add(row.code);
  }

  const goalRows = context
    .select({ code: goals.currencyCode })
    .from(goals)
    .all();
  for (const row of goalRows) {
    used.add(row.code);
  }

  const rateRows = context
    .select({
      base: exchangeRates.baseCurrency,
      quote: exchangeRates.quoteCurrency,
    })
    .from(exchangeRates)
    .all();
  for (const row of rateRows) {
    used.add(row.base);
    used.add(row.quote);
  }

  const defaultRow = context
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, CURRENCY_PREFERENCE_KEYS.defaultCurrency))
    .get();
  if (defaultRow?.value) {
    used.add(defaultRow.value);
  }

  return used;
}

export function isCurrencyInUse(
  code: string,
  context: DbContext = db,
): boolean {
  return listUsedCurrencyCodes(context).has(code);
}
