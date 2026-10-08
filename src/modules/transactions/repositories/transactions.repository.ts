import { and, asc, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { DEFAULT_BASE_CURRENCY } from "@/utils/currency";
import {
  accountTypes,
  accounts,
  categories,
  pockets,
  transactionAttachments,
  transactions,
} from "@/infrastructure/database/schema";
import type {
  NewTransaction,
  Transaction,
  TransactionFilter,
  TransactionListItem,
  TransactionStats,
} from "../types/transaction.types";
import { getLabelsByTransactionIds, type LabelBadgeItem } from "@/modules/labels";

export function generateId(context: DbContext = db): string {
  return context.get<{ id: string }>(sql`SELECT lower(hex(randomblob(16))) AS id`)!.id;
}

function mapRowToListItem(r: {
  transaction: typeof transactions.$inferSelect;
  accountName: string | null;
  accountCurrency: string | null;
  accountTypeName: string | null;
  accountPocketEnabled: boolean | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  pocketName: string | null;
}, balanceAfterByTransactionId: ReadonlyMap<string, number>,
  pocketBalanceAfterByTransactionId: ReadonlyMap<string, number>,
  attachmentCountByTransactionId: ReadonlyMap<string, number>,
  labelsByTransactionId: ReadonlyMap<string, LabelBadgeItem[]>,
): TransactionListItem {
  return {
    id: r.transaction.id,
    accountId: r.transaction.accountId,
    categoryId: r.transaction.categoryId,
    pocketId: r.transaction.pocketId,
    transactionGroupId: r.transaction.transactionGroupId,
    type: r.transaction.type as Transaction["type"],
    currencyCode: r.transaction.currencyCode,
    amountMinorUnits: r.transaction.amountMinorUnits,
    name: r.transaction.name,
    note: r.transaction.note,
    occurredAt: r.transaction.occurredAt,
    createdAt: r.transaction.createdAt,
    updatedAt: r.transaction.updatedAt,
    deletedAt: r.transaction.deletedAt,
    attachmentCount: attachmentCountByTransactionId.get(r.transaction.id) ?? 0,
    labels: labelsByTransactionId.get(r.transaction.id) ?? [],
    accountName: r.accountName ?? "Unknown Account",
    accountCurrency: r.accountCurrency ?? "PHP",
    accountTypeName: r.accountTypeName ?? "Account",
    accountPocketEnabled: r.accountPocketEnabled ?? false,
    accountBalanceAfterMinorUnits:
      balanceAfterByTransactionId.get(r.transaction.id) ?? null,
    locationBalanceAfterMinorUnits: r.transaction.pocketId
      ? pocketBalanceAfterByTransactionId.get(r.transaction.id) ?? null
      : balanceAfterByTransactionId.get(r.transaction.id) ?? null,
    categoryName: r.categoryName,
    categoryIcon: r.categoryIcon,
    categoryColor: r.categoryColor
      ? r.categoryColor.startsWith("color_")
        ? r.categoryColor.replace("color_", "")
        : r.categoryColor
      : null,
    pocketName: r.pocketName,
    transferAccountId: null,
    transferAccountName: null,
    transferAccountCurrency: null,
    transferAccountTypeName: null,
    transferAccountPocketEnabled: null,
    transferPocketId: null,
    transferPocketName: null,
    destinationBalanceAfterMinorUnits: null,
    destinationLocationBalanceAfterMinorUnits: null,
    transferFeeAmountMinorUnits: null,
    transferFeeAccountId: null,
    transferFeeAccountName: null,
    transferFeePocketId: null,
    transferFeePocketName: null,
    transferFeeCategoryId: null,
    transferFeeCategoryName: null,
  };
}

function getBalanceAfterByTransactionId(
  targetAccountId?: string | null,
  context: DbContext = db,
): Map<string, number> {
  const conditions = [isNull(transactions.deletedAt)];
  if (targetAccountId) {
    conditions.push(eq(transactions.accountId, targetAccountId));
  }

  const rows = context
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      amountMinorUnits: transactions.amountMinorUnits,
      openingBalanceMinorUnits: accounts.openingBalanceMinorUnits,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(...conditions))
    .orderBy(
      asc(transactions.occurredAt),
      asc(transactions.createdAt),
      asc(transactions.id),
    )
    .all();

  const balanceAfterByTransactionId = new Map<string, number>();
  const runningBalances = new Map<string, number>();

  for (const row of rows) {
    let balance = runningBalances.get(row.accountId);
    if (balance === undefined) {
      balance = row.openingBalanceMinorUnits ?? 0;
    }
    balance += row.amountMinorUnits;
    runningBalances.set(row.accountId, balance);
    balanceAfterByTransactionId.set(row.id, balance);
  }

  return balanceAfterByTransactionId;
}

