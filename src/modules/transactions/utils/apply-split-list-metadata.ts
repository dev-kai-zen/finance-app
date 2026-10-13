import type { DbContext } from "@/infrastructure/database/client";
import { findSplitEntriesByTransactionIds } from "../repositories/transaction-entries.repository";
import type { TransactionListItem } from "../types/transaction.types";
import { formatSplitCategorySummary } from "./split-transaction-rules";

export function applySplitListMetadata(
  items: TransactionListItem[],
  context: DbContext,
): TransactionListItem[] {
  if (items.length === 0) {
    return items;
  }

  const splitMap = findSplitEntriesByTransactionIds(
    items.map((item) => item.id),
    context,
  );

  return items.map((item) => {
    const entries = splitMap.get(item.id);
    if (!entries || entries.length < 2) {
      return item;
    }

    const labels = entries
      .map((entry) => entry.categoryName)
      .filter((name): name is string => Boolean(name));

    return {
      ...item,
      isSplit: true,
      splitEntries: entries,
      categoryId: null,
      categoryName: formatSplitCategorySummary(labels),
      categoryIcon: "split",
      categoryColor: entries[0]?.categoryColor ?? item.categoryColor,
    };
  });
}
