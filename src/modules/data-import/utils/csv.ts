import { getCurrencyMinorUnitExponent } from "@/utils/currency";
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, type CsvDocument, type ImportField, type ImportOptions } from "../types/import.types";
import { runImportWork, type ImportWorkOptions } from "./import-work";

export class ImportValidationError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export function parseCsv(input: string, separator?: string): CsvDocument {
  const work = parseCsvWork(input, separator);
  let result = work.next();
  while (!result.done) result = work.next();
  return result.value;
}

export function parseCsvAsync(input: string, separator?: string, workOptions?: ImportWorkOptions): Promise<CsvDocument> {
  return runImportWork(parseCsvWork(input, separator), workOptions);
}

function* parseCsvWork(input: string, separator?: string): Generator<void, CsvDocument> {
  if (new TextEncoder().encode(input).length > MAX_IMPORT_BYTES) throw new ImportValidationError("fileSize");
  const text = input.replace(/^\uFEFF/, "");
  if (text.includes("\u0000") || text.includes("\uFFFD")) throw new ImportValidationError("encoding");
  // Count only separators outside quoted fields on the header record.
  let quoted = false;
  const counts = new Map([[",", 0], [";", 0], ["\t", 0]]);
  for (let i = 0; i < text.length; i++) {
    if (i % 2048 === 0) yield;
    if (text[i] === '"') {
      if (quoted && text[i + 1] === '"') { i++; continue; }
      quoted = !quoted;
    }
    if (!quoted && /[\r\n]/.test(text[i])) break;
    if (!quoted && counts.has(text[i])) counts.set(text[i], counts.get(text[i])! + 1);
  }
  const delimiter = separator ?? [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const records: CsvDocument["rows"] = [];
  let cells: string[] = [], cell = "", inQuote = false, closed = false, line = 1, start = 1;
  const endRecord = () => {
    cells.push(cell);
    if (cells.some((value) => value.trim())) records.push({ number: start, cells });
    cells = []; cell = ""; closed = false;
    if (records.length > MAX_IMPORT_ROWS + 1) throw new ImportValidationError("rowLimit");
  };
  for (let i = 0; i < text.length; i++) {
    if (i % 2048 === 0) yield;
    const char = text[i];
    if (inQuote) {
      if (char === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuote = false; closed = true; }
      } else { cell += char; if (char === "\n") line++; }
    } else if (char === '"') {
      if (cell.trim() || closed) throw new ImportValidationError("csv");
      cell = ""; inQuote = true;
    } else if (char === delimiter) {
      cells.push(cell); cell = ""; closed = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      endRecord(); line++; start = line;
    } else {
      if (closed && char.trim()) throw new ImportValidationError("csv");
      if (!closed) cell += char;
    }
  }
  if (inQuote) throw new ImportValidationError("csv");
  endRecord();
  const headers = records.shift()?.cells.map((value) => value.trim()) ?? [];
  if (!headers.length || !records.length || headers.some((h) => !h) || new Set(headers.map((h) => h.toLowerCase())).size !== headers.length) throw new ImportValidationError("headers");
  const encodedTransactions = isAppTransactionHeaders(headers, true);
  for (const row of records) {
    yield;
    const decodeText = encodedTransactions && row.cells[19]?.trim() === "apostrophe-v1";
    row.cells = row.cells.map((value, index) => {
      if (decodeText && APP_TRANSACTION_TEXT_COLUMNS.has(index)) {
        // Preserve whitespace inside protected text; legacy files retain their old trimming behavior.
        return value.startsWith("'") &&
          (value[1] === "'" || /^[\s\x00-\x1f]*[=+@-]/.test(value.slice(1))) ? value.slice(1) : value;
      }
      return value.trim();
    });
  }
  // Undo only our own account-export text escaping; arbitrary CSV text remains unchanged.
  if (headers[0] === "Account ID" && headers.includes("Archived") && headers.includes("Opening Date")) {
    const textColumns = new Set(["Account ID", "Account Name", "Account Type", "Account Group", "Currency", "Pockets Summary", "Note", "Icon Key"]);
    for (const row of records) headers.forEach((header, index) => {
      const value = row.cells[index] ?? "";
      if (textColumns.has(header) && value.startsWith("'") &&
          (value[1] === "'" || /^[\s\x00-\x1f]*[=+@-]/.test(value.slice(1)))) row.cells[index] = value.slice(1);
    });
  }
  return { headers, rows: records };
}

