import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import type { CsvDocument, ImportCatalog, ImportField, ImportOptions, ImportPreview, ImportPreviewRow, PlannedAccount, PlannedTransaction } from "../types/import.types";
import { categoryMappingKey, ImportValidationError, normalizeImportName, parseImportAmount, parseImportDate, transactionFingerprint } from "./csv";

export function importDigest(value: string): string { return bytesToHex(sha256(utf8ToBytes(value))); }
export function cellValue(cells: string[], options: ImportOptions, field: ImportField): string {
  const index = options.columns[field];
  return index === undefined ? "" : cells[index]?.trim() ?? "";
}
export function applyImportEdits(document: CsvDocument, options: ImportOptions): CsvDocument {
  return { ...document, rows: document.rows.map((row) => ({ ...row, cells: options.rowEdits?.[row.number] ?? row.cells })) };
}
export function resolveImportType(cells: string[], options: ImportOptions, rowNumber?: number): string {
  if (rowNumber !== undefined && options.rowTypes?.[rowNumber]) return options.rowTypes[rowNumber];
  const raw = cellValue(cells, options, "type");
  const key = normalizeImportName(raw);
  if (options.typeMappings && Object.hasOwn(options.typeMappings, key)) return options.typeMappings[key];
  const inferred = inferType(raw, cellValue(cells, options, "amount"), cellValue(cells, options, "debit"), cellValue(cells, options, "credit"));
  // "exclude" is an explicit mapping decision, never an automatically trusted file type.
  return inferred === "exclude" ? "" : inferred;
}
export function sourceAccountNames(document: CsvDocument, options: ImportOptions): string[] {
  document = applyImportEdits(document, options);
  const names = new Set<string>();
  for (const row of document.rows) {
    names.add(cellValue(row.cells, options, "account") || options.defaultAccount);
    const to = cellValue(row.cells, options, "toAccount");
    if (to) names.add(to);
  }
  return [...names].filter(Boolean);
}
export function sourceCategories(document: CsvDocument, options: ImportOptions) {
  document = applyImportEdits(document, options);
  const values = new Map<string, { key: string; type: "income" | "expense"; name: string; parent: string }>();
  for (const row of document.rows) {
    const get = (field: ImportField) => cellValue(row.cells, options, field);
    const type = resolveImportType(row.cells, options, row.number);
    if (type !== "income" && type !== "expense") continue;
    const category = get("category"), sub = get("subcategory");
    const key = categoryMappingKey(type, category, sub);
    values.set(key, { key, type, name: sub || category, parent: sub ? category : "" });
  }
  return [...values.values()];
}
function inferType(type: string, amount: string, debit: string, credit: string): string {
  if (type) return type.toLowerCase();
  const debitValue = !!debit && !/^[+-]?0+(?:[.,]0+)?$/.test(debit);
  const creditValue = !!credit && !/^[+-]?0+(?:[.,]0+)?$/.test(credit);
  if (debitValue && !creditValue) return "expense";
  if (creditValue && !debitValue) return "income";
  if (amount) return amount.startsWith("-") ? "expense" : "income";
  // Let amount validation explain zero or conflicting debit/credit values.
  if (debit || credit) return "income";
  return "";
}

