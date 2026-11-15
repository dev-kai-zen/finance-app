import type { AccountListItem, AccountType } from "@/modules/accounts";
import type { Category } from "@/modules/categories";

export type ImportKind = "accounts" | "transactions";
export type ImportTransactionType = "expense" | "income" | "transfer";
export type ImportReviewGroup = "attention" | "excluded" | "ready";
export type ImportStep = "file" | "columns" | "matching" | "categories" | "review" | "done" | "history";
export type ImportField = "date" | "time" | "amount" | "debit" | "credit" | "type" | "account" | "toAccount" | "currency" | "category" | "subcategory" | "name" | "note" | "labels" | "sourceId" | "accountType" | "openingBalance" | "balanceDate";
export type ImportIssue = "columns" | "date" | "amount" | "account" | "category" | "currency" | "unsupported" | "transfer" | "balance" | "name" | "duplicate" | "type";
export interface CsvDocument { headers: string[]; rows: { number: number; cells: string[] }[] }
export interface AccountMapping {
  existingId: string;
  name: string;
  accountTypeId: string;
  currency: string;
  openingBalance: string;
  balanceDate: string;
  note?: string;
}
export interface ImportOptions {
  kind: ImportKind;
  source: string;
  columns: Partial<Record<ImportField, number>>;
  dateFormat: "ymd" | "dmy" | "mdy";
  decimal: "." | ",";
  defaultCurrency: string;
  defaultAccount: string;
  transferMode: "single" | "paired";
  amountLayout?: "single" | "separate";
  accounts: Record<string, AccountMapping>;
  categories: Record<string, string>;
  decisions: Record<number, "skip" | "import">;
  rowEdits?: Record<number, string[]>;
  typeMappings?: Record<string, ImportTransactionType | "exclude">;
  rowTypes?: Record<number, ImportTransactionType>;
}
export interface ImportAccount {
  id: string; name: string; accountTypeId: string; currencyCode: string;
  openingBalanceMinorUnits: number; openingBalanceAt: Date; currentBalanceMinorUnits: number;
  isArchived: boolean; creditCard: boolean;
}
export interface ImportCategory { id: string; name: string; type: string; parentId: string | null }
export interface ImportCatalog {
  pickerAccounts?: AccountListItem[];
  pickerAccountTypes?: AccountType[];
  pickerCategories?: Category[];
  fallbackCategoryIds?: Record<"expense" | "income", string>;
  categoryKeywordsMap?: Map<string, string>;
  accounts: ImportAccount[];
  accountTypes: { id: string; name: string; creditCard: boolean }[];
  categories: ImportCategory[];
  currencies: string[];
  fingerprints: string[];
  sourceKeys: string[];
}
export interface PlannedAccount {
  key: string; id: string | null; name: string; accountTypeId: string; currency: string;
  openingBalance: number; balanceDate: Date; currentBalance: number; note?: string;
}
export interface PlannedTransaction {
  type: "income" | "expense" | "transfer";
  accountKey: string; toAccountKey?: string; categoryKey?: string;
  categoryName?: string; parentName?: string; categoryId?: string;
  amount: number; currency: string; date: Date; name: string; note: string; labels: string[];
}
export interface ImportPreviewRow {
  number: number; cells: string[]; issue?: ImportIssue; skip: boolean; duplicate: boolean;
  repeated: boolean; companion?: number; secondary?: boolean; sourceKey: string; transaction?: PlannedTransaction;
}
export interface ImportPreview {
  rows: ImportPreviewRow[];
  accounts: PlannedAccount[];
  balances: { key: string; name: string; currency: string; before: number; after: number }[];
  ready: boolean; accepted: number; skipped: number; errors: number;
  income: Record<string, number>; expense: Record<string, number>;
  dateFrom?: Date; dateTo?: Date; signature: string;
}
export const IMPORT_FIELDS: ImportField[] = ["date", "time", "amount", "debit", "credit", "type", "account", "toAccount", "currency", "category", "subcategory", "name", "note", "labels", "sourceId", "accountType", "openingBalance", "balanceDate"];
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 1000;