// Full wire-format signature: a generic Amount/Type header is not enough to
// infer signs. Round-trip tests keep this aligned with the transaction exporter.
const APP_TRANSACTION_HEADERS = "Date,Time,Type,Name,Amount,Currency,Account,Pocket,Category,Labels,Note,Transfer Account,Transfer Pocket,Transfer Fee,Fee Account,Original Amount,Original Currency,Exchange Rate,Transaction ID".split(",");
const APP_TRANSACTION_TEXT_COLUMNS = new Set([2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18]);
function isAppTransactionHeaders(headers: readonly string[], encoded: boolean): boolean {
  return headers.length === APP_TRANSACTION_HEADERS.length + (encoded ? 1 : 0) &&
    APP_TRANSACTION_HEADERS.every((header, index) => header === headers[index]) &&
    (!encoded || headers[19] === "CSV Text Encoding");
}
export function resolveAmountInterpretation(headers: readonly string[], options: ImportOptions): "signed" | "unsigned" {
  if (options.amountInterpretation) return options.amountInterpretation;
  return isAppTransactionHeaders(headers, false) || isAppTransactionHeaders(headers, true) ? "signed" : "unsigned";
}

const aliases: Record<ImportField, string[]> = {
  status: ["status", "archived", "is archived"],
  date: ["date", "transaction date", "occurred at"], time: ["time"], amount: ["amount"],
  debit: ["debit", "withdrawal"], credit: ["credit", "deposit"], type: ["type", "transaction type"],
  account: ["account", "account name", "from account"], toAccount: ["to account", "transfer account", "destination account"],
  currency: ["currency", "currency code"], category: ["category"], subcategory: ["subcategory", "sub category"],
  name: ["name", "description", "payee"], note: ["note", "notes", "memo"], labels: ["labels", "tags"],
  sourceId: ["source id", "transaction id", "id"], accountType: ["account type"],
  openingBalance: ["opening balance", "starting balance"], balanceDate: ["balance date", "opening date"],
  creditLimit: ["credit limit", "card limit", "limit"],
  statementDay: ["statement cutoff day", "statement day", "billing day", "cutoff day"],
  paymentDueDay: ["payment due day", "due day", "due date day"],
};
export function suggestColumns(headers: string[]): Partial<Record<ImportField, number>> {
  const result: Partial<Record<ImportField, number>> = {};
  for (const field of Object.keys(aliases) as ImportField[]) {
    const index = headers.findIndex((h) => aliases[field].includes(h.toLowerCase().trim()));
    if (index >= 0) result[field] = index;
  }
  return result;
}

export function parseImportAmount(value: string, currency: string, decimal: "." | ","): number {
  const trimmed = value.trim();
  const escapedDecimal = decimal === "." ? "\\." : ",";
  const group = decimal === "." ? "," : "\\.";
  const pattern = new RegExp(`^[+-]?(?:\\d+|\\d{1,3}(?:${group}\\d{3})+)(?:${escapedDecimal}\\d+)?$`);
  if (!pattern.test(trimmed)) throw new ImportValidationError("amount");
  const normalized = trimmed.split(decimal === "." ? "," : ".").join("");
  const negative = normalized.startsWith("-");
  const [whole, fraction = ""] = normalized.replace(/^[+-]/, "").split(decimal);
  const exponent = getCurrencyMinorUnitExponent(currency);
  if (fraction.length > exponent) throw new ImportValidationError("amount");
  const amount = Number(whole + fraction.padEnd(exponent, "0")) * (negative ? -1 : 1);
  if (!Number.isSafeInteger(amount)) throw new ImportValidationError("amount");
  return amount;
}

