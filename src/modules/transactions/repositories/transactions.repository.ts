import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";

export type { DbContext };
import {
  DEFAULT_BASE_CURRENCY,
  normalizeExchangeRateScaled,
} from "@/utils/currency";
import {
  accountTypes,
  accounts,
  categories,
  pockets,
  transactionAttachments,
  transactionEntries,
  transactions,
} from "@/infrastructure/database/schema";
import type {
  NewTransaction,
  Transaction,
  TransactionFilter,
  TransactionListItem,
  TransactionPageCursor,
  TransactionPageFilter,
  TransactionPageResult,
  TransactionStats,
} from "../types/transaction.types";
import { getLabelsByTransactionIds, type LabelBadgeItem } from "@/modules/labels";
import { applySplitListMetadata } from "../utils/apply-split-list-metadata";

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
    originalAmountMinorUnits: r.transaction.originalAmountMinorUnits ?? null,
    exchangeRateScaled: normalizeExchangeRateScaled(
      r.transaction.exchangeRateScaled,
    ),
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
    transferFeeCurrencyCode: null,
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
      transferFeeCurrencyCode: feeItem ? (feeItem.currencyCode ?? feeItem.accountCurrency ?? null) : null,
      transferFeeAccountId: feeItem?.accountId ?? null,
      transferFeeAccountName: feeItem?.accountName ?? null,
      transferFeePocketId: feeItem?.pocketId ?? null,
      transferFeePocketName: feeItem?.pocketName ?? null,
      transferFeeCategoryId: feeItem?.categoryId ?? null,
      transferFeeCategoryName: feeItem?.categoryName ?? null,
      transferDestinationAmountMinorUnits: Math.abs(inLeg.amountMinorUnits),
      transferExchangeRateScaled: normalizeExchangeRateScaled(
        inLeg.exchangeRateScaled,
      ),
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
    conditions.push(
      or(
        eq(transactions.categoryId, filter.categoryId),
        sql`EXISTS (
          SELECT 1 FROM ${transactionEntries} split_entry
          WHERE split_entry.transaction_id = ${transactions.id}
            AND split_entry.category_id = ${filter.categoryId}
        )`,
      ),
    );
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
  if (filter?.startDate) {
    conditions.push(gte(transactions.occurredAt, filter.startDate));
  }
  if (filter?.endDate) {
    conditions.push(lte(transactions.occurredAt, filter.endDate));
  }

  const rows = query.where(and(...conditions)).all();

  const shouldIncludeBalances = filter?.includeBalances ?? true;
  const balanceAfterByTransactionId = shouldIncludeBalances
    ? getBalanceAfterByTransactionId(filter?.accountId, context)
    : new Map<string, number>();
  const pocketBalanceAfterByTransactionId = shouldIncludeBalances
    ? getPocketBalanceAfterByTransactionId(null, context)
    : new Map<string, number>();
  const attachmentCountByTransactionId = getAttachmentCountByTransactionId(
    context,
    rows.map((row) => row.transaction.id),
  );
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
  const grouped = applySplitListMetadata(groupTransferRows(mapped), context);

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
        (tx.splitEntries &&
          tx.splitEntries.some(
            (entry) =>
              entry.categoryName &&
              entry.categoryName.toLowerCase().includes(q),
          )) ||
        (tx.pocketName && tx.pocketName.toLowerCase().includes(q)) ||
        (tx.transferPocketName && tx.transferPocketName.toLowerCase().includes(q)) ||
        (tx.labels && tx.labels.some((lbl) => lbl.name.toLowerCase().includes(q))) ||
        tx.accountName.toLowerCase().includes(q) ||
        (tx.transferAccountName && tx.transferAccountName.toLowerCase().includes(q)),
    );
  }

  return grouped;
}

/**
 * Loads only the newest logical transactions with bounded hydration.
 * Retrieves companions for any transfer group within the boundary so
 * recent transfers and fees group accurately without scanning the whole ledger.
 */
