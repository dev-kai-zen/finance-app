import { count, eq, or } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  accounts,
  exchangeRates,
  goals,
  settings,
} from "@/infrastructure/database/schema";
import { CURRENCY_PREFERENCE_KEYS } from "../constants/currency-preferences.constants";
import type { CurrencyUsageReason } from "../types/currency.types";

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

/** Accounts, goals, or default — excludes conversion-rate rows alone. */
export function isCurrencyInUse(
  code: string,
  context: DbContext = db,
): boolean {
  return isCurrencyReferencedInLedger(code, context);
}

/** Accounts, goals, or app default — not conversion-rate rows alone. */
export function isCurrencyReferencedInLedger(
  code: string,
  context: DbContext = db,
): boolean {
  const normalized = code.trim().toUpperCase();
  const reasons = getCurrencyUsageReasons(normalized, context);
  return reasons.some(
    (reason) =>
      reason.kind === "accounts" ||
      reason.kind === "goals" ||
      reason.kind === "default_currency",
  );
}

export function getCurrencyUsageReasons(
  code: string,
  context: DbContext = db,
): CurrencyUsageReason[] {
  const normalized = code.trim().toUpperCase();
  const reasons: CurrencyUsageReason[] = [];

  const accountCountRow = context
    .select({ total: count() })
    .from(accounts)
    .where(eq(accounts.currencyCode, normalized))
    .get();
  const accountCount = Number(accountCountRow?.total ?? 0);
  if (accountCount > 0) {
    reasons.push({ kind: "accounts", count: accountCount });
  }

  const goalCountRow = context
    .select({ total: count() })
    .from(goals)
    .where(eq(goals.currencyCode, normalized))
    .get();
  const goalCount = Number(goalCountRow?.total ?? 0);
  if (goalCount > 0) {
    reasons.push({ kind: "goals", count: goalCount });
  }

  const rateCountRow = context
    .select({ total: count() })
    .from(exchangeRates)
    .where(
      or(
        eq(exchangeRates.baseCurrency, normalized),
        eq(exchangeRates.quoteCurrency, normalized),
      ),
    )
    .get();
  const rateCount = Number(rateCountRow?.total ?? 0);
  if (rateCount > 0) {
    reasons.push({ kind: "exchange_rates", count: rateCount });
  }

  const defaultRow = context
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, CURRENCY_PREFERENCE_KEYS.defaultCurrency))
    .get();
  if (defaultRow?.value === normalized) {
    reasons.push({ kind: "default_currency", count: 1 });
  }

  return reasons;
}
