import type { CsvDocument, ImportOptions } from "../types/import.types";
import { categoryMappingKey, parseImportDate } from "./csv";
import { cellValue, resolveImportType } from "./import-preview";
import { runImportWork, type ImportWorkOptions } from "./import-work";

/** File-wide wizard summaries must not rescan/parse the file during input renders. */
export function analyzeImportAsync(document: CsvDocument, options: ImportOptions, workOptions?: ImportWorkOptions) {
  return runImportWork((function* () {
    const names = new Set<string>();
    const categories = new Map<string, { key: string; type: "income" | "expense"; name: string; parent: string }>();
    const types = new Map<string, { key: string; value: string; count: number; mapped: string }>();
    const transfer = { count: 0, outgoing: 0, incoming: 0 };
    const dates = { original: "", interpreted: null as Date | null, invalid: 0, checked: 0 };
    const dateField = options.kind === "accounts" ? "balanceDate" : "date";
    const fileTypeOptions = { ...options, rowTypes: undefined };
    for (const row of document.rows) {
      yield;
      const cells = options.rowEdits?.[row.number] ?? row.cells;
      const get = (field: Parameters<typeof cellValue>[2]) => cellValue(cells, options, field);
      names.add(get("account") || options.defaultAccount);
      if (get("toAccount")) names.add(get("toAccount"));
      const type = resolveImportType(cells, options, row.number);
      if (type === "expense" || type === "income") {
        const category = get("category"), sub = get("subcategory"), key = categoryMappingKey(type, category, sub);
        categories.set(key, { key, type, name: sub || category, parent: sub ? category : "" });
      }
      if (get("type") && options.kind === "transactions") {
        const value = get("type"), key = value.normalize("NFKC").toLowerCase();
        types.set(key, { key, value, count: (types.get(key)?.count ?? 0) + 1, mapped: resolveImportType(cells, fileTypeOptions) });
      }
      if (type === "transfer") {
        transfer.count++;
        if (get("amount").startsWith("-") || (options.columns.amount === undefined && /[1-9]/.test(get("debit")))) transfer.outgoing++;
        else transfer.incoming++;
      }
      if (options.columns[dateField] !== undefined) {
        const value = get(dateField);
        if (!dates.original && value) dates.original = value;
        dates.checked++;
        try { const date = parseImportDate(value, options.dateFormat); if (value === dates.original && !dates.interpreted) dates.interpreted = date; }
        catch { dates.invalid++; }
      }
    }
    return { accountNames: [...names].filter(Boolean), categoryNames: [...categories.values()], types: [...types.values()], transfer, dates };
  })(), workOptions);
}