export function listRecentTransactions(
  limit = 5,
  context: DbContext = db,
): TransactionListItem[] {
  if (limit <= 0) return [];

  const fetchLimit = Math.max(15, limit * 3);
  const rawRows = context
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
    .where(isNull(transactions.deletedAt))
    .orderBy(
      desc(transactions.occurredAt),
      desc(transactions.createdAt),
      desc(transactions.id),
    )
    .limit(fetchLimit)
    .all();

  if (rawRows.length === 0) return [];

  const fetchedIds = new Set(rawRows.map((r) => r.transaction.id));
  const groupIds = new Set(
    rawRows
      .map((r) => r.transaction.transactionGroupId)
      .filter((g): g is string => Boolean(g)),
  );

  let allRows = [...rawRows];
  if (groupIds.size > 0) {
    const siblingRows = context
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
      .where(
        and(
          isNull(transactions.deletedAt),
          inArray(transactions.transactionGroupId, Array.from(groupIds)),
        ),
      )
      .all();

    for (const sib of siblingRows) {
      if (!fetchedIds.has(sib.transaction.id)) {
        fetchedIds.add(sib.transaction.id);
        allRows.push(sib);
      }
    }

    allRows.sort((a, b) => {
      const dateDiff =
        b.transaction.occurredAt.getTime() - a.transaction.occurredAt.getTime();
      if (dateDiff !== 0) return dateDiff;
      const createdDiff =
        b.transaction.createdAt.getTime() - a.transaction.createdAt.getTime();
      if (createdDiff !== 0) return createdDiff;
      return b.transaction.id.localeCompare(a.transaction.id);
    });
  }

  const txIds = allRows.map((r) => r.transaction.id);
  const labelsByTransactionId = getLabelsByTransactionIds(txIds, context);
  const attachmentCountByTransactionId = getAttachmentCountByTransactionId(
    context,
    txIds,
  );

  const emptyBalances = new Map<string, number>();
  const mapped = allRows.map((row) =>
    mapRowToListItem(
      row,
      emptyBalances,
      emptyBalances,
      attachmentCountByTransactionId,
      labelsByTransactionId,
    ),
  );

  const grouped = applySplitListMetadata(groupTransferRows(mapped), context);
  grouped.sort((a, b) => {
    const timeA = new Date(a.occurredAt).getTime();
    const timeB = new Date(b.occurredAt).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return grouped.slice(0, limit);
}

type JoinedTransactionRow = {
  transaction: typeof transactions.$inferSelect;
  accountName: string | null;
  accountCurrency: string | null;
  accountTypeName: string | null;
  accountPocketEnabled: boolean | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  pocketName: string | null;
};

const JOINED_TRANSACTION_SELECTION = {
  transaction: transactions,
  accountName: accounts.name,
  accountCurrency: accounts.currencyCode,
  accountTypeName: accountTypes.name,
  accountPocketEnabled: accounts.pocketEnabled,
  categoryName: categories.name,
  categoryIcon: categories.icon,
  categoryColor: categories.hexColorsId,
  pocketName: pockets.name,
};

const SQL_IN_CHUNK_SIZE = 500;
const BOUNDED_BALANCE_RANGE_LIMIT = 500;
const BULK_BALANCE_THRESHOLD = 250;

function escapeSqlLikeTerm(raw: string): string {
  return `%${raw
    .trim()
    .toLowerCase()
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")}%`;
}

/**
 * Excludes only the secondary (`inLeg`) row of a 2-leg active transfer group so
 * every remaining active row maps 1-to-1 with a canonical logical display item.
 */
function canonicalLogicalTransactionCondition(): SQL {
  return sql`NOT (
    "transactions"."type" = 'transfer'
    AND "transactions"."transaction_group_id" IS NOT NULL
    AND (
      SELECT count(*) FROM transactions g
      WHERE g.deleted_at IS NULL
        AND g.type = 'transfer'
        AND g.transaction_group_id = "transactions"."transaction_group_id"
    ) = 2
    AND EXISTS (
      SELECT 1 FROM transactions other_leg
      WHERE other_leg.deleted_at IS NULL
        AND other_leg.type = 'transfer'
        AND other_leg.transaction_group_id = "transactions"."transaction_group_id"
        AND other_leg.id != "transactions"."id"
        AND (
          (other_leg.amount_minor_units < 0 AND "transactions"."amount_minor_units" >= 0)
          OR (
            ((other_leg.amount_minor_units < 0) = ("transactions"."amount_minor_units" < 0))
            AND other_leg.id < "transactions"."id"
          )
        )
    )
  )`;
}

function buildTransactionPageConditions(
  filter?: TransactionPageFilter,
): SQL[] {
  const conditions: SQL[] = [
    isNull(transactions.deletedAt),
    canonicalLogicalTransactionCondition(),
  ];

  if (filter?.type && filter.type !== "all") {
    conditions.push(eq(transactions.type, filter.type));
  }

  if (filter?.accountIds && filter.accountIds.length > 0) {
    const accountIds = filter.accountIds;
    const siblingAccountMatches = sql.join(
      accountIds.map((id) => sql`${id}`),
      sql`, `,
    );
    conditions.push(
      or(
        inArray(transactions.accountId, accountIds),
        sql`(
          "transactions"."type" = 'transfer'
          AND "transactions"."transaction_group_id" IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM transactions sibling_leg
            WHERE sibling_leg.deleted_at IS NULL
              AND sibling_leg.type = 'transfer'
              AND sibling_leg.transaction_group_id = "transactions"."transaction_group_id"
              AND sibling_leg.account_id IN (${siblingAccountMatches})
          )
        )`,
      )!,
    );
  }

  if (filter?.categoryIds && filter.categoryIds.length > 0) {
    const categoryIds = filter.categoryIds;
    const splitCatMatches = sql.join(
      categoryIds.map((id) => sql`${id}`),
      sql`, `,
    );
    conditions.push(
      or(
        inArray(transactions.categoryId, categoryIds),
        sql`EXISTS (
          SELECT 1 FROM transaction_entries split_entry
          WHERE split_entry.transaction_id = "transactions"."id"
            AND split_entry.category_id IN (${splitCatMatches})
        )`,
      )!,
    );
  }

  if (filter?.labelIds && filter.labelIds.length > 0) {
    const labelMatches = sql.join(
      filter.labelIds.map((id) => sql`${id}`),
      sql`, `,
    );
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM transaction_labels tl
        WHERE tl.transaction_id = "transactions"."id"
          AND tl.label_id IN (${labelMatches})
      )`,
    );
  }

  if (filter?.startDate) {
    conditions.push(gte(transactions.occurredAt, filter.startDate));
  }

  if (filter?.endDate) {
    conditions.push(lte(transactions.occurredAt, filter.endDate));
  }

  if (filter?.searchQuery && filter.searchQuery.trim().length > 0) {
    const term = escapeSqlLikeTerm(filter.searchQuery);
    conditions.push(
      sql`(
        lower(coalesce("transactions"."name", '')) LIKE ${term} ESCAPE '\\'
        OR lower(coalesce("transactions"."note", '')) LIKE ${term} ESCAPE '\\'
        OR lower(coalesce(${categories.name}, '')) LIKE ${term} ESCAPE '\\'
        OR lower(coalesce(${accounts.name}, '')) LIKE ${term} ESCAPE '\\'
        OR lower(coalesce(${pockets.name}, '')) LIKE ${term} ESCAPE '\\'
        OR EXISTS (
          SELECT 1 FROM transaction_labels tl
          INNER JOIN labels l ON l.id = tl.label_id
          WHERE tl.transaction_id = "transactions"."id"
            AND lower(l.name) LIKE ${term} ESCAPE '\\'
        )
        OR EXISTS (
          SELECT 1 FROM transaction_entries se
          INNER JOIN categories sc ON sc.id = se.category_id
          WHERE se.transaction_id = "transactions"."id"
            AND lower(sc.name) LIKE ${term} ESCAPE '\\'
        )
        OR (
          "transactions"."type" = 'transfer'
          AND "transactions"."transaction_group_id" IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM transactions sibling_leg
            LEFT JOIN accounts dest_acc ON dest_acc.id = sibling_leg.account_id
            LEFT JOIN pockets dest_poc ON dest_poc.id = sibling_leg.pocket_id
            WHERE sibling_leg.deleted_at IS NULL
              AND sibling_leg.type = 'transfer'
              AND sibling_leg.transaction_group_id = "transactions"."transaction_group_id"
              AND sibling_leg.id != "transactions"."id"
              AND (
                lower(coalesce(dest_acc.name, '')) LIKE ${term} ESCAPE '\\'
                OR lower(coalesce(dest_poc.name, '')) LIKE ${term} ESCAPE '\\'
              )
          )
        )
      )`,
    );
  }

  return conditions;
}

function buildKeysetCursorCondition(cursor: TransactionPageCursor): SQL {
  const { occurredAtMs, createdAtMs, absAmount, id, sortBy, sortOrder } = cursor;
  if (sortBy === "amount") {
    if (sortOrder === "asc") {
      return sql`(
        abs(${transactions.amountMinorUnits}) > ${absAmount}
        OR (abs(${transactions.amountMinorUnits}) = ${absAmount} AND ${transactions.occurredAt} > ${occurredAtMs})
        OR (abs(${transactions.amountMinorUnits}) = ${absAmount} AND ${transactions.occurredAt} = ${occurredAtMs} AND ${transactions.createdAt} > ${createdAtMs})
        OR (abs(${transactions.amountMinorUnits}) = ${absAmount} AND ${transactions.occurredAt} = ${occurredAtMs} AND ${transactions.createdAt} = ${createdAtMs} AND ${transactions.id} > ${id})
      )`;
    }
    return sql`(
      abs(${transactions.amountMinorUnits}) < ${absAmount}
      OR (abs(${transactions.amountMinorUnits}) = ${absAmount} AND ${transactions.occurredAt} < ${occurredAtMs})
      OR (abs(${transactions.amountMinorUnits}) = ${absAmount} AND ${transactions.occurredAt} = ${occurredAtMs} AND ${transactions.createdAt} < ${createdAtMs})
      OR (abs(${transactions.amountMinorUnits}) = ${absAmount} AND ${transactions.occurredAt} = ${occurredAtMs} AND ${transactions.createdAt} = ${createdAtMs} AND ${transactions.id} < ${id})
    )`;
  }

  if (sortOrder === "asc") {
    return sql`(
      ${transactions.occurredAt} > ${occurredAtMs}
      OR (${transactions.occurredAt} = ${occurredAtMs} AND ${transactions.createdAt} > ${createdAtMs})
      OR (${transactions.occurredAt} = ${occurredAtMs} AND ${transactions.createdAt} = ${createdAtMs} AND ${transactions.id} > ${id})
    )`;
  }

  return sql`(
    ${transactions.occurredAt} < ${occurredAtMs}
    OR (${transactions.occurredAt} = ${occurredAtMs} AND ${transactions.createdAt} < ${createdAtMs})
    OR (${transactions.occurredAt} = ${occurredAtMs} AND ${transactions.createdAt} = ${createdAtMs} AND ${transactions.id} < ${id})
  )`;
}

function getPageOrderClauses(
  sortBy: "date" | "amount",
  sortOrder: "asc" | "desc",
) {
  if (sortBy === "amount") {
    return sortOrder === "asc"
      ? [
          sql`abs(${transactions.amountMinorUnits}) ASC`,
          asc(transactions.occurredAt),
          asc(transactions.createdAt),
          asc(transactions.id),
        ]
      : [
          sql`abs(${transactions.amountMinorUnits}) DESC`,
          desc(transactions.occurredAt),
          desc(transactions.createdAt),
          desc(transactions.id),
        ];
  }

  return sortOrder === "asc"
    ? [
        asc(transactions.occurredAt),
        asc(transactions.createdAt),
        asc(transactions.id),
      ]
    : [
        desc(transactions.occurredAt),
        desc(transactions.createdAt),
        desc(transactions.id),
      ];
}

function compareChronologicalRows(
  a: typeof transactions.$inferSelect,
  b: typeof transactions.$inferSelect,
): number {
  const occDiff = a.occurredAt.getTime() - b.occurredAt.getTime();
  if (occDiff !== 0) return occDiff;
  const createdDiff = a.createdAt.getTime() - b.createdAt.getTime();
  if (createdDiff !== 0) return createdDiff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Computes exact historical `accountBalanceAfterMinorUnits` for a bounded set of
 * rows without hydrating the entire ledger into JavaScript.
 */
function getAccountBalancesAfterForRows(
  rawRows: readonly JoinedTransactionRow[],
  context: DbContext = db,
): Map<string, number> {
  const result = new Map<string, number>();
  if (rawRows.length === 0) return result;

  const rowsByAccount = new Map<string, (typeof transactions.$inferSelect)[]>();
  for (const r of rawRows) {
    let list = rowsByAccount.get(r.transaction.accountId);
    if (!list) {
      list = [];
      rowsByAccount.set(r.transaction.accountId, list);
    }
    list.push(r.transaction);
  }

  const accountIds = Array.from(rowsByAccount.keys());
  const openingByAccountId = new Map<string, number>();
  for (let i = 0; i < accountIds.length; i += SQL_IN_CHUNK_SIZE) {
    const chunk = accountIds.slice(i, i + SQL_IN_CHUNK_SIZE);
    const accRows = context
      .select({
        id: accounts.id,
        openingBalanceMinorUnits: accounts.openingBalanceMinorUnits,
      })
      .from(accounts)
      .where(inArray(accounts.id, chunk))
      .all();
    for (const acc of accRows) {
      openingByAccountId.set(acc.id, acc.openingBalanceMinorUnits ?? 0);
    }
  }

  for (const [accountId, accRows] of rowsByAccount) {
    const openingBalance = openingByAccountId.get(accountId) ?? 0;
    const dedupMap = new Map<string, typeof transactions.$inferSelect>();
    for (const tx of accRows) {
      dedupMap.set(tx.id, tx);
    }
    const sorted = Array.from(dedupMap.values()).sort(compareChronologicalRows);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const firstOcc = first.occurredAt.getTime();
    const firstCreated = first.createdAt.getTime();
    const lastOcc = last.occurredAt.getTime();
    const lastCreated = last.createdAt.getTime();

    const rangeCondition = and(
      isNull(transactions.deletedAt),
      eq(transactions.accountId, accountId),
      sql`(
        ${transactions.occurredAt} > ${firstOcc}
        OR (${transactions.occurredAt} = ${firstOcc} AND (
          ${transactions.createdAt} > ${firstCreated}
          OR (${transactions.createdAt} = ${firstCreated} AND ${transactions.id} >= ${first.id})
        ))
      )`,
      sql`(
        ${transactions.occurredAt} < ${lastOcc}
        OR (${transactions.occurredAt} = ${lastOcc} AND (
          ${transactions.createdAt} < ${lastCreated}
          OR (${transactions.createdAt} = ${lastCreated} AND ${transactions.id} <= ${last.id})
        ))
      )`,
    );

    const rangeCountRow = context
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(rangeCondition)
      .get();
    const rangeCount = Number(rangeCountRow?.count ?? 0);

    if (rangeCount <= BOUNDED_BALANCE_RANGE_LIMIT) {
      const anchorRow = context
        .select({
          total: sql<number>`coalesce(sum(${transactions.amountMinorUnits}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            isNull(transactions.deletedAt),
            eq(transactions.accountId, accountId),
            sql`(
              ${transactions.occurredAt} < ${firstOcc}
              OR (${transactions.occurredAt} = ${firstOcc} AND (
                ${transactions.createdAt} < ${firstCreated}
                OR (${transactions.createdAt} = ${firstCreated} AND ${transactions.id} < ${first.id})
              ))
            )`,
          ),
        )
        .get();

      let running = openingBalance + Number(anchorRow?.total ?? 0);
      const rangeRows = context
        .select({
          id: transactions.id,
          amountMinorUnits: transactions.amountMinorUnits,
        })
        .from(transactions)
        .where(rangeCondition)
        .orderBy(
          asc(transactions.occurredAt),
          asc(transactions.createdAt),
          asc(transactions.id),
        )
        .all();

      for (const row of rangeRows) {
        running += row.amountMinorUnits;
        if (dedupMap.has(row.id)) {
          result.set(row.id, running);
        }
      }
    } else {
      const targetIds = Array.from(dedupMap.keys());
      for (let i = 0; i < targetIds.length; i += SQL_IN_CHUNK_SIZE) {
        const chunk = targetIds.slice(i, i + SQL_IN_CHUNK_SIZE);
        const chunkParams = sql.join(
          chunk.map((id) => sql`${id}`),
          sql`, `,
        );
        const rows = context.all<{ id: string; delta: number }>(sql`
          SELECT target.id AS id,
            (
              SELECT coalesce(sum(x.amount_minor_units), 0)
              FROM transactions x
              WHERE x.deleted_at IS NULL
                AND x.account_id = target.account_id
                AND (
                  x.occurred_at < target.occurred_at
                  OR (x.occurred_at = target.occurred_at AND (
                    x.created_at < target.created_at
                    OR (x.created_at = target.created_at AND x.id <= target.id)
                  ))
                )
            ) AS delta
          FROM transactions target
          WHERE target.id IN (${chunkParams})
        `);
        for (const row of rows) {
          result.set(row.id, openingBalance + Number(row.delta ?? 0));
        }
      }
    }
  }

  return result;
}

