import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { accounts, categories, transactions } from "@/infrastructure/database/schema";
import { getCurrencyPreferences, getExchangeRateMap } from "@/modules/currencies";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import { listSplitEntryBreakdownRows } from "../repositories/transaction-entries.repository";

export interface CategoryBreakdownQuery {
  type: "expense" | "income";
  startDate: Date;
  endDate: Date;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  totalMinorUnits: number;
  percentage: number;
  transactionCount: number;
}

export interface CategoryBreakdownResult {
  type: "expense" | "income";
  startDate: Date;
  endDate: Date;
  totalMinorUnits: number;
  transactionCount: number;
  items: CategoryBreakdownItem[];
}

export function getCategoryBreakdown(
  query: CategoryBreakdownQuery,
  context: DbContext = db,
): CategoryBreakdownResult {
  const rows = context
    .select({
      transaction: transactions,
      category: categories,
      accountCurrencyCode: accounts.currencyCode,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.type, query.type),
        isNull(transactions.deletedAt),
        gte(transactions.occurredAt, query.startDate),
        lte(transactions.occurredAt, query.endDate),
      ),
    )
    .all();

  const map = new Map<
    string,
    {
      name: string;
      color: string | null;
      icon: string | null;
      total: number;
      count: number;
    }
  >();

  let overallTotal = 0;
  let overallTxCount = 0;
  const homeCurrency = getCurrencyPreferences(context).defaultCurrency;
  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, context);

  const splitRows = listSplitEntryBreakdownRows(
    {
      type: query.type,
      startDate: query.startDate,
      endDate: query.endDate,
    },
    context,
  );
  const splitParentIds = new Set(splitRows.map((row) => row.transactionId));

  const addToMap = (
    catId: string,
    catName: string,
    catColor: string | null,
    catIcon: string,
    amount: number,
    countDelta: number,
  ) => {
    const existing = map.get(catId);
    if (existing) {
      existing.total += amount;
      existing.count += countDelta;
    } else {
      map.set(catId, {
        name: catName,
        color: catColor,
        icon: catIcon,
        total: amount,
        count: countDelta,
      });
    }
    overallTotal += amount;
    overallTxCount += countDelta;
  };

  for (const { transaction: tx, category: cat, accountCurrencyCode } of rows) {
    if (splitParentIds.has(tx.id)) {
      continue;
    }
    const catId = cat?.id ?? "uncategorized";
    const catName = cat?.name ?? "Uncategorized";
    const catColor = cat?.hexColorsId ?? null;
    const catIcon = cat?.icon ?? (query.type === "income" ? "wallet" : "tag");
    const amount = convertCurrencyMinorUnits(
      Math.abs(tx.amountMinorUnits),
      accountCurrencyCode,
      homeCurrency,
      ratesMap,
      DEFAULT_BASE_CURRENCY,
    );
    addToMap(catId, catName, catColor, catIcon, amount, 1);
  }

  for (const row of splitRows) {
    const catId = row.categoryId ?? "uncategorized";
    const catName = row.categoryName ?? "Uncategorized";
    const catColor = row.categoryColor;
    const catIcon =
      row.categoryIcon ?? (query.type === "income" ? "wallet" : "tag");
    const amount = convertCurrencyMinorUnits(
      Math.abs(row.amountMinorUnits),
      row.accountCurrencyCode,
      homeCurrency,
      ratesMap,
      DEFAULT_BASE_CURRENCY,
    );
    addToMap(catId, catName, catColor, catIcon, amount, 0);
  }

  const items: CategoryBreakdownItem[] = [];

  for (const [id, data] of map.entries()) {
    const percentage =
      overallTotal > 0 ? (data.total / overallTotal) * 100 : 0;

    items.push({
      categoryId: id,
      categoryName: data.name,
      categoryColor: data.color,
      categoryIcon: data.icon,
      totalMinorUnits: data.total,
      percentage: Number(percentage.toFixed(1)),
      transactionCount: data.count,
    });
  }

  // Sort descending by total amount
  items.sort((a, b) => b.totalMinorUnits - a.totalMinorUnits);

  return {
    type: query.type,
    startDate: query.startDate,
    endDate: query.endDate,
    totalMinorUnits: overallTotal,
    transactionCount: overallTxCount,
    items,
  };
}
