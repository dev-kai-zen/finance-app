import type { DbContext } from "@/infrastructure/database/client";
import { requireCategory } from "@/modules/categories";
import { replaceSplitEntries } from "../repositories/transaction-entries.repository";
import type { SplitEntryInput } from "../utils/split-transaction-rules";
import { assertSplitEntriesValid } from "../utils/split-transaction-rules";
import type { TransactionType } from "../types/transaction.types";

export function syncTransactionSplitEntriesInContext(
  transactionId: string,
  parentAmountMinorUnits: number,
  type: TransactionType,
  entries: SplitEntryInput[] | null | undefined,
  context: DbContext,
): void {
  if (entries == null || entries.length === 0) {
    replaceSplitEntries(transactionId, [], context);
    return;
  }

  assertSplitEntriesValid(parentAmountMinorUnits, type, entries);

  for (const entry of entries) {
    const category = requireCategory(entry.categoryId, context);
    if (category.type !== type) {
      throw new Error(
        `Category "${category.name}" does not match the transaction type.`,
      );
    }
  }

  replaceSplitEntries(transactionId, entries, context);
}
