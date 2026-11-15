import type { CsvDocument, ImportCatalog, ImportField, ImportOptions, ImportPreviewRow, ImportReviewGroup } from "../types/import.types";
import { applyImportEdits, cellValue } from "./import-preview";
import { normalizeImportName, parseImportDate } from "./csv";

export function formatImportDate(date: Date, format: ImportOptions["dateFormat"]): string {
  const year = String(date.getFullYear()), month = String(date.getMonth() + 1).padStart(2, "0"), day = String(date.getDate()).padStart(2, "0");
  return format === "ymd" ? `${year}-${month}-${day}` : format === "dmy" ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
}
export function importReviewGroup(row: ImportPreviewRow): ImportReviewGroup {
  return row.skip || row.repeated ? "excluded" : row.issue ? "attention" : "ready";
}
export function reviewGroupCounts(rows: ImportPreviewRow[]): Record<ImportReviewGroup, number> {
  const counts = { attention: 0, excluded: 0, ready: 0 };
  for (const row of rows) if (!row.secondary) counts[importReviewGroup(row)]++;
  return counts;
}
export function importAccountName(sourceName: string, options: ImportOptions, catalog?: ImportCatalog): string {
  const key = normalizeImportName(sourceName);
  const mapping = Object.hasOwn(options.accounts, key) ? options.accounts[key] : undefined;
  return (mapping?.existingId ? catalog?.accounts.find((account) => account.id === mapping.existingId)?.name : mapping?.name) || sourceName;
}
export function filterReviewRows(rows: ImportPreviewRow[], group: ImportReviewGroup, query: string, options?: ImportOptions, catalog?: ImportCatalog) {
  const normalized = query.trim().normalize("NFKC").toLocaleLowerCase();
  const byNumber = new Map(rows.map((row) => [row.number, row]));
  return rows.filter((row) => {
    if (row.secondary || importReviewGroup(row) !== group) return false;
    if (!normalized) return true;
    const other = row.companion ? byNumber.get(row.companion) : undefined;
    const account = options ? importAccountName(row.transaction?.accountKey || cellValue(row.cells, options, "account") || options.defaultAccount, options, catalog) : "";
    const to = options ? importAccountName(row.transaction?.toAccountKey || cellValue(row.cells, options, "toAccount"), options, catalog) : "";
    return `${row.number} ${row.cells.join(" ")} ${account} ${to} ${row.transaction?.type ?? ""} ${other?.number ?? ""} ${other?.cells.join(" ") ?? ""}`.normalize("NFKC").toLocaleLowerCase().includes(normalized);
  });
}
export function importDateValidation(document: CsvDocument, options: ImportOptions) {
  const field = options.kind === "accounts" ? "balanceDate" : "date";
  if (options.columns[field] === undefined) return { original: "", interpreted: null, invalid: 0, checked: 0 };
  let original = "", interpreted: Date | null = null, invalid = 0, checked = 0;
  for (const row of applyImportEdits(document, options).rows) {
    const value = cellValue(row.cells, options, field);
    if (!original && value) original = value;
    checked++;
    try { const parsed = parseImportDate(value, options.dateFormat); if (value === original && !interpreted) interpreted = parsed; }
    catch { invalid++; }
  }
  return { original, interpreted, invalid, checked };
}
export function importFieldRequired(field: ImportField, options: ImportOptions): boolean {
  if (field === "account") return !options.defaultAccount.trim();
  if (options.kind !== "transactions") return false;
  if (field === "date") return true;
  if (field === "amount") return options.amountLayout !== "separate";
  if (field === "debit") return options.columns.credit === undefined;
  if (field === "credit") return options.columns.debit === undefined;
  return field === "toAccount" && options.transferMode === "single";
}
