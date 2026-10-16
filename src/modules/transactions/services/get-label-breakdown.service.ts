import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db, type DbContext } from "@/infrastructure/database/client";
import { accounts, transactions } from "@/infrastructure/database/schema";
import { getCurrencyPreferences, getExchangeRateMap } from "@/modules/currencies";
import { getLabelsByTransactionIds, type Label } from "@/modules/labels";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";

export interface LabelBreakdownQuery {
  type: "expense" | "income";
  startDate: Date;
  endDate: Date;
}

export interface LabelBreakdownItem {
  labelId: string;
  labelName: string;
  labelColor: string | null;
  totalMinorUnits: number;
  percentage: number;
  transactionCount: number;
}

export interface LabelBreakdownResult {
  type: "expense" | "income";
  startDate: Date;
  endDate: Date;
  totalMinorUnits: number;
  labeledMinorUnits: number;
  unlabeledMinorUnits: number;
  transactionCount: number;
  labeledTransactionCount: number;
  unlabeledTransactionCount: number;
  items: LabelBreakdownItem[];
}

export function getLabelBreakdown(
  query: LabelBreakdownQuery,
  context: DbContext = db,
): LabelBreakdownResult {
  const rows = context
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

  const txIds = rows.map((r) => r.transaction.id);
  const labelMapByTxId = new Map<string, Label[]>();
  const CHUNK_SIZE = 500;
  for (let i = 0; i < txIds.length; i += CHUNK_SIZE) {
    const chunk = txIds.slice(i, i + CHUNK_SIZE);
    const chunkMap = getLabelsByTransactionIds(chunk, context);
    for (const [txId, lbls] of chunkMap.entries()) {
      labelMapByTxId.set(txId, lbls);
    }
  }

  const map = new Map<
    string,
    {
      id: string;
      name: string;
      color: string | null;
      total: number;
      count: number;
    }
  >();

  let overallTotal = 0;
  let overallTxCount = 0;
  let labeledTotal = 0;
  let labeledTxCount = 0;
  let unlabeledTotal = 0;
  let unlabeledTxCount = 0;

  const homeCurrency = getCurrencyPreferences(context).defaultCurrency;
  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, context);

  const addToMap = (
    labelId: string,
    labelName: string,
    labelColor: string | null,
    amount: number,
    countDelta: number,
  ) => {
    const existing = map.get(labelId);
    if (existing) {
      existing.total += amount;
      existing.count += countDelta;
    } else {
      map.set(labelId, {
        id: labelId,
        name: labelName,
        color: labelColor,
        total: amount,
        count: countDelta,
      });
    }
  };

  for (const { transaction: tx, accountCurrencyCode } of rows) {
    const amount = convertCurrencyMinorUnits(
      Math.abs(tx.amountMinorUnits),
      accountCurrencyCode,
      homeCurrency,
      ratesMap,
      DEFAULT_BASE_CURRENCY,
    );

    overallTotal += amount;
    overallTxCount += 1;

    const txLabels = labelMapByTxId.get(tx.id) ?? [];
    if (txLabels.length === 0) {
      unlabeledTotal += amount;
      unlabeledTxCount += 1;
      addToMap("unlabeled", "Unlabeled", null, amount, 1);
    } else {
      labeledTotal += amount;
      labeledTxCount += 1;
      for (const label of txLabels) {
        addToMap(label.id, label.name, label.color, amount, 1);
      }
    }
  }

  const items: LabelBreakdownItem[] = [];

  for (const [, data] of map.entries()) {
    const percentage =
      overallTotal > 0 ? (data.total / overallTotal) * 100 : 0;

    items.push({
      labelId: data.id,
      labelName: data.name,
      labelColor: data.color,
      totalMinorUnits: data.total,
      percentage: Number(percentage.toFixed(1)),
      transactionCount: data.count,
    });
  }

  // Sort descending by total amount, then transaction count
  items.sort((a, b) => {
    if (b.totalMinorUnits !== a.totalMinorUnits) {
      return b.totalMinorUnits - a.totalMinorUnits;
    }
    return b.transactionCount - a.transactionCount;
  });

  return {
    type: query.type,
    startDate: query.startDate,
    endDate: query.endDate,
    totalMinorUnits: overallTotal,
    labeledMinorUnits: labeledTotal,
    unlabeledMinorUnits: unlabeledTotal,
    transactionCount: overallTxCount,
    labeledTransactionCount: labeledTxCount,
    unlabeledTransactionCount: unlabeledTxCount,
    items,
  };
}