function getPocketBalanceAfterByTransactionId(
  targetPocketId?: string | null,
  context: DbContext = db,
): Map<string, number> {
  const conditions = [
    isNull(transactions.deletedAt),
    isNotNull(transactions.pocketId),
  ];
  if (targetPocketId) {
    conditions.push(eq(transactions.pocketId, targetPocketId));
  }

  const rows = context
    .select({
      id: transactions.id,
      pocketId: transactions.pocketId,
      amountMinorUnits: transactions.amountMinorUnits,
    })
    .from(transactions)
    .where(and(...conditions))
    .orderBy(
      asc(transactions.occurredAt),
      asc(transactions.createdAt),
      asc(transactions.id),
    )
    .all();

  const balanceAfterByTransactionId = new Map<string, number>();
  const runningBalances = new Map<string, number>();

  for (const row of rows) {
    if (!row.pocketId) continue;
    let balance = runningBalances.get(row.pocketId) ?? 0;
    balance += row.amountMinorUnits;
    runningBalances.set(row.pocketId, balance);
    balanceAfterByTransactionId.set(row.id, balance);
  }

  return balanceAfterByTransactionId;
}

function groupTransferRows(items: TransactionListItem[]): TransactionListItem[] {
  const standalone: TransactionListItem[] = [];
  const groupMap = new Map<string, TransactionListItem[]>();
  const feeMap = new Map<string, TransactionListItem>();

  for (const item of items) {
    if (item.transactionGroupId && item.type === "transfer") {
      const group = groupMap.get(item.transactionGroupId) ?? [];
      group.push(item);
      groupMap.set(item.transactionGroupId, group);
    } else {
      if (item.transactionGroupId && item.type === "expense") {
        feeMap.set(item.transactionGroupId, item);
      }
      standalone.push(item);
    }
  }

  const grouped: TransactionListItem[] = [];

  for (const [groupId, legs] of groupMap) {
    if (legs.length !== 2) {
      standalone.push(...legs);
      continue;
    }

    const outLeg = legs.find((leg) => leg.amountMinorUnits < 0) ?? legs[0];
    const inLeg = legs.find((leg) => leg.amountMinorUnits > 0) ?? legs[1];
    const feeItem = feeMap.get(groupId);

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
      transferAccountPocketEnabled: inLeg.accountPocketEnabled,
      transferPocketId: inLeg.pocketId,
      transferPocketName: inLeg.pocketName,
      destinationBalanceAfterMinorUnits: inLeg.accountBalanceAfterMinorUnits,
      destinationLocationBalanceAfterMinorUnits:
        inLeg.locationBalanceAfterMinorUnits,
      transferFeeAmountMinorUnits: feeItem ? Math.abs(feeItem.amountMinorUnits) : null,
      transferFeeAccountId: feeItem?.accountId ?? null,
      transferFeeAccountName: feeItem?.accountName ?? null,
      transferFeePocketId: feeItem?.pocketId ?? null,
      transferFeePocketName: feeItem?.pocketName ?? null,
      transferFeeCategoryId: feeItem?.categoryId ?? null,
      transferFeeCategoryName: feeItem?.categoryName ?? null,
      amountMinorUnits: Math.abs(outLeg.amountMinorUnits),
      attachmentCount: legs.reduce(
        (total, leg) => total + leg.attachmentCount,
        0,
      ),
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
      accountPocketEnabled: accounts.pocketEnabled,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.hexColorsId,
      pocketName: pockets.name,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(pockets, eq(transactions.pocketId, pockets.id))
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt));

  const conditions = [];
  conditions.push(isNull(transactions.deletedAt));

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
  if (filter?.labelIds && filter.labelIds.length > 0) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM transaction_labels tl
        WHERE (
          tl.transaction_id = ${transactions.id}
          OR (
            ${transactions.transactionGroupId} IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM transactions sibling
              WHERE sibling.transaction_group_id = ${transactions.transactionGroupId}
                AND sibling.id = tl.transaction_id
            )
          )
        )
        AND tl.label_id IN ${filter.labelIds}
      )`,
    );
  }

  const rows = query.where(and(...conditions)).all();

  const balanceAfterByTransactionId = getBalanceAfterByTransactionId(
    filter?.accountId,
    context,
  );
  const pocketBalanceAfterByTransactionId =
    getPocketBalanceAfterByTransactionId(null, context);
  const attachmentCountByTransactionId =
    getAttachmentCountByTransactionId(context);
  const labelsByTransactionId = getLabelsByTransactionIds(
    rows.map((row) => row.transaction.id),
    context,
  );
  const mapped = rows.map((row) =>
    mapRowToListItem(
      row,
      balanceAfterByTransactionId,
      pocketBalanceAfterByTransactionId,
      attachmentCountByTransactionId,
      labelsByTransactionId,
    ),
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
        (tx.pocketName && tx.pocketName.toLowerCase().includes(q)) ||
        (tx.transferPocketName && tx.transferPocketName.toLowerCase().includes(q)) ||
        (tx.labels && tx.labels.some((lbl) => lbl.name.toLowerCase().includes(q))) ||
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

export function listDeletedTransactions(
  context: DbContext = db,
): TransactionListItem[] {
  const rows = context
    .select({
      transaction: transactions,
      accountName: accounts.name,
      accountCurrency: accounts.currencyCode,
      accountTypeName: accountTypes.name,
      accountPocketEnabled: accounts.pocketEnabled,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.hexColorsId,
      pocketName: pockets.name,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(pockets, eq(transactions.pocketId, pockets.id))
    .where(isNotNull(transactions.deletedAt))
    .orderBy(desc(transactions.deletedAt), desc(transactions.occurredAt))
    .all();

  const balanceAfterByTransactionId = getBalanceAfterByTransactionId(
    null,
    context,
  );
  const pocketBalanceAfterByTransactionId =
    getPocketBalanceAfterByTransactionId(null, context);
  const attachmentCountByTransactionId =
    getAttachmentCountByTransactionId(context);
  const labelsByTransactionId = getLabelsByTransactionIds(
    rows.map((row) => row.transaction.id),
    context,
  );
  return groupTransferRows(
    rows.map((row) =>
      mapRowToListItem(
        row,
        balanceAfterByTransactionId,
        pocketBalanceAfterByTransactionId,
        attachmentCountByTransactionId,
        labelsByTransactionId,
      ),
    ),
  );
}

function getAttachmentCountByTransactionId(
  context: DbContext = db,
): Map<string, number> {
  const rows = context
    .select({
      transactionId: transactionAttachments.transactionId,
      count: sql<number>`count(*)`,
    })
    .from(transactionAttachments)
    .where(isNull(transactionAttachments.deletedAt))
    .groupBy(transactionAttachments.transactionId)
    .all();
  return new Map(rows.map((row) => [row.transactionId, Number(row.count)]));
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

export function listLedgerTransactionsForAccount(
  accountId: string,
  context: DbContext = db,
  options: { includeDeleted?: boolean } = {},
): Transaction[] {
  const condition = options.includeDeleted
    ? eq(transactions.accountId, accountId)
    : and(
        eq(transactions.accountId, accountId),
        isNull(transactions.deletedAt),
      );

  return context
    .select()
    .from(transactions)
    .where(condition)
    .orderBy(transactions.occurredAt, transactions.createdAt)
    .all()
    .map((row) => ({
      ...row,
      type: row.type as Transaction["type"],
    }));
}

function resolveTransactionCurrencyCode(
  accountId: string,
  explicitCode: string | undefined,
  context: DbContext,
): string {
  if (explicitCode?.trim()) {
    return explicitCode.trim().toUpperCase();
  }
  const accountRow = context
    .select({ currencyCode: accounts.currencyCode })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .get();
  return accountRow?.currencyCode ?? DEFAULT_BASE_CURRENCY;
}

export function insertTransaction(
  data: NewTransaction,
  context: DbContext = db,
): Transaction {
  const now = new Date();
  const id = data.id ?? generateId(context);
  const currencyCode = resolveTransactionCurrencyCode(
    data.accountId,
    data.currencyCode,
    context,
  );

  const record = {
    id,
    accountId: data.accountId,
    categoryId: data.categoryId ?? null,
    pocketId: data.pocketId ?? null,
    transactionGroupId: data.transactionGroupId ?? null,
    type: data.type,
    currencyCode,
    amountMinorUnits: data.amountMinorUnits,
    name: data.name ?? null,
    note: data.note ?? null,
    occurredAt: data.occurredAt,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
    deletedAt: data.deletedAt ?? null,
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
      | "pocketId"
      | "type"
      | "currencyCode"
      | "amountMinorUnits"
      | "name"
      | "note"
      | "occurredAt"
    >
  >,
  context: DbContext = db,
): void {
  const patch: typeof values & { updatedAt: Date; currencyCode?: string } = {
    ...values,
    updatedAt: new Date(),
  };
  if (values.accountId !== undefined && values.currencyCode === undefined) {
    patch.currencyCode = resolveTransactionCurrencyCode(
      values.accountId,
      undefined,
      context,
    );
  }

  context
    .update(transactions)
    .set(patch)
    .where(eq(transactions.id, id))
    .run();
}

export function deleteTransaction(id: string, context: DbContext = db): void {
  context.delete(transactions).where(eq(transactions.id, id)).run();
}

export function deleteAllTransactionRecords(context: DbContext = db): void {
  context.delete(transactions).run();
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

export function softDeleteTransaction(
  id: string,
  deletedAt = new Date(),
  context: DbContext = db,
): void {
  context
    .update(transactions)
    .set({ deletedAt, updatedAt: new Date() })
    .where(eq(transactions.id, id))
    .run();
}

export function softDeleteTransactionsByGroupId(
  groupId: string,
  deletedAt = new Date(),
  context: DbContext = db,
): void {
  context
    .update(transactions)
    .set({ deletedAt, updatedAt: new Date() })
    .where(eq(transactions.transactionGroupId, groupId))
    .run();
}

export function restoreTransaction(
  id: string,
  context: DbContext = db,
): void {
  context
    .update(transactions)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(transactions.id, id))
    .run();
}

export function restoreTransactionsByGroupId(
  groupId: string,
  context: DbContext = db,
): void {
  context
    .update(transactions)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(transactions.transactionGroupId, groupId))
    .run();
}

export function calculateTransactionStats(context: DbContext = db): TransactionStats {
  const allTx = context
    .select()
    .from(transactions)
    .where(isNull(transactions.deletedAt))
    .all();

  let totalInflow = 0;
  let totalOutflow = 0;
  const groupedTransferIds = new Set<string>();

  for (const tx of allTx) {
    if (tx.type === "transfer") {
      if (tx.transactionGroupId) groupedTransferIds.add(tx.transactionGroupId);
      continue;
    }
    if (tx.amountMinorUnits > 0) {
      totalInflow += tx.amountMinorUnits;
    } else if (tx.amountMinorUnits < 0) {
      totalOutflow += Math.abs(tx.amountMinorUnits);
    }
  }

  const transferCount = groupedTransferIds.size;
  const standaloneCount = allTx.filter((tx) => tx.type !== "transfer").length;

  return {
    totalInflowMinorUnits: totalInflow,
    totalOutflowMinorUnits: totalOutflow,
    netCashflowMinorUnits: totalInflow - totalOutflow,
    transactionCount: standaloneCount + transferCount,
  };
}

export function hasTransactionsForAccount(
  accountId: string,
  context: DbContext = db,
): boolean {
  return Boolean(
    context
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .limit(1)
      .get(),
  );
}

export function getAccountIdsWithTransactions(
  context: DbContext = db,
): Set<string> {
  const rows = context
    .selectDistinct({ accountId: transactions.accountId })
    .from(transactions)
    .all();
  return new Set(rows.map((r) => r.accountId));
}
