import { db, type DbContext } from "@/infrastructure/database/client";
import { reassignTransactionCategoryRecords } from "../repositories/transactions.repository";
import { reassignTransactionSplitEntriesCategoryRecords } from "../repositories/transaction-entries.repository";
import { reassignTransactionPresetCategoryRecords } from "../repositories/transaction-presets.repository";

export function reassignTransactionCategoryReferences(
  fromCategoryId: string,
  toCategoryId: string,
  context: DbContext = db,
): void {
  reassignTransactionCategoryRecords(fromCategoryId, toCategoryId, context);
  reassignTransactionSplitEntriesCategoryRecords(
    fromCategoryId,
    toCategoryId,
    context,
  );
  reassignTransactionPresetCategoryRecords(
    fromCategoryId,
    toCategoryId,
    context,
  );
}
