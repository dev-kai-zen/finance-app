import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const exchangeRates = sqliteTable(
  "exchange_rates",
  {
    id: text("id").primaryKey(),
    baseCurrency: text("base_currency").notNull(),
    quoteCurrency: text("quote_currency").notNull(),
    rateBasisPoints: integer("rate_basis_points").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("exchange_rates_base_quote_idx").on(
      table.baseCurrency,
      table.quoteCurrency,
    ),
  ],
);

export type ExchangeRateTable = typeof exchangeRates;
