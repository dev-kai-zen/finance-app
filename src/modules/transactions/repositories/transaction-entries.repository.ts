import { and, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  accounts,
  categories,
  transactionEntries,
  transactions,
} from "@/infrastructure/database/schema";
import type { TransactionSplitEntryListItem } from "../types/transaction.types";
import { generateId } from "./transactions.repository";

export function deleteEntriesByTransactionId(
  transactionId: string,
  context: DbContext = db,
): void {
  context
    .delete(transactionEntries)
    .where(eq(transactionEntries.transactionId, transactionId))
    .run();
}

export function insertSplitEntries(
  transactionId: string,
  entries: {
    categoryId: string;
    amountMinorUnits: number;
    note?: string | null;
  }[],
  context: DbContext = db,
): void {
  const now = new Date();
  for (const entry of entries) {
    context
      .insert(transactionEntries)
      .values({
        id: generateId(context),
        transactionId,
        categoryId: entry.categoryId,
        amountMinorUnits: entry.amountMinorUnits,
        note: entry.note?.trim() || null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

export function replaceSplitEntries(
  transactionId: string,
  entries: {
    categoryId: string;
    amountMinorUnits: number;
    note?: string | null;
  }[],
  context: DbContext = db,
): void {
  deleteEntriesByTransactionId(transactionId, context);
  if (entries.length > 0) {
    insertSplitEntries(transactionId, entries, context);
  }
}

function normalizeCategoryColor(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("color_") ? value.replace("color_", "") : value;
}

export function findSplitEntriesByTransactionIds(
  transactionIds: string[],
  context: DbContext = db,
): Map<string, TransactionSplitEntryListItem[]> {
  const map = new Map<string, TransactionSplitEntryListItem[]>();
  if (transactionIds.length === 0) {
    return map;
  }

  const CHUNK_SIZE = 500;
  for (let i = 0; i < transactionIds.length; i += CHUNK_SIZE) {
    const chunk = transactionIds.slice(i, i + CHUNK_SIZE);
    const rows = context
      .select({
        entry: transactionEntries,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.hexColorsId,
      })
      .from(transactionEntries)
      .leftJoin(categories, eq(transactionEntries.categoryId, categories.id))
      .where(inArray(transactionEntries.transactionId, chunk))
      .orderBy(transactionEntries.createdAt)
      .all();

    for (const row of rows) {
      const item: TransactionSplitEntryListItem = {
        id: row.entry.id,
        categoryId: row.entry.categoryId,
        amountMinorUnits: row.entry.amountMinorUnits,
        note: row.entry.note,
        categoryName: row.categoryName,
        categoryIcon: row.categoryIcon,
        categoryColor: normalizeCategoryColor(row.categoryColor),
      };
      const list = map.get(row.entry.transactionId) ?? [];
      list.push(item);
      map.set(row.entry.transactionId, list);
    }
  }

  return map;
}

export function findSplitEntriesByTransactionId(
  transactionId: string,
  context: DbContext = db,
): TransactionSplitEntryListItem[] {
  return findSplitEntriesByTransactionIds([transactionId], context).get(transactionId) ?? [];
}

export function listSplitEntryBreakdownRows(
  query: {
    type: "expense" | "income";
    startDate: Date;
    endDate: Date;
  },
  context: DbContext = db,
) {
  return context
    .select({
      transactionId: transactions.id,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.hexColorsId,
      categoryIcon: categories.icon,
      accountCurrencyCode: accounts.currencyCode,
      amountMinorUnits: transactionEntries.amountMinorUnits,
    })
    .from(transactionEntries)
    .innerJoin(
      transactions,
      eq(transactionEntries.transactionId, transactions.id),
    )
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(categories, eq(transactionEntries.categoryId, categories.id))
    .where(
      and(
        eq(transactions.type, query.type),
        isNull(transactions.deletedAt),
        gte(transactions.occurredAt, query.startDate),
        lte(transactions.occurredAt, query.endDate),
      ),
    )
    .all();
}

export function listExpenseEntryTotalsByCategory(
  query: {
    categoryIds: string[];
    startDate: Date;
    endDate: Date;
    excludeTransactionId?: string | null;
  },
  context: DbContext = db,
): { categoryId: string; currencyCode: string; total: number }[] {
  if (!query.categoryIds.length) {
    return [];
  }

  const conditions = [
    inArray(transactionEntries.categoryId, query.categoryIds),
    isNull(transactions.deletedAt),
    eq(transactions.type, "expense"),
    gte(transactions.occurredAt, query.startDate),
    lte(transactions.occurredAt, query.endDate),
  ];

  if (query.excludeTransactionId) {
    conditions.push(ne(transactions.id, query.excludeTransactionId));
  }

  return context
    .select({
      categoryId: transactionEntries.categoryId,
      currencyCode: accounts.currencyCode,
      total: sql<number>`coalesce(sum(${transactionEntries.amountMinorUnits}), 0)`.as(
        "total",
      ),
    })
    .from(transactionEntries)
    .innerJoin(
      transactions,
      eq(transactionEntries.transactionId, transactions.id),
    )
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(...conditions))
    .groupBy(transactionEntries.categoryId, accounts.currencyCode)
    .all();
}
