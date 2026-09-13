import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db, type DbContext } from "@/infrastructure/database/client";
import { accounts, categories, transactions } from "@/infrastructure/database/schema";
import type {
  NewTransaction,
  Transaction,
  TransactionFilter,
  TransactionListItem,
  TransactionStats,
} from "../types/transaction.types";

const transferAccounts = alias(accounts, "transfer_accounts");

export function listTransactions(
  filter?: TransactionFilter,
  context: DbContext = db,
): TransactionListItem[] {
  let query = context
    .select({
      transaction: transactions,
      accountName: accounts.name,
      accountCurrency: accounts.currencyCode,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      transferAccountName: transferAccounts.name,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(transferAccounts, eq(transactions.transferAccountId, transferAccounts.id))
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt));

  const conditions = [];

  if (filter?.type && filter.type !== "all") {
    conditions.push(eq(transactions.type, filter.type));
  }
  if (filter?.accountId) {
    conditions.push(eq(transactions.accountId, filter.accountId));
  }
  if (filter?.categoryId) {
    conditions.push(eq(transactions.categoryId, filter.categoryId));
  }

  const rows = conditions.length > 0
    ? query.where(and(...conditions)).all()
    : query.all();

  const mapped: TransactionListItem[] = rows.map((r) => ({
    id: r.transaction.id,
    accountId: r.transaction.accountId,
    categoryId: r.transaction.categoryId,
    transferAccountId: r.transaction.transferAccountId,
    type: r.transaction.type as Transaction["type"],
    amountCents: r.transaction.amountCents,
    note: r.transaction.note,
    occurredAt: r.transaction.occurredAt,
    createdAt: r.transaction.createdAt,
    updatedAt: r.transaction.updatedAt,
    accountName: r.accountName ?? "Unknown Account",
    accountCurrency: r.accountCurrency ?? "PHP",
    categoryName: r.categoryName,
    categoryIcon: r.categoryIcon,
    categoryColor: r.categoryColor,
    transferAccountName: r.transferAccountName,
  }));

  if (filter?.searchQuery) {
    const q = filter.searchQuery.toLowerCase().trim();
    return mapped.filter(
      (tx) =>
        (tx.note && tx.note.toLowerCase().includes(q)) ||
        (tx.categoryName && tx.categoryName.toLowerCase().includes(q)) ||
        tx.accountName.toLowerCase().includes(q) ||
        (tx.transferAccountName && tx.transferAccountName.toLowerCase().includes(q)),
    );
  }

  return mapped;
}

export function findTransactionById(
  id: string,
  context: DbContext = db,
): Transaction | null {
  const row = context
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .get();

  if (!row) return null;

  return {
    ...row,
    type: row.type as Transaction["type"],
  };
}

export function insertTransaction(
  data: NewTransaction,
  context: DbContext = db,
): Transaction {
  const now = new Date();
  const id =
    data.id ??
    context.get<{ id: string }>(sql`SELECT lower(hex(randomblob(16))) AS id`)!.id;

  const record = {
    id,
    accountId: data.accountId,
    categoryId: data.categoryId ?? null,
    transferAccountId: data.transferAccountId ?? null,
    type: data.type,
    amountCents: data.amountCents,
    note: data.note ?? null,
    occurredAt: data.occurredAt,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };

  context.insert(transactions).values(record).run();

  return record;
}

export function deleteTransaction(
  id: string,
  context: DbContext = db,
): void {
  context.delete(transactions).where(eq(transactions.id, id)).run();
}

export function calculateTransactionStats(context: DbContext = db): TransactionStats {
  const allTx = context.select().from(transactions).all();

  let totalInflow = 0;
  let totalOutflow = 0;

  for (const tx of allTx) {
    if (tx.type === "income") {
      totalInflow += tx.amountCents;
    } else if (tx.type === "expense") {
      totalOutflow += tx.amountCents;
    }
  }

  return {
    totalInflowMinorUnits: totalInflow,
    totalOutflowMinorUnits: totalOutflow,
    netCashflowMinorUnits: totalInflow - totalOutflow,
    transactionCount: allTx.length,
  };
}
