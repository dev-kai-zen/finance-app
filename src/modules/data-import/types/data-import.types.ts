import type { AccountListItem, AccountType } from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import type { CurrencyListItem } from "@/modules/currencies";

export type ImportType = "transactions" | "accounts";

export type KaizenFieldKey =
  | "date"
  | "time"
  | "amount"
  | "money_out"
  | "money_in"
  | "type"
  | "account"
  | "to_account"
  | "currency"
  | "category"
  | "subcategory"
  | "name"
  | "note"
  | "labels"
  | "source_id"
  | "account_type"
  | "opening_balance"
  | "balance_date";

export type ValueFormatKind =
  | "Date"
  | "Number"
  | "Time"
  | "Text"
  | "Currency code";

export type DateFormatPattern =
  | "YYYY-MM-DD"
  | "DD/MM/YYYY"
  | "MM/DD/YYYY"
  | "DD.MM.YYYY"
  | "YYYY.MM.DD"
  | "YYYY/MM/DD"
  | "DD-MM-YYYY"
  | "MM-DD-YYYY"
  | "auto";

export type NumberFormatType = "comma_decimal" | "dot_decimal" | "auto";

export type AmountLayout = "single" | "separate";

export type TransferStyle = "single_row" | "paired_rows";

export type NormalizedTransactionType = "income" | "expense" | "transfer" | "leave_out";

export interface ColumnMappingConfig {
  dateColumn?: string;
  timeColumn?: string;
  amountColumn?: string;
  moneyOutColumn?: string;
  moneyInColumn?: string;
  typeColumn?: string;
  accountColumn?: string;
  toAccountColumn?: string;
  currencyColumn?: string;
  categoryColumn?: string;
  subcategoryColumn?: string;
  nameColumn?: string;
  noteColumn?: string;
  labelsColumn?: string;
  sourceIdColumn?: string;
  accountTypeColumn?: string;
  openingBalanceColumn?: string;
  balanceDateColumn?: string;

  // Single file-wide fallbacks
  defaultAccountName?: string;
  defaultCurrencyCode?: string;

  // Format selections
  dateFormat: DateFormatPattern;
  numberFormat: NumberFormatType;
  amountLayout: AmountLayout;
  transferStyle: TransferStyle;

  // Type mappings for values found in typeColumn
  typeMap: Record<string, NormalizedTransactionType>;

  // Source reminder
  sourceName: string; // Defaults to "CSV", max 100 chars
}

export interface ParsedCsvFile {
  fileName: string;
  fileSizeBytes: number;
  delimiter: string;
  headers: string[];
  rawRows: string[][];
  fileHash: string;
}

export interface AccountMatchDecision {
  sourceName: string;
  mode: "existing" | "new";
  existingAccountId?: string;
  newAccount?: {
    name: string;
    accountTypeId: string;
    currencyCode: string;
    openingBalanceMinorUnits: number;
    balanceDate: Date;
    note?: string;
  };
}

export interface CategoryMatchDecision {
  sourceKey: string; // e.g. "Food" or "Food > Groceries" or type:name
  type: "income" | "expense";
  mode: "existing" | "new" | "default_other";
  existingCategoryId?: string;
  newCategory?: {
    name: string;
    type: "income" | "expense";
    parentId?: string | null;
  };
}

export type RowStatus = "ready" | "needs_attention" | "left_out";

export interface ParsedDataRow {
  rowNumber: number; // 1-based index in data rows
  rawValues: Record<string, string>;
  originalId?: string;
  sourceIdentity: string;

  // Resolved fields
  date?: Date;
  time?: string;
  type?: NormalizedTransactionType;
  amountMinorUnits?: number; // Signed for single, or positive for transfer
  currencyCode?: string;
  accountName?: string;
  accountId?: string;
  toAccountName?: string;
  toAccountId?: string;
  categoryName?: string;
  subcategoryName?: string;
  categoryId?: string;
  description?: string;
  note?: string;
  labels?: string[];

  // For accounts-only
  accountType?: string;
  openingBalanceMinorUnits?: number;
  balanceDate?: Date;

  // Transfer pairing
  pairedRowNumber?: number;

  // Review & Validation state
  status: RowStatus;
  userExcluded: boolean;
  issues: string[]; // plain-language problems
  fixAction?: string; // plain-language suggestion to fix
  isSimilarExisting?: boolean; // Similar purchase warning
  userConfirmedSimilar?: boolean;
}

export interface ImportPreviewSummary {
  importType: ImportType;
  totalDataRows: number;
  readyCount: number;
  needsAttentionCount: number;
  leftOutCount: number;
  totalIncomeMinorUnits: number;
  totalExpenseMinorUnits: number;
  accountBalanceDeltas: Record<string, number>; // accountId -> delta in minor units
  earliestDate?: Date;
  latestDate?: Date;
  canImport: boolean;
}

export interface ImportBatchRecord {
  id: string;
  fileName: string;
  importType: ImportType;
  sourceName: string;
  importedCount: number;
  leftOutCount: number;
  summary: {
    totalIncomeMinorUnits?: number;
    totalExpenseMinorUnits?: number;
    accountBalances?: Array<{
      accountName: string;
      currencyCode: string;
      balanceBeforeMinorUnits: number;
      balanceAfterMinorUnits: number;
    }>;
    dateRange?: {
      earliest: string;
      latest: string;
    };
    leftOutRows?: Array<{
      rowNumber: number;
      reason: string;
    }>;
  };
  createdAt: Date;
}

export interface ExecuteImportResult {
  batchId: string;
  importedCount: number;
  leftOutCount: number;
  summary: ImportPreviewSummary;
  createdAccountIds: string[];
  createdCategoryIds: string[];
  createdTransactionIds: string[];
}

