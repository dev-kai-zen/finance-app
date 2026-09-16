import { and, desc, eq, or, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import {
  accountTypes,
  accounts,
  categories,
  transactions,
} from "@/infrastructure/database/schema";
import type {
  NewTransaction,
  Transaction,
  TransactionFilter,
  TransactionListItem,
  TransactionStats,
} from "../types/transaction.types";

export function generateId(context: DbContext = db): string {
  return context.get<{ id: string }>(sql`SELECT lower(hex(randomblob(16))) AS id`)!.id;
}

function mapRowToListItem(r: {
  transaction: typeof transactions.$inferSelect;
  accountName: string | null;
  accountCurrency: string | null;
  accountTypeName: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
}, balanceAfterByTransactionId: ReadonlyMap<string, number>): TransactionListItem {
  return {
    id: r.transaction.id,
    accountId: r.transaction.accountId,
    categoryId: r.transaction.categoryId,
    transactionGroupId: r.transaction.transactionGroupId,
    type: r.transaction.type as Transaction["type"],
    amountCents: r.transaction.amountCents,
    name: r.transaction.name,
    note: r.transaction.note,
    occurredAt: r.transaction.occurredAt,
    createdAt: r.transaction.createdAt,
    updatedAt: r.transaction.updatedAt,
    accountName: r.accountName ?? "Unknown Account",
    accountCurrency: r.accountCurrency ?? "PHP",
    accountTypeName: r.accountTypeName ?? "Account",
    accountBalanceAfterMinorUnits:
      balanceAfterByTransactionId.get(r.transaction.id) ?? null,
    categoryName: r.categoryName,
    categoryIcon: r.categoryIcon,
    categoryColor: r.categoryColor
      ? r.categoryColor.startsWith("color_")
        ? r.categoryColor.replace("color_", "")
        : r.categoryColor
      : null,
    transferAccountId: null,
    transferAccountName: null,
    transferAccountCurrency: null,
    transferAccountTypeName: null,
    destinationBalanceAfterMinorUnits: null,
  };
}

function getBalanceAfterByTransactionId(
  context: DbContext = db,
): Map<string, number> {
  const rows = context
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      amountCents: transactions.amountCents,
      occurredAt: transactions.occurredAt,
      createdAt: transactions.createdAt,
      openingBalanceMinorUnits: accounts.openingBalanceMinorUnits,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .all();

  const rowsByAccountId = new Map<string, typeof rows>();
  for (const row of rows) {
    const accountRows = rowsByAccountId.get(row.accountId) ?? [];
    accountRows.push(row);
    rowsByAccountId.set(row.accountId, accountRows);
  }

  const balanceAfterByTransactionId = new Map<string, number>();

  for (const accountRows of rowsByAccountId.values()) {
    accountRows.sort((a, b) => {
      const occurredAtDifference =
        new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
      if (occurredAtDifference !== 0) return occurredAtDifference;

      const createdAtDifference =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (createdAtDifference !== 0) return createdAtDifference;

      return a.id.localeCompare(b.id);
    });

    let balance = accountRows[0]?.openingBalanceMinorUnits ?? 0;
    for (const row of accountRows) {
      balance += row.amountCents;
      balanceAfterByTransactionId.set(row.id, balance);
    }
  }

  return balanceAfterByTransactionId;
}

function groupTransferRows(items: TransactionListItem[]): TransactionListItem[] {
  const standalone: TransactionListItem[] = [];
  const groupMap = new Map<string, TransactionListItem[]>();

  for (const item of items) {
    if (item.transactionGroupId && item.type === "transfer") {
      const group = groupMap.get(item.transactionGroupId) ?? [];
      group.push(item);
      groupMap.set(item.transactionGroupId, group);
    } else {
      standalone.push(item);
    }
  }

  const grouped: TransactionListItem[] = [];

  for (const [groupId, legs] of groupMap) {
    if (legs.length !== 2) {
      standalone.push(...legs);
      continue;
    }

    const outLeg = legs.find((leg) => leg.amountCents < 0) ?? legs[0];
    const inLeg = legs.find((leg) => leg.amountCents > 0) ?? legs[1];

    grouped.push({
      ...outLeg,
      id: outLeg.id,
      transactionGroupId: groupId,
      accountId: outLeg.accountId,
      accountName: outLeg.accountName,
      accountCurrency: outLeg.accountCurrency,
      transferAccountId: inLeg.accountId,
      transferAccountName: inLeg.accountName,
      transferAccountCurrency: inLeg.accountCurrency,
      transferAccountTypeName: inLeg.accountTypeName,
      destinationBalanceAfterMinorUnits: inLeg.accountBalanceAfterMinorUnits,
      amountCents: Math.abs(outLeg.amountCents),
    });
  }

  return [...standalone, ...grouped];
}

export function listTransactions(
  filter?: TransactionFilter,
  context: DbContext = db,
): TransactionListItem[] {
  let query = context
    .select({
      transaction: transactions,
      accountName: accounts.name,
      accountCurrency: accounts.currencyCode,
      accountTypeName: accountTypes.name,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.hexColorsId,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt));

  const conditions = [];

  if (filter?.type && filter.type !== "all") {
    conditions.push(eq(transactions.type, filter.type));
  }
  if (filter?.accountId) {
    conditions.push(
      or(
        eq(transactions.accountId, filter.accountId),
        sql`EXISTS (
          SELECT 1 FROM transactions grouped_leg
          WHERE grouped_leg.transaction_group_id = ${transactions.transactionGroupId}
            AND grouped_leg.account_id = ${filter.accountId}
        )`,
      ),
    );
  }
  if (filter?.categoryId) {
    conditions.push(eq(transactions.categoryId, filter.categoryId));
  }

  const rows =
    conditions.length > 0 ? query.where(and(...conditions)).all() : query.all();

  const balanceAfterByTransactionId = getBalanceAfterByTransactionId(context);
  const mapped = rows.map((row) =>
    mapRowToListItem(row, balanceAfterByTransactionId),
  );
  const grouped = groupTransferRows(mapped);

  grouped.sort((a, b) => {
    const timeA = new Date(a.occurredAt).getTime();
    const timeB = new Date(b.occurredAt).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (filter?.searchQuery) {
    const q = filter.searchQuery.toLowerCase().trim();
    return grouped.filter(
      (tx) =>
        (tx.name && tx.name.toLowerCase().includes(q)) ||
        (tx.note && tx.note.toLowerCase().includes(q)) ||
        (tx.categoryName && tx.categoryName.toLowerCase().includes(q)) ||
        tx.accountName.toLowerCase().includes(q) ||
        (tx.transferAccountName && tx.transferAccountName.toLowerCase().includes(q)),
    );
  }

  return grouped;
}

export function hasTransactions(context: DbContext = db): boolean {
  return Boolean(
    context
      .select({ id: transactions.id })
      .from(transactions)
      .limit(1)
      .get(),
  );
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

export function findTransactionsByGroupId(
  groupId: string,
  context: DbContext = db,
): Transaction[] {
  return context
    .select()
    .from(transactions)
    .where(eq(transactions.transactionGroupId, groupId))
    .all()
    .map((row) => ({
      ...row,
      type: row.type as Transaction["type"],
    }));
}

export function insertTransaction(
  data: NewTransaction,
  context: DbContext = db,
): Transaction {
  const now = new Date();
  const id = data.id ?? generateId(context);

  const record = {
    id,
    accountId: data.accountId,
    categoryId: data.categoryId ?? null,
    transactionGroupId: data.transactionGroupId ?? null,
    type: data.type,
    amountCents: data.amountCents,
    name: data.name ?? null,
    note: data.note ?? null,
    occurredAt: data.occurredAt,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };

  context.insert(transactions).values(record).run();

  return record;
}

export function updateTransactionRecord(
  id: string,
  values: Partial<
    Pick<
      NewTransaction,
      | "accountId"
      | "categoryId"
      | "type"
      | "amountCents"
      | "name"
      | "note"
      | "occurredAt"
    >
  >,
  context: DbContext = db,
): void {
  context
    .update(transactions)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, id))
    .run();
}

export function deleteTransaction(id: string, context: DbContext = db): void {
  context.delete(transactions).where(eq(transactions.id, id)).run();
}

export function deleteTransactionsByGroupId(
  groupId: string,
  context: DbContext = db,
): void {
  context
    .delete(transactions)
    .where(eq(transactions.transactionGroupId, groupId))
    .run();
}

export function calculateTransactionStats(context: DbContext = db): TransactionStats {
  const allTx = context.select().from(transactions).all();

  let totalInflow = 0;
  let totalOutflow = 0;
  const groupedTransferIds = new Set<string>();

  for (const tx of allTx) {
    if (tx.transactionGroupId) {
      groupedTransferIds.add(tx.transactionGroupId);
      continue;
    }
    if (tx.amountCents > 0) {
      totalInflow += tx.amountCents;
    } else if (tx.amountCents < 0) {
      totalOutflow += Math.abs(tx.amountCents);
    }
  }

  const transferCount = groupedTransferIds.size;
  const standaloneCount = allTx.filter((tx) => !tx.transactionGroupId).length;

  return {
    totalInflowMinorUnits: totalInflow,
    totalOutflowMinorUnits: totalOutflow,
    netCashflowMinorUnits: totalInflow - totalOutflow,
    transactionCount: standaloneCount + transferCount,
  };
}
