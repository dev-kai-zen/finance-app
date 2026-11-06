import type { CsvDocument, ImportField, ImportKind, ImportOptions, ImportStep } from "../types/import.types";
import { applyImportEdits, cellValue, resolveImportType } from "./import-preview";

export function importSteps(kind: ImportKind): ImportStep[] {
  return kind === "accounts" ? ["columns", "matching", "review"] : ["columns", "matching", "categories", "review"];
}
export function previousImportStep(step: ImportStep, kind: ImportKind): ImportStep | null {
  if (step === "history") return "file";
  const steps = importSteps(kind), index = steps.indexOf(step);
  return index >= 0 ? steps[index - 1] ?? "file" : null;
}
export function requiredImportColumns(options: ImportOptions): ImportField[] {
  const missing: ImportField[] = [];
  if (options.columns.account === undefined && !options.defaultAccount.trim()) missing.push("account");
  if (options.kind === "transactions") {
    if (options.columns.date === undefined) missing.push("date");
    if (options.columns.amount === undefined && options.columns.debit === undefined && options.columns.credit === undefined) missing.push("amount");
  }
  return missing;
}
export function transferFileSummary(document: CsvDocument, options: ImportOptions) {
  const rows = applyImportEdits(document, options).rows.filter((r) => resolveImportType(r.cells, options, r.number) === "transfer");
  const outgoing = rows.filter((r) => cellValue(r.cells, options, "amount").startsWith("-") || (options.columns.amount === undefined && /[1-9]/.test(cellValue(r.cells, options, "debit")))).length;
  return { count: rows.length, outgoing, incoming: rows.length - outgoing };
}

export function importTypeValues(document: CsvDocument, options: ImportOptions) {
  const values = new Map<string, { key: string; value: string; count: number; mapped: string }>();
  for (const row of applyImportEdits(document, options).rows) {
    const value = cellValue(row.cells, options, "type");
    if (!value) continue;
    const key = value.normalize("NFKC").toLowerCase();
    const current = values.get(key);
    values.set(key, { key, value, count: (current?.count ?? 0) + 1, mapped: resolveImportType(row.cells, { ...options, rowTypes: undefined }) });
  }
  return [...values.values()];
}
