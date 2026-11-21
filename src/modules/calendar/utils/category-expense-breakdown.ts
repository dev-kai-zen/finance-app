import type { Category } from "@/modules/categories";
import type { TransactionListItem } from "@/modules/transactions";
import type { CategoryExpenseBreakdown } from "../types/calendar.types";

/** Builds the Net tab breakdown from the already scoped, hydrated month rows. */
export function buildCategoryExpenseBreakdown(
  transactions: TransactionListItem[],
  categories: Category[],
  convert: (amount: number, currency: string) => number,
): CategoryExpenseBreakdown[] {
  const categoryMap = new Map<string, Category>();
  function indexCategories(items: Category[]) {
    for (const category of items) {
      categoryMap.set(category.id, category);
      if (category.subcategories) indexCategories(category.subcategories);
    }
  }
  indexCategories(categories);

  const totals = new Map<string, number>();
  let overall = 0;
  function add(categoryId: string | null, amount: number, currency: string) {
    const id = categoryId ?? "uncategorized";
    const converted = Math.abs(convert(amount, currency));
    totals.set(id, (totals.get(id) ?? 0) + converted);
    overall += converted;
  }
  for (const transaction of transactions) {
    if (transaction.type !== "expense" || transaction.deletedAt) continue;
    if (transaction.isSplit && transaction.splitEntries?.length) {
      for (const entry of transaction.splitEntries) {
        add(entry.categoryId, entry.amountMinorUnits, transaction.accountCurrency);
      }
    } else {
      add(transaction.categoryId, transaction.amountMinorUnits, transaction.accountCurrency);
    }
  }

  return Array.from(totals, ([id, total]) => {
    const category = categoryMap.get(id);
    return {
      id,
      name: category?.name ?? "Other",
      icon: category?.icon ?? null,
      color: category?.color ?? null,
      totalMinorUnits: total,
      percentage: overall > 0 ? Math.round(total / overall * 100) : 0,
    };
  }).sort((a, b) => b.totalMinorUnits - a.totalMinorUnits);
}
