import { getCurrencyMinorUnitExponent } from "@/utils/currency";
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, type CsvDocument, type ImportField } from "../types/import.types";

export class ImportValidationError extends Error {
  constructor(public readonly code: string) { super(code); }
}

export function parseCsv(input: string, separator?: string): CsvDocument {
  if (new TextEncoder().encode(input).length > MAX_IMPORT_BYTES) throw new ImportValidationError("fileSize");
  const text = input.replace(/^\uFEFF/, "");
  if (text.includes("\u0000") || text.includes("\uFFFD")) throw new ImportValidationError("encoding");
  // Count only separators outside quoted fields on the header record.
  let quoted = false;
  const counts = new Map([[",", 0], [";", 0], ["\t", 0]]);
  for (let i = 0; i < text.length; i++) {
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
    cells.push(cell.trim());
    if (cells.some(Boolean)) records.push({ number: start, cells });
    cells = []; cell = ""; closed = false;
    if (records.length > MAX_IMPORT_ROWS + 1) throw new ImportValidationError("rowLimit");
  };
  for (let i = 0; i < text.length; i++) {
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
      cells.push(cell.trim()); cell = ""; closed = false;
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
  const headers = records.shift()?.cells ?? [];
  if (!headers.length || !records.length || headers.some((h) => !h) || new Set(headers.map((h) => h.toLowerCase())).size !== headers.length) throw new ImportValidationError("headers");
  return { headers, rows: records };
}

const aliases: Record<ImportField, string[]> = {
  date: ["date", "transaction date", "occurred at"], time: ["time"], amount: ["amount"],
  debit: ["debit", "withdrawal"], credit: ["credit", "deposit"], type: ["type", "transaction type"],
  account: ["account", "account name", "from account"], toAccount: ["to account", "transfer account", "destination account"],
  currency: ["currency", "currency code"], category: ["category"], subcategory: ["subcategory", "sub category"],
  name: ["name", "description", "payee"], note: ["note", "notes", "memo"], labels: ["labels", "tags"],
  sourceId: ["source id", "transaction id", "id"], accountType: ["account type"],
  openingBalance: ["opening balance", "starting balance"], balanceDate: ["balance date", "opening date"],
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

export function normalizeImportName(value: string): string { return value.trim().normalize("NFKC").toLowerCase(); }
export function categoryMappingKey(type: string, category: string, subcategory = ""): string {
  return JSON.stringify([type, normalizeImportName(category), normalizeImportName(subcategory)]);
}
export function transactionFingerprint(type: string, account: string, to: string, date: Date, amount: number, name: string): string {
  return JSON.stringify([type, account, to, date.getFullYear(), date.getMonth(), date.getDate(), amount, normalizeImportName(name)]);
}
