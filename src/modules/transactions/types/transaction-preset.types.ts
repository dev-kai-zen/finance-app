import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { transactionPresets } from "@/infrastructure/database/schema";

export type TransactionPreset = InferSelectModel<typeof transactionPresets>;
export type NewTransactionPreset = InferInsertModel<typeof transactionPresets>;

export interface TransactionPresetInput {
  transactionName: string;
  type: TransactionPreset["type"];
  accountId: string;
  pocketId?: string | null;
  categoryId?: string | null;
  toAccountId?: string | null;
  toPocketId?: string | null;
  amountCents?: number | null;
  note?: string | null;
}

export interface QuickPresetSaveRequest {
  includeAmount: boolean;
  existingPresetId?: string | null;
}

export interface TransactionPresetSubmission {
  saveRequest?: QuickPresetSaveRequest | null;
  appliedPresetId?: string | null;
}

export type PresetSortBy = "sort_order" | "last_used_at";

export interface ListPresetsOptions {
  sortBy?: PresetSortBy;
}