export function parseImportDate(value: string, format: "ymd" | "dmy" | "mdy", time = ""): Date {
  const match = /^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value.trim());
  if (!match || (time && match[4])) throw new ImportValidationError("date");
  const parts = match.slice(1, 4).map(Number);
  const [year, month, day] = format === "ymd" ? parts : format === "dmy" ? [parts[2], parts[1], parts[0]] : [parts[2], parts[0], parts[1]];
  if (year < 1900 || year > 2200) throw new ImportValidationError("date");
  const clock = time ? /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time) : null;
  if (time && !clock) throw new ImportValidationError("date");
  const hour = Number(clock?.[1] ?? match[4] ?? 0), minute = Number(clock?.[2] ?? match[5] ?? 0), second = Number(clock?.[3] ?? match[6] ?? 0);
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || hour > 23 || minute > 59 || second > 59 || date.getHours() !== hour) throw new ImportValidationError("date");
  return date;
}

export function parseImportBillingDay(value: string): number {
  const trimmed = value.trim();
  if (!/^\d{1,2}$/.test(trimmed)) throw new ImportValidationError("creditCardDetails");
  const day = Number(trimmed);
  if (day < 1 || day > 31) throw new ImportValidationError("creditCardDetails");
  return day;
}

export function parseImportCreditLimit(value: string, currency: string, decimal: "." | ","): number {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("-")) throw new ImportValidationError("creditCardDetails");
  try {
    const parsed = parseImportAmount(trimmed, currency, decimal);
    if (parsed < 0) throw new ImportValidationError("creditCardDetails");
    return parsed;
  } catch {
    throw new ImportValidationError("creditCardDetails");
  }
}

export function parseImportCreditCardDetails(
  details: { creditLimit?: string; statementDay?: string; paymentDueDay?: string },
  currency: string,
  decimal: "." | ",",
): { creditLimit: number; statementDay: number; paymentDueDay: number } {
  return {
    creditLimit: parseImportCreditLimit(details.creditLimit ?? "", currency, decimal),
    statementDay: parseImportBillingDay(details.statementDay ?? ""),
    paymentDueDay: parseImportBillingDay(details.paymentDueDay ?? ""),
  };
}

export function getImportCreditCardFieldErrors(
  details: { creditLimit?: string; statementDay?: string; paymentDueDay?: string },
  currency: string,
  decimal: "." | ",",
): {
  creditLimit?: "required" | "invalid";
  statementDay?: "required" | "invalid";
  paymentDueDay?: "required" | "invalid";
} {
  const errors: {
    creditLimit?: "required" | "invalid";
    statementDay?: "required" | "invalid";
    paymentDueDay?: "required" | "invalid";
  } = {};
  const limit = details.creditLimit?.trim() ?? "";
  if (!limit) errors.creditLimit = "required";
  else {
    try { parseImportCreditLimit(limit, currency, decimal); }
    catch { errors.creditLimit = "invalid"; }
  }
  const statement = details.statementDay?.trim() ?? "";
  if (!statement) errors.statementDay = "required";
  else {
    try { parseImportBillingDay(statement); }
    catch { errors.statementDay = "invalid"; }
  }
  const due = details.paymentDueDay?.trim() ?? "";
  if (!due) errors.paymentDueDay = "required";
  else {
    try { parseImportBillingDay(due); }
    catch { errors.paymentDueDay = "invalid"; }
  }
  return errors;
}

export function normalizeImportName(value: string): string { return value.trim().normalize("NFKC").toLowerCase(); }
export function categoryMappingKey(type: string, category: string, subcategory = ""): string {
  return JSON.stringify([type, normalizeImportName(category), normalizeImportName(subcategory)]);
}
export function transactionFingerprint(type: string, account: string, to: string, date: Date, amount: number, name: string): string {
  return JSON.stringify([type, account, to, date.getFullYear(), date.getMonth(), date.getDate(), amount, normalizeImportName(name)]);
}

export function parseImportArchived(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (["", "active", "false", "0"].includes(normalized)) return false;
  if (["archived", "true", "1"].includes(normalized)) return true;
  throw new ImportValidationError("unsupported");
}
