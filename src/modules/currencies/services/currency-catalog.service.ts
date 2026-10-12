import type { DbContext } from "@/infrastructure/database/client";
import { CURRENCY_DECIMALS } from "@/utils/currency";
import { setActiveCurrencyMinorUnitExponents } from "@/utils/currency";
import { listCurrencies } from "../repositories/currencies.repository";

export function refreshActiveCurrencyCatalog(context: DbContext): void {
  const rows = listCurrencies(context);
  if (rows.length === 0) {
    setActiveCurrencyMinorUnitExponents(CURRENCY_DECIMALS);
    return;
  }

  const map: Record<string, number> = { ...CURRENCY_DECIMALS };
  for (const row of rows) {
    map[row.code] = row.minorUnitExponent;
  }
  setActiveCurrencyMinorUnitExponents(map);
}
