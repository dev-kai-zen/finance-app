import type { AccountMapping, CsvDocument, ImportCatalog, ImportOptions } from "../types/import.types";
import { normalizeImportName, parseImportDate } from "./csv";
import { applyImportEdits, cellValue, sourceAccountNames, sourceCategories } from "./import-preview";
import { matchCategoryWithKnowledge } from "@/modules/chat-with-kai";
import { runImportWork, type ImportWorkOptions } from "./import-work";

/** Prepare suggestions only; all new records still require review before saving. */
export function prepareImportMappings(document: CsvDocument, options: ImportOptions, catalog: ImportCatalog): ImportOptions {
  const work = prepareImportMappingsWork(document, options, catalog);
  let result = work.next();
  while (!result.done) result = work.next();
  return result.value;
}

export function prepareImportMappingsAsync(document: CsvDocument, options: ImportOptions, catalog: ImportCatalog, workOptions?: ImportWorkOptions) {
  return runImportWork(prepareImportMappingsWork(document, options, catalog), workOptions);
}

function* prepareImportMappingsWork(document: CsvDocument, options: ImportOptions, catalog: ImportCatalog): Generator<void, ImportOptions> {
  document = applyImportEdits(document, options);
  const firstRows = new Map<string, CsvDocument["rows"][number]>();
  const earliestDates = new Map<string, string>();
  for (const row of document.rows) {
    yield;
    const account = normalizeImportName(cellValue(row.cells, options, "account") || options.defaultAccount);
    if (!firstRows.has(account)) firstRows.set(account, row);
    try {
      const date = parseImportDate(cellValue(row.cells, options, "date"), options.dateFormat);
      const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      for (const key of [account, normalizeImportName(cellValue(row.cells, options, "toAccount"))]) {
        if (!earliestDates.has(key) || formatted < earliestDates.get(key)!) earliestDates.set(key, formatted);
      }
    } catch { /* Invalid dates are presented during review. */ }
  }
  const types = new Map<string, ImportCatalog["accountTypes"][number]>();
  for (const type of catalog.accountTypes) {
    const key = normalizeImportName(type.name);
    if (!types.has(key)) types.set(key, type);
  }
  const existingAccounts = new Map<string, typeof catalog.accounts>();
  for (const account of catalog.accounts) {
    const key = JSON.stringify([normalizeImportName(account.name), account.currencyCode]);
    const entries = existingAccounts.get(key) ?? [];
    entries.push(account); existingAccounts.set(key, entries);
  }
  const categoryIndex = new Map<string, typeof catalog.categories>();
  for (const category of catalog.categories) {
    const key = JSON.stringify([category.type, category.parentId, normalizeImportName(category.name)]);
    const entries = categoryIndex.get(key) ?? [];
    entries.push(category); categoryIndex.set(key, entries);
  }
  const accounts: Record<string, AccountMapping> = Object.assign(Object.create(null), options.accounts);
  for (const name of sourceAccountNames(document, options)) {
    yield;
    const key = normalizeImportName(name);
    if (Object.hasOwn(accounts, key)) continue;
    const row = firstRows.get(key);
    const get = (field: Parameters<typeof cellValue>[2]) => row ? cellValue(row.cells, options, field) : "";
    const currency = get("currency").toUpperCase() || options.defaultCurrency;
    const typeName = get("accountType");
    const type = types.get(normalizeImportName(typeName));
    const existing = (existingAccounts.get(JSON.stringify([key, currency])) ?? []).filter((a) => (options.kind === "accounts" || !a.isArchived) && (!typeName || a.accountTypeId === type?.id));
    const earliest = earliestDates.get(key) ?? "";
    let balanceDate = get("balanceDate");
    if (options.kind === "accounts" && balanceDate) {
      try {
        const date = parseImportDate(balanceDate, options.dateFormat);
        balanceDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      } catch { /* Leave the source date visible for correction. */ }
    }
    accounts[key] = {
      existingId: existing.length === 1 ? existing[0].id : "",
      name,
      currency,
      accountTypeId: type?.id || "",
      openingBalance: options.kind === "accounts" ? get("openingBalance") : "0",
      balanceDate: options.kind === "accounts" ? balanceDate : earliest,
      note: options.kind === "accounts" ? get("note") : "",
      creditLimit: get("creditLimit"),
      statementDay: get("statementDay"),
      paymentDueDay: get("paymentDueDay"),
    };
  }
  const categories = { ...options.categories };
  for (const category of sourceCategories(document, options)) {
    yield;
    if (categories[category.key] !== undefined) continue;
    const parent = categoryIndex.get(JSON.stringify([category.type, null, normalizeImportName(category.parent)]))?.[0];
    const matches = category.parent && !parent ? [] : categoryIndex.get(JSON.stringify([category.type, category.parent ? parent?.id : null, normalizeImportName(category.name)])) ?? [];
    if (matches.length === 1) {
      categories[category.key] = matches[0].id;
      continue;
    }

    const query = [category.name, category.parent].filter(Boolean).join(" ");
    if (query && catalog.pickerCategories && catalog.pickerCategories.length > 0) {
      try {
        const matched = matchCategoryWithKnowledge(query, catalog.pickerCategories, category.type, catalog.categoryKeywordsMap);
        if (matched.category) {
          categories[category.key] = matched.category.id;
          continue;
        }
      } catch { /* Fall back safely if knowledge matcher is unavailable. */ }
    }

    categories[category.key] = catalog.fallbackCategoryIds?.[category.type] ?? "";
  }
  return { ...options, accounts, categories };
}
