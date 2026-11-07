import type { DateFormatPattern, KaizenFieldKey, ValueFormatKind } from "../types/data-import.types";

export type { DateFormatPattern };

export const MAX_IMPORT_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_IMPORT_DATA_ROWS = 1000;

export const LIMITS = {
  accountName: 100,
  categoryName: 50,
  description: 200,
  note: 1000,
  label: 100,
  sourceName: 100,
} as const;

export const DEFAULT_SOURCE_NAME = "CSV";

export const MIN_VALID_YEAR = 1900;
export const MAX_VALID_YEAR = 2200;

export interface FieldDefinition {
  key: KaizenFieldKey;
  labelKey: string;
  defaultLabel: string;
  format: ValueFormatKind;
  required: boolean;
  isAdvanced?: boolean;
}

export const TRANSACTION_FIELDS: FieldDefinition[] = [
  { key: "date", labelKey: "dataImport.fields.date", defaultLabel: "Date", format: "Date", required: true },
  { key: "amount", labelKey: "dataImport.fields.amount", defaultLabel: "Amount", format: "Number", required: true },
  { key: "money_out", labelKey: "dataImport.fields.moneyOut", defaultLabel: "Money out (Debit)", format: "Number", required: false },
  { key: "money_in", labelKey: "dataImport.fields.moneyIn", defaultLabel: "Money in (Credit)", format: "Number", required: false },
  { key: "account", labelKey: "dataImport.fields.account", defaultLabel: "Account", format: "Text", required: true },
  { key: "category", labelKey: "dataImport.fields.category", defaultLabel: "Category", format: "Text", required: false },
  { key: "type", labelKey: "dataImport.fields.type", defaultLabel: "Transaction type", format: "Text", required: false },
  { key: "name", labelKey: "dataImport.fields.name", defaultLabel: "Name / Payee", format: "Text", required: false },
  { key: "currency", labelKey: "dataImport.fields.currency", defaultLabel: "Currency code", format: "Currency code", required: false },
  { key: "to_account", labelKey: "dataImport.fields.toAccount", defaultLabel: "Destination account", format: "Text", required: false },
  { key: "time", labelKey: "dataImport.fields.time", defaultLabel: "Time", format: "Time", required: false, isAdvanced: true },
  { key: "note", labelKey: "dataImport.fields.note", defaultLabel: "Note", format: "Text", required: false, isAdvanced: true },
  { key: "labels", labelKey: "dataImport.fields.labels", defaultLabel: "Labels", format: "Text", required: false, isAdvanced: true },
  { key: "subcategory", labelKey: "dataImport.fields.subcategory", defaultLabel: "Subcategory", format: "Text", required: false, isAdvanced: true },
  { key: "source_id", labelKey: "dataImport.fields.sourceId", defaultLabel: "Original record ID", format: "Text", required: false, isAdvanced: true },
];

export const ACCOUNT_FIELDS: FieldDefinition[] = [
  { key: "account", labelKey: "dataImport.fields.account", defaultLabel: "Account name", format: "Text", required: true },
  { key: "account_type", labelKey: "dataImport.fields.accountType", defaultLabel: "Account type", format: "Text", required: false },
  { key: "currency", labelKey: "dataImport.fields.currency", defaultLabel: "Currency code", format: "Currency code", required: false },
  { key: "opening_balance", labelKey: "dataImport.fields.openingBalance", defaultLabel: "Opening balance", format: "Number", required: false },
  { key: "balance_date", labelKey: "dataImport.fields.balanceDate", defaultLabel: "Balance date", format: "Date", required: false },
  { key: "note", labelKey: "dataImport.fields.note", defaultLabel: "Note", format: "Text", required: false, isAdvanced: true },
];

export const HEADER_ALIASES: Record<KaizenFieldKey, string[]> = {
  date: ["date", "transaction date", "occurred at"],
  time: ["time"],
  amount: ["amount"],
  money_out: ["debit", "withdrawal", "money out", "spent"],
  money_in: ["credit", "deposit", "money in", "received"],
  type: ["type", "transaction type"],
  account: ["account", "account name", "from account"],
  to_account: ["to account", "transfer account", "destination account"],
  currency: ["currency", "currency code"],
  category: ["category"],
  subcategory: ["subcategory", "sub category"],
  name: ["name", "description", "payee"],
  note: ["note", "notes", "memo"],
  labels: ["labels", "tags"],
  source_id: ["source id", "transaction id", "id"],
  account_type: ["account type"],
  opening_balance: ["opening balance", "starting balance"],
  balance_date: ["balance date", "opening date"],
};

export const UNSUPPORTED_COLUMN_NAMES = new Set([
  "pocket",
  "transfer pocket",
  "transfer fee",
  "fee account",
  "original amount",
  "original currency",
  "exchange rate",
  "split",
  "split entries",
  "installment",
  "installments",
  "schedule",
  "recurring",
]);