/**
 * Computes exact historical `locationBalanceAfterMinorUnits` for pocket-linked
 * rows in a bounded page (issues 0 SQL queries if no row belongs to a pocket).
 */
function getPocketBalancesAfterForRows(
  rawRows: readonly JoinedTransactionRow[],
  context: DbContext = db,
): Map<string, number> {
  const result = new Map<string, number>();
  const rowsByPocket = new Map<string, (typeof transactions.$inferSelect)[]>();
  for (const r of rawRows) {
    if (!r.transaction.pocketId) continue;
    let list = rowsByPocket.get(r.transaction.pocketId);
    if (!list) {
      list = [];
      rowsByPocket.set(r.transaction.pocketId, list);
    }
    list.push(r.transaction);
  }

  if (rowsByPocket.size === 0) return result;

  for (const [pocketId, pocketRows] of rowsByPocket) {
    const dedupMap = new Map<string, typeof transactions.$inferSelect>();
    for (const tx of pocketRows) {
      dedupMap.set(tx.id, tx);
    }
    const sorted = Array.from(dedupMap.values()).sort(compareChronologicalRows);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const firstOcc = first.occurredAt.getTime();
    const firstCreated = first.createdAt.getTime();
    const lastOcc = last.occurredAt.getTime();
    const lastCreated = last.createdAt.getTime();

    const rangeCondition = and(
      isNull(transactions.deletedAt),
      eq(transactions.pocketId, pocketId),
      sql`(
        ${transactions.occurredAt} > ${firstOcc}
        OR (${transactions.occurredAt} = ${firstOcc} AND (
          ${transactions.createdAt} > ${firstCreated}
          OR (${transactions.createdAt} = ${firstCreated} AND ${transactions.id} >= ${first.id})
        ))
      )`,
      sql`(
        ${transactions.occurredAt} < ${lastOcc}
        OR (${transactions.occurredAt} = ${lastOcc} AND (
          ${transactions.createdAt} < ${lastCreated}
          OR (${transactions.createdAt} = ${lastCreated} AND ${transactions.id} <= ${last.id})
        ))
      )`,
    );

    const rangeCountRow = context
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(rangeCondition)
      .get();
    const rangeCount = Number(rangeCountRow?.count ?? 0);

    if (rangeCount <= BOUNDED_BALANCE_RANGE_LIMIT) {
      const anchorRow = context
        .select({
          total: sql<number>`coalesce(sum(${transactions.amountMinorUnits}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            isNull(transactions.deletedAt),
            eq(transactions.pocketId, pocketId),
            sql`(
              ${transactions.occurredAt} < ${firstOcc}
              OR (${transactions.occurredAt} = ${firstOcc} AND (
                ${transactions.createdAt} < ${firstCreated}
                OR (${transactions.createdAt} = ${firstCreated} AND ${transactions.id} < ${first.id})
              ))
            )`,
          ),
        )
        .get();

      let running = Number(anchorRow?.total ?? 0);
      const rangeRows = context
        .select({
          id: transactions.id,
          amountMinorUnits: transactions.amountMinorUnits,
        })
        .from(transactions)
        .where(rangeCondition)
        .orderBy(
          asc(transactions.occurredAt),
          asc(transactions.createdAt),
          asc(transactions.id),
        )
        .all();

      for (const row of rangeRows) {
        running += row.amountMinorUnits;
        if (dedupMap.has(row.id)) {
          result.set(row.id, running);
        }
      }
    } else {
      const targetIds = Array.from(dedupMap.keys());
      for (let i = 0; i < targetIds.length; i += SQL_IN_CHUNK_SIZE) {
        const chunk = targetIds.slice(i, i + SQL_IN_CHUNK_SIZE);
        const chunkParams = sql.join(
          chunk.map((id) => sql`${id}`),
          sql`, `,
        );
        const rows = context.all<{ id: string; delta: number }>(sql`
          SELECT target.id AS id,
            (
              SELECT coalesce(sum(x.amount_minor_units), 0)
              FROM transactions x
              WHERE x.deleted_at IS NULL
                AND x.pocket_id = target.pocket_id
                AND (
                  x.occurred_at < target.occurred_at
                  OR (x.occurred_at = target.occurred_at AND (
                    x.created_at < target.created_at
                    OR (x.created_at = target.created_at AND x.id <= target.id)
                  ))
                )
            ) AS delta
          FROM transactions target
          WHERE target.id IN (${chunkParams})
        `);
        for (const row of rows) {
          result.set(row.id, Number(row.delta ?? 0));
        }
      }
    }
  }

  return result;
}

function hydratePrimaryTransactionRows(
  primaryRows: JoinedTransactionRow[],
  options: { includeBalances?: boolean } = {},
  context: DbContext = db,
): TransactionListItem[] {
  if (primaryRows.length === 0) return [];

  const primaryIdsInOrder = primaryRows.map((r) => r.transaction.id);
  const fetchedIds = new Set(primaryIdsInOrder);
  const groupIds = Array.from(
    new Set(
      primaryRows
        .map((r) => r.transaction.transactionGroupId)
        .filter((g): g is string => Boolean(g)),
    ),
  );

  const allRows: JoinedTransactionRow[] = [...primaryRows];
  if (groupIds.length > 0) {
    for (let i = 0; i < groupIds.length; i += SQL_IN_CHUNK_SIZE) {
      const chunk = groupIds.slice(i, i + SQL_IN_CHUNK_SIZE);
      const siblingRows = context
        .select(JOINED_TRANSACTION_SELECTION)
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(pockets, eq(transactions.pocketId, pockets.id))
        .where(
          and(
            isNull(transactions.deletedAt),
            inArray(transactions.transactionGroupId, chunk),
          ),
        )
        .all();

      for (const sib of siblingRows) {
        if (!fetchedIds.has(sib.transaction.id)) {
          fetchedIds.add(sib.transaction.id);
          allRows.push(sib);
        }
      }
    }
  }

  const shouldIncludeBalances = options.includeBalances ?? true;
  let balanceAfterByTransactionId: Map<string, number>;
  let pocketBalanceAfterByTransactionId: Map<string, number>;
  if (!shouldIncludeBalances) {
    balanceAfterByTransactionId = new Map();
    pocketBalanceAfterByTransactionId = new Map();
  } else if (allRows.length <= BULK_BALANCE_THRESHOLD) {
    balanceAfterByTransactionId = getAccountBalancesAfterForRows(
      allRows,
      context,
    );
    pocketBalanceAfterByTransactionId = getPocketBalancesAfterForRows(
      allRows,
      context,
    );
  } else {
    balanceAfterByTransactionId = getBalanceAfterByTransactionId(null, context);
    pocketBalanceAfterByTransactionId = getPocketBalanceAfterByTransactionId(
      null,
      context,
    );
  }

  const allTxIds = allRows.map((r) => r.transaction.id);
  const attachmentCountByTransactionId = getAttachmentCountByTransactionId(
    context,
    allTxIds,
  );
  const labelsByTransactionId = getLabelsByTransactionIds(allTxIds, context);

  const mapped = allRows.map((row) =>
    mapRowToListItem(
      row,
      balanceAfterByTransactionId,
      pocketBalanceAfterByTransactionId,
      attachmentCountByTransactionId,
      labelsByTransactionId,
    ),
  );
  const grouped = groupTransferRows(mapped);
  const groupedById = new Map(grouped.map((item) => [item.id, item]));

  const orderedPrimaryItems: TransactionListItem[] = [];
  for (const id of primaryIdsInOrder) {
    const item = groupedById.get(id);
    if (item) {
      orderedPrimaryItems.push(item);
    }
  }

  return applySplitListMetadata(orderedPrimaryItems, context);
}

/**
 * Queries one deterministic keyset-paginated page of logical active transactions
 * directly in SQLite, hydrating transfer families, labels, attachments, splits,
 * and historical account/pocket balances strictly for the returned page.
 */
export function listTransactionsPage(
  options: {
    filter?: TransactionPageFilter;
    limit?: number;
    cursor?: TransactionPageCursor | null;
    includeTotalCount?: boolean;
  } = {},
  context: DbContext = db,
): TransactionPageResult {
  const {
    filter,
    limit = 50,
    cursor = null,
    includeTotalCount = cursor === null,
  } = options;

  if (limit <= 0 || filter?.emptyResult) {
    return {
      items: [],
      nextCursor: null,
      hasMore: false,
      ...(includeTotalCount ? { totalCount: 0 } : {}),
    };
  }

  const sortBy = filter?.sortBy ?? "date";
  const sortOrder = filter?.sortOrder ?? "desc";
  const baseConditions = buildTransactionPageConditions(filter);
  const pageConditions = cursor
    ? [...baseConditions, buildKeysetCursorCondition(cursor)]
    : baseConditions;

  const hasSearch = Boolean(filter?.searchQuery && filter.searchQuery.trim().length > 0);

  let totalCount: number | undefined;
  if (includeTotalCount) {
    const countQuery = context
      .select({ count: sql<number>`count(*)` })
      .from(transactions);
    const countRow = hasSearch
      ? countQuery
          .leftJoin(accounts, eq(transactions.accountId, accounts.id))
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .leftJoin(pockets, eq(transactions.pocketId, pockets.id))
          .where(and(...baseConditions))
          .get()
      : countQuery.where(and(...baseConditions)).get();
    totalCount = Number(countRow?.count ?? 0);
    if (totalCount === 0) {
      return {
        items: [],
        nextCursor: null,
        hasMore: false,
        totalCount: 0,
      };
    }
  }

  const fetchedRows = context
    .select(JOINED_TRANSACTION_SELECTION)
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(pockets, eq(transactions.pocketId, pockets.id))
    .where(and(...pageConditions))
    .orderBy(...getPageOrderClauses(sortBy, sortOrder))
    .limit(limit + 1)
    .all();

  const hasMore = fetchedRows.length > limit;
  const pagePrimaryRows = hasMore ? fetchedRows.slice(0, limit) : fetchedRows;
  const items = hydratePrimaryTransactionRows(
    pagePrimaryRows,
    { includeBalances: filter?.includeBalances ?? true },
    context,
  );

  const lastRow = pagePrimaryRows[pagePrimaryRows.length - 1];
  const nextCursor: TransactionPageCursor | null =
    hasMore && lastRow
      ? {
          sortBy,
          sortOrder,
          occurredAtMs: lastRow.transaction.occurredAt.getTime(),
          createdAtMs: lastRow.transaction.createdAt.getTime(),
          absAmount: Math.abs(lastRow.transaction.amountMinorUnits),
          id: lastRow.transaction.id,
        }
      : null;

  return {
    items,
    nextCursor,
    hasMore,
    ...(totalCount !== undefined ? { totalCount } : {}),
  };
}

/**
 * Fetches ALL active logical transactions matching a page filter in the exact
 * same deterministic order as `listTransactionsPage`. Dedicated to unpaginated
 * consumers such as full filtered CSV export.
 */
export function listAllFilteredTransactions(
  filter?: TransactionPageFilter,
  context: DbContext = db,
): TransactionListItem[] {
  if (filter?.emptyResult) return [];

  const sortBy = filter?.sortBy ?? "date";
  const sortOrder = filter?.sortOrder ?? "desc";
  const conditions = buildTransactionPageConditions(filter);

  const primaryRows = context
    .select(JOINED_TRANSACTION_SELECTION)
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(pockets, eq(transactions.pocketId, pockets.id))
    .where(and(...conditions))
    .orderBy(...getPageOrderClauses(sortBy, sortOrder))
    .all();

  return hydratePrimaryTransactionRows(
    primaryRows,
    { includeBalances: filter?.includeBalances ?? true },
    context,
  );
}

/**
 * Hydrates a single active logical transaction (including its transfer sibling,
 * fee metadata, labels, splits, and historical balance) by ID without loading the ledger.
 */
export function findTransactionListItemById(
  id: string,
  context: DbContext = db,
): TransactionListItem | null {
  if (!id) return null;

  const row = context
    .select(JOINED_TRANSACTION_SELECTION)
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(pockets, eq(transactions.pocketId, pockets.id))
    .where(
      and(
        or(eq(transactions.id, id), eq(transactions.transactionGroupId, id)),
        isNull(transactions.deletedAt),
      ),
    )
    .get();

  if (!row) return null;

  // If the requested ID was the inLeg of a 2-leg transfer, resolve its canonical outLeg
  if (
    row.transaction.type === "transfer" &&
    row.transaction.transactionGroupId
  ) {
    const groupRows = context
      .select(JOINED_TRANSACTION_SELECTION)
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(pockets, eq(transactions.pocketId, pockets.id))
      .where(
        and(
          isNull(transactions.deletedAt),
          eq(transactions.transactionGroupId, row.transaction.transactionGroupId),
        ),
      )
      .all();

    const transferLegs = groupRows.filter(
      (r) => r.transaction.type === "transfer",
    );
    if (transferLegs.length === 2) {
      const outLeg =
        transferLegs.find((leg) => leg.transaction.amountMinorUnits < 0) ??
        transferLegs.sort((a, b) =>
          a.transaction.id < b.transaction.id ? -1 : 1,
        )[0]!;
      return (
        hydratePrimaryTransactionRows(
          [outLeg],
          { includeBalances: true },
          context,
        )[0] ?? null
      );
    }
  }

  return (
    hydratePrimaryTransactionRows([row], { includeBalances: true }, context)[0] ??
    null
  );
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

  if (rows.length === 0) {
    return [];
  }

  // Deleted rows have no active-ledger balance; avoid scanning the active ledger.
  const balanceAfterByTransactionId = new Map<string, number>();
  const pocketBalanceAfterByTransactionId = new Map<string, number>();
  const transactionIds = rows.map((row) => row.transaction.id);
  const attachmentCountByTransactionId =
    getAttachmentCountByTransactionId(context, transactionIds);
  const labelsByTransactionId = getLabelsByTransactionIds(transactionIds, context);
  return applySplitListMetadata(
    groupTransferRows(
      rows.map((row) =>
        mapRowToListItem(
          row,
          balanceAfterByTransactionId,
          pocketBalanceAfterByTransactionId,
          attachmentCountByTransactionId,
          labelsByTransactionId,
        ),
      ),
    ),
    context,
  );
}

function getAttachmentCountByTransactionId(
  context: DbContext = db,
  transactionIds?: string[],
): Map<string, number> {
  if (transactionIds !== undefined && transactionIds.length === 0) {
    return new Map();
  }

  if (!transactionIds) {
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

  const uniqueIds = Array.from(new Set(transactionIds));
  const counts = new Map<string, number>();
  for (let i = 0; i < uniqueIds.length; i += SQL_IN_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + SQL_IN_CHUNK_SIZE);
    const rows = context
      .select({
        transactionId: transactionAttachments.transactionId,
        count: sql<number>`count(*)`,
      })
      .from(transactionAttachments)
      .where(
        and(
          isNull(transactionAttachments.deletedAt),
          inArray(transactionAttachments.transactionId, chunk),
        ),
      )
      .groupBy(transactionAttachments.transactionId)
      .all();
    for (const row of rows) {
      counts.set(row.transactionId, Number(row.count));
    }
  }
  return counts;
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

export function findTransactionsByIds(
  ids: string[],
  context: DbContext = db,
): Transaction[] {
  if (ids.length === 0) return [];
  const CHUNK_SIZE = 500;
  const results: Transaction[] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const rows = context
      .select()
      .from(transactions)
      .where(inArray(transactions.id, chunk))
      .all();
    for (const row of rows) {
      results.push({
        ...row,
        type: row.type as Transaction["type"],
      });
    }
  }
  return results;
}

export function reassignTransactionCategoryRecords(
  fromCategoryId: string,
  toCategoryId: string,
  context: DbContext = db,
): void {
  context
    .update(transactions)
    .set({ categoryId: toCategoryId, updatedAt: new Date() })
    .where(eq(transactions.categoryId, fromCategoryId))
    .run();
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

export function listDeletedTransactionRecords(
  context: DbContext = db,
): Transaction[] {
  return context
    .select()
    .from(transactions)
    .where(isNotNull(transactions.deletedAt))
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
    originalAmountMinorUnits: data.originalAmountMinorUnits ?? null,
    exchangeRateScaled: data.exchangeRateScaled ?? null,
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
      | "originalAmountMinorUnits"
      | "exchangeRateScaled"
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
    .where(
      and(
        eq(transactions.transactionGroupId, groupId),
        isNull(transactions.deletedAt),
      ),
    )
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
  const result = context
    .select({
      totalInflow: sql<number>`coalesce(sum(case when ${transactions.type} != 'transfer' and ${transactions.amountMinorUnits} > 0 then ${transactions.amountMinorUnits} else 0 end), 0)`,
      totalOutflow: sql<number>`coalesce(sum(case when ${transactions.type} != 'transfer' and ${transactions.amountMinorUnits} < 0 then abs(${transactions.amountMinorUnits}) else 0 end), 0)`,
      standaloneCount: sql<number>`coalesce(sum(case when ${transactions.type} != 'transfer' then 1 else 0 end), 0)`,
      transferCount: sql<number>`count(distinct case when ${transactions.type} = 'transfer' and ${transactions.transactionGroupId} is not null then ${transactions.transactionGroupId} else null end)`,
    })
    .from(transactions)
    .where(isNull(transactions.deletedAt))
    .get();

  const totalInflow = Number(result?.totalInflow ?? 0);
  const totalOutflow = Number(result?.totalOutflow ?? 0);
  const standaloneCount = Number(result?.standaloneCount ?? 0);
  const transferCount = Number(result?.transferCount ?? 0);

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

export function findAccountTransactionDelta(
  accountId: string,
  context: DbContext = db,
  options?: { excludeTransactionId?: string | null },
): number {
  const conditions = [
    eq(transactions.accountId, accountId),
    isNull(transactions.deletedAt),
  ];
  if (options?.excludeTransactionId) {
    conditions.push(ne(transactions.id, options.excludeTransactionId));
  }

  const row = context
    .select({
      delta: sql<number>`coalesce(sum(${transactions.amountMinorUnits}), 0)`.as("delta"),
    })
    .from(transactions)
    .where(and(...conditions))
    .get();

  return Number(row?.delta) || 0;
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

export function hasTransactionsForPocket(
  pocketId: string,
  context: DbContext = db,
): boolean {
  return Boolean(
    context
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.pocketId, pocketId))
      .limit(1)
      .get(),
  );
}

export function getPocketIdsWithTransactions(
  context: DbContext = db,
): Set<string> {
  const rows = context
    .selectDistinct({ pocketId: transactions.pocketId })
    .from(transactions)
    .where(isNotNull(transactions.pocketId))
    .all();
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.pocketId) ids.add(row.pocketId);
  }
  return ids;
}

export function findCategoryBreakdownRows(
  query: { type: "expense" | "income"; startDate: Date; endDate: Date },
  context: DbContext = db,
) {
  return context
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
}

export function findAccountBalanceDeltaRows(
  context: DbContext = db,
): Array<{ accountId: string; delta: number }> {
  return context
    .select({
      accountId: transactions.accountId,
      delta: sql<number>`coalesce(sum(${transactions.amountMinorUnits}), 0)`.as("delta"),
    })
    .from(transactions)
    .where(isNull(transactions.deletedAt))
    .groupBy(transactions.accountId)
    .all();
}

export function findAccountTransactionDeltasUpToDate(
  maxCutoffDate: Date,
  context: DbContext = db,
): Array<{ accountId: string; amountMinorUnits: number; occurredAt: Date }> {
  return context
    .select({
      accountId: transactions.accountId,
      amountMinorUnits: transactions.amountMinorUnits,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(
      and(
        isNull(transactions.deletedAt),
        lte(transactions.occurredAt, maxCutoffDate),
      ),
    )
    .orderBy(asc(transactions.occurredAt))
    .all();
}

export function findPocketTransactionDeltaRows(
  context: DbContext = db,
): Array<{ pocketId: string | null; amountMinorUnits: number }> {
  return context
    .select({
      pocketId: transactions.pocketId,
      amountMinorUnits: transactions.amountMinorUnits,
    })
    .from(transactions)
    .where(and(isNotNull(transactions.pocketId), isNull(transactions.deletedAt)))
    .all();
}

export function findPocketTransactionDeltasWithOccurredAt(
  context: DbContext = db,
): Array<{ pocketId: string | null; amountMinorUnits: number; occurredAt: Date }> {
  return context
    .select({
      pocketId: transactions.pocketId,
      amountMinorUnits: transactions.amountMinorUnits,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(and(isNotNull(transactions.pocketId), isNull(transactions.deletedAt)))
    .all();
}

export function findCashFlowHistoryRows(
  startDate: Date,
  endDate: Date,
  context: DbContext = db,
) {
  return context
    .select({
      type: transactions.type,
      amountMinorUnits: transactions.amountMinorUnits,
      occurredAt: transactions.occurredAt,
      accountCurrencyCode: accounts.currencyCode,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        isNull(transactions.deletedAt),
        gte(transactions.occurredAt, startDate),
        lte(transactions.occurredAt, endDate),
      ),
    )
    .all();
}

export function findLabelBreakdownRows(
  query: { type: "expense" | "income"; startDate: Date; endDate: Date },
  context: DbContext = db,
) {
  return context
    .select({
      transaction: transactions,
      accountCurrencyCode: accounts.currencyCode,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
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

export function findMerchantHistoryTransactions(
  cleanName: string,
  limit: number = 50,
  context: DbContext = db,
) {
  return context
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      amountMinorUnits: transactions.amountMinorUnits,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(
      and(
        sql`lower(${transactions.name}) = ${cleanName}`,
        isNull(transactions.deletedAt),
      ),
    )
    .orderBy(desc(transactions.occurredAt))
    .limit(limit)
    .all();
}

export function findRecentDuplicateTransactions(
  targetAmount: number,
  sinceDate: Date,
  cleanName?: string | null,
  limit: number = 5,
  context: DbContext = db,
): Array<{ id: string; occurredAt: Date }> {
  const conditions = [
    sql`abs(${transactions.amountMinorUnits}) = ${targetAmount}`,
    gte(transactions.occurredAt, sinceDate),
    isNull(transactions.deletedAt),
  ];

  if (cleanName) {
    conditions.push(sql`lower(${transactions.name}) = ${cleanName}`);
  }

  return context
    .select({
      id: transactions.id,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredAt))
    .limit(limit)
    .all();
}

export interface SearchTransactionRow {
  id: string;
  name: string | null;
  note: string | null;
  categoryName: string | null;
  occurredAt: Date;
  amountMinorUnits: number;
  currencyCode: string;
  type: string;
}

function searchCanonicalTransferCondition(): SQL {
  return sql`NOT (
    "transactions"."type" = 'transfer'
    AND "transactions"."transaction_group_id" IS NOT NULL
    AND (
      SELECT count(*) FROM transactions g
      WHERE g.deleted_at IS NULL
        AND g.type = 'transfer'
        AND g.transaction_group_id = "transactions"."transaction_group_id"
    ) = 2
    AND EXISTS (
      SELECT 1 FROM transactions other_leg
      WHERE other_leg.deleted_at IS NULL
        AND other_leg.type = 'transfer'
        AND other_leg.transaction_group_id = "transactions"."transaction_group_id"
        AND other_leg.id != "transactions"."id"
        AND (
          (other_leg.amount_minor_units < 0 AND "transactions"."amount_minor_units" >= 0)
          OR (
            ((other_leg.amount_minor_units < 0) = ("transactions"."amount_minor_units" < 0))
            AND other_leg.id < "transactions"."id"
          )
        )
    )
  )`;
}

export function findSearchTransactionsRows(
  term: string,
  limit: number = 20,
  context: DbContext = db,
): SearchTransactionRow[] {
  return context
    .select({
      id: transactions.id,
      name: transactions.name,
      note: transactions.note,
      categoryName: sql<string | null>`coalesce(
        ${categories.name},
        (
          SELECT sc.name
          FROM transaction_entries se
          INNER JOIN categories sc ON sc.id = se.category_id
          WHERE se.transaction_id = "transactions"."id"
            AND (
              lower(sc.name) LIKE ${term} ESCAPE '\\'
              OR lower(coalesce(se.note, '')) LIKE ${term} ESCAPE '\\'
            )
          ORDER BY se.created_at ASC, se.id ASC
          LIMIT 1
        ),
        (
          SELECT sc.name
          FROM transaction_entries se
          INNER JOIN categories sc ON sc.id = se.category_id
          WHERE se.transaction_id = "transactions"."id"
          ORDER BY se.created_at ASC, se.id ASC
          LIMIT 1
        )
      )`,
      occurredAt: transactions.occurredAt,
      amountMinorUnits: transactions.amountMinorUnits,
      currencyCode: sql<string>`coalesce(${accounts.currencyCode}, ${transactions.currencyCode})`,
      type: transactions.type,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        isNull(transactions.deletedAt),
        searchCanonicalTransferCondition(),
        sql`(
          lower(coalesce("transactions"."name", '')) LIKE ${term} ESCAPE '\\'
          OR lower(coalesce("transactions"."note", '')) LIKE ${term} ESCAPE '\\'
          OR lower(coalesce(${categories.name}, '')) LIKE ${term} ESCAPE '\\'
          OR EXISTS (
            SELECT 1
            FROM transaction_entries se
            INNER JOIN categories sc ON sc.id = se.category_id
            WHERE se.transaction_id = "transactions"."id"
              AND (
                lower(sc.name) LIKE ${term} ESCAPE '\\'
                OR lower(coalesce(se.note, '')) LIKE ${term} ESCAPE '\\'
              )
          )
        )`,
      ),
    )
    .orderBy(desc(transactions.occurredAt))
    .limit(limit)
    .all();
}
