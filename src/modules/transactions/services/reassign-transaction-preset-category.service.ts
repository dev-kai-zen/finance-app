import { db, type DbContext } from "@/infrastructure/database/client";
import { reassignTransactionPresetCategoryRecords } from "../repositories/transaction-presets.repository";

export function reassignTransactionPresetCategory(
  fromCategoryId: string,
  toCategoryId: string,
  context: DbContext = db,
): void {
  reassignTransactionPresetCategoryRecords(
    fromCategoryId,
    toCategoryId,
    context,
  );
}
