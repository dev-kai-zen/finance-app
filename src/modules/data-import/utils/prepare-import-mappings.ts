import type { AccountMapping, CsvDocument, ImportCatalog, ImportOptions } from "../types/import.types";
import { normalizeImportName, parseImportDate } from "./csv";
import { applyImportEdits, cellValue, sourceAccountNames, sourceCategories } from "./import-preview";

/** Prepare suggestions only; all new records still require review before saving. */
export function prepareImportMappings(document: CsvDocument, options: ImportOptions, catalog: ImportCatalog): ImportOptions {
  document = applyImportEdits(document, options);
  const accounts: Record<string, AccountMapping> = Object.assign(Object.create(null), options.accounts);
  for (const name of sourceAccountNames(document, options)) {
    const key = normalizeImportName(name);
    if (Object.hasOwn(accounts, key)) continue;
    const row = document.rows.find((r) => normalizeImportName(cellValue(r.cells, options, "account") || options.defaultAccount) === key);
    const get = (field: Parameters<typeof cellValue>[2]) => row ? cellValue(row.cells, options, field) : "";
    const currency = get("currency").toUpperCase() || options.defaultCurrency;
    const typeName = get("accountType");
    const type = catalog.accountTypes.find((t) => !t.creditCard && normalizeImportName(t.name) === normalizeImportName(typeName));
    const existing = catalog.accounts.filter((a) => !a.isArchived && !a.creditCard && normalizeImportName(a.name) === key && a.currencyCode === currency && (!typeName || a.accountTypeId === type?.id));
    let earliest = "";
    for (const source of document.rows) {
      if (![cellValue(source.cells, options, "account") || options.defaultAccount, cellValue(source.cells, options, "toAccount")].some((n) => normalizeImportName(n) === key)) continue;
      try {
        const date = parseImportDate(cellValue(source.cells, options, "date"), options.dateFormat);
        const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        if (!earliest || formatted < earliest) earliest = formatted;
      } catch { /* Invalid dates are presented during review. */ }
    }
    let balanceDate = get("balanceDate");
    if (options.kind === "accounts" && balanceDate) {
      try {
        const date = parseImportDate(balanceDate, options.dateFormat);
        balanceDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      } catch { /* Leave the source date visible for correction. */ }
    }
    accounts[key] = { existingId: existing.length === 1 ? existing[0].id : "", name, currency, accountTypeId: type?.id || "", openingBalance: options.kind === "accounts" ? get("openingBalance") : "0", balanceDate: options.kind === "accounts" ? balanceDate : earliest, note: options.kind === "accounts" ? get("note") : "" };
  }
  const categories = { ...options.categories };
  for (const category of sourceCategories(document, options)) {
    if (categories[category.key] !== undefined) continue;
    const parent = catalog.categories.find((c) => !c.parentId && c.type === category.type && normalizeImportName(c.name) === normalizeImportName(category.parent));
    const matches = catalog.categories.filter((c) => c.type === category.type && normalizeImportName(c.name) === normalizeImportName(category.name) && c.parentId === (category.parent ? parent?.id : null));
    if (matches.length === 1) categories[category.key] = matches[0].id;
    else categories[category.key] = catalog.fallbackCategoryIds?.[category.type] ?? "";
  }
  return { ...options, accounts, categories };
}