export function buildImportPreview(document: CsvDocument, options: ImportOptions, catalog: ImportCatalog, fileHash: string): ImportPreview {
  document = applyImportEdits(document, options);
  const accounts = new Map<string, PlannedAccount>();
  const usedSourceKeys = new Set(catalog.sourceKeys);
  const fingerprints = new Set(catalog.fingerprints);
  const repeatedKeys = new Set<string>();
  const accountId = (key: string) => accounts.get(key)?.id || `new:${key}`;
  const resolveAccount = (name: string, cells: string[]): PlannedAccount => {
    const key = normalizeImportName(name);
    if (!key) throw new ImportValidationError("account");
    const mapping = Object.hasOwn(options.accounts, key) ? options.accounts[key] : undefined;
    if (!mapping) throw new ImportValidationError("account");
    const existing = catalog.accounts.find((a) => a.id === mapping.existingId);
    if (mapping.existingId && !existing) throw new ImportValidationError("account");
    if (existing?.isArchived || existing?.creditCard) throw new ImportValidationError("unsupported");
    const currency = existing?.currencyCode || mapping.currency.trim().toUpperCase();
    const rowCurrency = cellValue(cells, options, "currency").toUpperCase();
    if (!catalog.currencies.includes(currency) || (rowCurrency && rowCurrency !== currency)) throw new ImportValidationError("currency");
    const type = catalog.accountTypes.find((t) => t.id === (existing?.accountTypeId || mapping.accountTypeId));
    if (!type) throw new ImportValidationError("account");
    if (type.creditCard) throw new ImportValidationError("unsupported");
    const planned: PlannedAccount = existing ? {
      key, id: existing.id, name: existing.name, accountTypeId: existing.accountTypeId, currency,
      openingBalance: existing.openingBalanceMinorUnits, balanceDate: existing.openingBalanceAt, currentBalance: existing.currentBalanceMinorUnits,
    } : {
      key, id: null, name: mapping.name.trim(), accountTypeId: type.id, currency,
      openingBalance: parseImportAmount(mapping.openingBalance, currency, options.decimal),
      balanceDate: parseImportDate(mapping.balanceDate, "ymd"),
      currentBalance: parseImportAmount(mapping.openingBalance, currency, options.decimal), note: mapping.note,
    };
    if (!planned.name || planned.name.length > 100 || (planned.note?.length ?? 0) > 1000) throw new ImportValidationError("name");
    if (!planned.id && catalog.accounts.some((a) => normalizeImportName(a.name) === normalizeImportName(planned.name) && a.currencyCode === currency)) throw new ImportValidationError("account");
    if (!planned.id && [...accounts.values()].some((a) => a.key !== key && !a.id && normalizeImportName(a.name) === normalizeImportName(planned.name) && a.currency === currency)) throw new ImportValidationError("account");
    accounts.set(key, planned);
    return planned;
  };
  const rows: ImportPreviewRow[] = document.rows.map((row) => {
    const result: ImportPreviewRow = { number: row.number, cells: row.cells, skip: options.decisions[row.number] === "skip", duplicate: false, repeated: false, sourceKey: "" };
    const get = (field: ImportField) => cellValue(row.cells, options, field);
    const resolvedType = resolveImportType(row.cells, options, row.number);
    if (options.kind === "transactions" && resolvedType === "exclude") result.skip = true;
    try {
      if (options.source.length > 100 || new Set(Object.values(options.columns)).size !== Object.values(options.columns).length || row.cells.length !== document.headers.length) throw new ImportValidationError("columns");
      const sourceAccount = get("account") || options.defaultAccount;
      const account = resolveAccount(sourceAccount, row.cells);
      const sourceIdentity = get("sourceId");
      result.sourceKey = importDigest(JSON.stringify(sourceIdentity
        ? [options.kind, normalizeImportName(options.source.trim() || "CSV"), account.key, sourceIdentity]
        : [options.kind, normalizeImportName(options.source.trim() || "CSV"), account.key, fileHash, row.number]));
      if (usedSourceKeys.has(result.sourceKey)) { result.repeated = true; result.skip = true; }
      // Two records with the same external ID in a file need an explicit resolution.
      if (sourceIdentity && repeatedKeys.has(result.sourceKey)) throw new ImportValidationError("duplicate");
      if (!result.skip) repeatedKeys.add(result.sourceKey);
      if (options.kind === "accounts") {
        if (account.id && !result.skip) { result.duplicate = true; if (options.decisions[row.number] !== "skip") throw new ImportValidationError("duplicate"); }
        return result;
      }
      if (resolvedType === "exclude") return result;
      // Recognized metadata must not disappear when a simpler record is imported.
      const unsupportedHeaders = /^(pocket|transfer pocket|transfer fee|fee account|original amount|original currency|exchange rate|split|split entries|installment|installments|schedule|recurring)$/i;
      if (document.headers.some((header, index) => unsupportedHeaders.test(header) && row.cells[index])) throw new ImportValidationError("unsupported");
      if (get("category").includes("|")) throw new ImportValidationError("unsupported");
      const type = resolvedType;
      if (type !== "income" && type !== "expense" && type !== "transfer") throw new ImportValidationError("type");
      const date = parseImportDate(get("date"), options.dateFormat, get("time"));
      if (date < account.balanceDate) throw new ImportValidationError("balance");
      let amount: number;
      if (options.columns.amount !== undefined) {
        amount = parseImportAmount(get("amount"), account.currency, options.decimal);
      } else {
        const debit = get("debit") ? parseImportAmount(get("debit"), account.currency, options.decimal) : 0;
        const credit = get("credit") ? parseImportAmount(get("credit"), account.currency, options.decimal) : 0;
        if (debit < 0 || credit < 0 || (!!debit === !!credit)) throw new ImportValidationError("amount");
        amount = credit - debit;
        if ((type === "income" && debit) || (type === "expense" && credit)) throw new ImportValidationError("amount");
      }
      if (!amount) throw new ImportValidationError("amount");
      const transaction: PlannedTransaction = { type, accountKey: account.key, amount: type === "expense" ? -Math.abs(amount) : type === "income" ? Math.abs(amount) : amount, currency: account.currency, date, name: get("name"), note: get("note"), labels: [...new Set(get("labels").split(";").map((s) => s.trim()).filter(Boolean))] };
      if (transaction.name.length > 200 || transaction.note.length > 1000 || transaction.labels.some((s) => s.length > 100)) throw new ImportValidationError("name");
      if (type === "transfer") {
        // Currency comes from the source; validate the destination independently.
        let destination = get("toAccount");
        if (!destination && options.transferMode === "paired") {
          const candidates = document.rows.filter((other) => {
            if (other.number === row.number || options.decisions[other.number] === "skip") return false;
            const value = (field: ImportField) => cellValue(other.cells, options, field);
            if (resolveImportType(other.cells, options, other.number) !== "transfer") return false;
            const otherAccount = value("account") || options.defaultAccount;
            if (normalizeImportName(otherAccount) === account.key || (value("toAccount") && normalizeImportName(value("toAccount")) !== account.key)) return false;
            try {
              const otherDate = parseImportDate(value("date"), options.dateFormat, value("time"));
              const otherAmount = options.columns.amount !== undefined
                ? parseImportAmount(value("amount"), account.currency, options.decimal)
                : (value("credit") ? parseImportAmount(value("credit"), account.currency, options.decimal) : 0) - (value("debit") ? parseImportAmount(value("debit"), account.currency, options.decimal) : 0);
              return otherDate.toDateString() === date.toDateString() && otherAmount === -amount;
            } catch { return false; }
          });
          const exact = candidates.filter((other) => parseImportDate(cellValue(other.cells, options, "date"), options.dateFormat, cellValue(other.cells, options, "time")).getTime() === date.getTime());
          const matches = exact.length ? exact : candidates;
          if (matches.length === 1) destination = cellValue(matches[0].cells, options, "account") || options.defaultAccount;
          else throw new ImportValidationError("transfer");
        }
        const to = resolveAccount(destination, row.cells);
        if (accountId(account.key) === accountId(to.key) || to.currency !== account.currency || date < to.balanceDate || (options.transferMode === "single" && amount <= 0)) throw new ImportValidationError("transfer");
        transaction.toAccountKey = to.key;
      } else {
        const category = get("category"), subcategory = get("subcategory");
        const key = categoryMappingKey(type, category, subcategory);
        const selected = options.categories[key];
        if (selected === undefined) throw new ImportValidationError("category");
        if (selected) {
          const match = catalog.categories.find((c) => c.id === selected && c.type === type);
          if (!match) throw new ImportValidationError("category");
          transaction.categoryId = match.id;
        } else {
          if (!category || category.length > 50 || subcategory.length > 50 || /\|/.test(category)) throw new ImportValidationError("category");
          transaction.categoryName = subcategory || category;
          transaction.parentName = subcategory ? category : undefined;
        }
        transaction.categoryKey = key;
      }
      result.transaction = transaction;
    } catch (error) {
      result.issue = error instanceof ImportValidationError ? error.code as ImportPreviewRow["issue"] : "columns";
    }
    return result;
  });
  // Pair exact opposite legs only. Ambiguous matches are blocked for review.
  if (options.kind === "transactions" && options.transferMode === "paired") {
    for (const row of [...rows].sort((a, b) => Number(a.skip) - Number(b.skip))) {
      const tx = row.transaction;
      if (!tx || tx.type !== "transfer" || tx.amount >= 0 || row.issue || row.companion) continue;
      const possible = rows.filter((other) => {
        const next = other.transaction;
        return !other.issue && !other.companion && next?.type === "transfer" && next.amount === -tx.amount && accountId(next.accountKey) === accountId(tx.toAccountKey!) && accountId(next.toAccountKey!) === accountId(tx.accountKey) && next.date.toDateString() === tx.date.toDateString();
      });
      const included = possible.filter((other) => !other.skip);
      const pool = !row.skip && included.length ? included : possible;
      const exact = pool.filter((other) => other.transaction!.date.getTime() === tx.date.getTime());
      const candidates = exact.length ? exact : pool;
      if (candidates.length !== 1) { row.issue = "transfer"; continue; }
      const opposite = candidates[0];
      row.companion = opposite.number; opposite.companion = row.number; opposite.secondary = true;
      // Exclusion applies to both legs; already imported legs must never be recreated.
      row.skip = opposite.skip = row.skip || opposite.skip;
      row.repeated = opposite.repeated = row.repeated || opposite.repeated;
      row.transaction = { ...tx, amount: Math.abs(tx.amount), labels: [...new Set([...tx.labels, ...opposite.transaction!.labels])], note: [...new Set([tx.note, opposite.transaction!.note].filter(Boolean))].join("\n") };
      if (row.transaction.note.length > 1000) row.issue = "name";
    }
    for (const row of rows) if (row.transaction?.type === "transfer" && !row.companion && !row.issue) row.issue = "transfer";
  }
  const logicalRows = rows.filter((r) => !r.skip && !r.issue && !r.secondary);
  const income: Record<string, number> = {}, expense: Record<string, number> = {};
  const deltas = new Map<string, number>();
  const actualAccounts = new Set<string>();
  let unsafeTotal = false;
  const addDelta = (key: string, amount: number) => {
    const next = (deltas.get(key) ?? 0) + amount;
    if (!Number.isSafeInteger(next)) unsafeTotal = true;
    deltas.set(key, next);
  };
  for (const row of logicalRows) {
    const tx = row.transaction;
    if (!tx) { actualAccounts.add(normalizeImportName(cellValue(row.cells, options, "account") || options.defaultAccount)); continue; }
    const fingerprint = transactionFingerprint(tx.type, accountId(tx.accountKey), tx.toAccountKey ? accountId(tx.toAccountKey) : "", tx.date, tx.amount, tx.name);
    row.duplicate = fingerprints.has(fingerprint);
    if (row.duplicate && options.decisions[row.number] !== "import") { row.issue = "duplicate"; continue; }
    fingerprints.add(fingerprint);
    actualAccounts.add(tx.accountKey);
    const balanceKey = accounts.get(tx.accountKey)!.id || tx.accountKey;
    addDelta(balanceKey, tx.type === "transfer" ? -Math.abs(tx.amount) : tx.amount);
    if (tx.toAccountKey) {
      actualAccounts.add(tx.toAccountKey);
      const toKey = accounts.get(tx.toAccountKey)!.id || tx.toAccountKey;
      addDelta(toKey, Math.abs(tx.amount));
    }
    if (tx.type === "income") income[tx.currency] = (income[tx.currency] || 0) + tx.amount;
    if (tx.type === "expense") expense[tx.currency] = (expense[tx.currency] || 0) + Math.abs(tx.amount);
  }
  // Repeated account names in accounts-only files would otherwise create duplicate accounts.
  if (options.kind === "accounts") {
    const names = new Set<string>();
    for (const row of rows.filter((r) => !r.skip && !r.issue)) {
      const key = normalizeImportName(cellValue(row.cells, options, "account") || options.defaultAccount);
      if (names.has(key)) row.issue = "duplicate";
      names.add(key);
    }
  }
  const plannedAccounts = [...accounts.values()].filter((a) => actualAccounts.has(a.key));
  const balances = [...new Map(plannedAccounts.map((a) => [a.id || a.key, { key: a.key, name: a.name, currency: a.currency, before: a.currentBalance, after: a.currentBalance + (deltas.get(a.id || a.key) || 0) }])).values()];
  if (unsafeTotal || balances.some((b) => !Number.isSafeInteger(b.after)) || [...Object.values(income), ...Object.values(expense)].some((n) => !Number.isSafeInteger(n))) {
    for (const row of rows) if (!row.skip) row.issue = "amount";
  }
  const errors = rows.filter((r) => !r.skip && r.issue).length;
  const accepted = rows.filter((r) => !r.skip && !r.issue && !r.secondary).length;
  const dates = logicalRows.filter((r) => !r.issue).flatMap((r) => r.transaction ? [r.transaction.date.getTime()] : []);
  const preview = { rows, accounts: plannedAccounts, balances, ready: errors === 0 && accepted > 0, accepted, skipped: rows.filter((r) => r.skip).length, errors, income, expense, dateFrom: dates.length ? new Date(Math.min(...dates)) : undefined, dateTo: dates.length ? new Date(Math.max(...dates)) : undefined };
  return { ...preview, signature: importDigest(JSON.stringify(preview)) };
}
