import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { getCurrencyMinorUnitExponent } from "@/utils/currency";
import { ImportCandidateIndex, runImportWork, type ImportWorkOptions } from "./import-work";
import type { CsvDocument, ImportCatalog, ImportField, ImportOptions, ImportPreview, ImportPreviewConstraints, ImportPreviewRow, PlannedAccount, PlannedTransaction } from "../types/import.types";
import { categoryMappingKey, resolveAmountInterpretation, ImportValidationError, parseImportArchived, normalizeImportName, parseImportAmount, parseImportCreditCardDetails, parseImportDate, transactionFingerprint } from "./csv";

export function importDigest(value: string): string { return bytesToHex(sha256(utf8ToBytes(value))); }
export function importDigestAsync(value: string): Promise<string> {
  return runImportWork((function* () {
    const hash = sha256.create();
    for (let offset = 0; offset < value.length;) {
      yield;
      const end = utf8ChunkEnd(value, offset);
      hash.update(utf8ToBytes(value.slice(offset, end)));
      offset = end;
    }
    return bytesToHex(hash.digest());
  })());
}
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
export function findSourceRowCellsForAccount(
  document: CsvDocument,
  options: ImportOptions,
  accountKey: string,
): string[] | null {
  let toAccountFallback: string[] | null = null;
  for (const row of document.rows) {
    const cells = options.rowEdits?.[row.number] ?? row.cells;
    const primary = normalizeImportName(
      cellValue(cells, options, "account") || options.defaultAccount,
    );
    if (primary === accountKey) {
      return cells;
    }
    if (!toAccountFallback) {
      const toAccount = normalizeImportName(
        cellValue(cells, options, "toAccount"),
      );
      if (toAccount === accountKey) {
        toAccountFallback = cells;
      }
    }
  }
  return toAccountFallback;
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

export function buildImportPreview(
  document: CsvDocument,
  options: ImportOptions,
  catalog: ImportCatalog,
  fileHash: string,
  constraints?: ImportPreviewConstraints,
): ImportPreview {
  const work = importPreviewWork(document, options, catalog, fileHash, constraints);
  let result = work.next();
  while (!result.done) result = work.next();
  return result.value;
}

export function buildImportPreviewAsync(
  document: CsvDocument, options: ImportOptions, catalog: ImportCatalog, fileHash: string,
  constraints?: ImportPreviewConstraints, workOptions?: ImportWorkOptions,
): Promise<ImportPreview> {
  return runImportWork(importPreviewWork(document, options, catalog, fileHash, constraints), workOptions);
}

export function* importPreviewWork(
  document: CsvDocument, options: ImportOptions, catalog: ImportCatalog, fileHash: string,
  constraints?: ImportPreviewConstraints,
): Generator<void, ImportPreview> {
  document = applyImportEdits(document, options);
  const signedAmounts = resolveAmountInterpretation(document.headers, options) === "signed";
  const accounts = new Map<string, PlannedAccount>();
  const usedSourceKeys = new Set(catalog.sourceKeys);
  const fingerprints = new Set(catalog.fingerprints);
  const repeatedKeys = new Set<string>();
  const existingAccounts = new Map(catalog.accounts.map((a) => [a.id, a]));
  const accountTypes = new Map(catalog.accountTypes.map((a) => [a.id, a]));
  const categories = new Map(catalog.categories.map((c) => [c.id, c]));
  const currencies = new Set(catalog.currencies);
  const existingNames = new Set(catalog.accounts.map((a) => JSON.stringify([normalizeImportName(a.name), a.currencyCode])));
  const plannedNames = new Map<string, string>();
  const parsedAccounts = new Map<string, PlannedAccount>();
  const validColumns = options.source.length <= 100 && new Set(Object.values(options.columns)).size === Object.values(options.columns).length;
  const source = validColumns ? normalizeImportName(options.source.trim() || "CSV") : "";
  const unsupportedHeaders = /^(pocket|transfer pocket|transfer fee|fee account|original amount|original currency|exchange rate|split|split entries|installment|installments|schedule|recurring)$/i;
  const unsupportedColumns = document.headers.flatMap((header, index) => unsupportedHeaders.test(header) ? [index] : []);
  const readAmount = (cells: string[], currency: string) => {
    const get = (field: ImportField) => cellValue(cells, options, field);
    return options.columns.amount !== undefined
      ? parseImportAmount(get("amount"), currency, options.decimal)
      : (get("credit") ? parseImportAmount(get("credit"), currency, options.decimal) : 0) - (get("debit") ? parseImportAmount(get("debit"), currency, options.decimal) : 0);
  };
  const facts: { name: string; account: string; to: string; type: string; date?: Date; amounts: Map<number, number> }[] = [];
  for (const row of document.rows) {
    yield;
    facts.push({
      name: cellValue(row.cells, options, "account") || options.defaultAccount,
      account: normalizeImportName(cellValue(row.cells, options, "account") || options.defaultAccount),
      to: normalizeImportName(cellValue(row.cells, options, "toAccount")),
      type: resolveImportType(row.cells, options, row.number),
      date: undefined as Date | undefined,
      amounts: new Map<number, number>(),
    });
  }
  // The old inference parsed opposite legs in the source currency's precision.
  // Index each distinct precision to preserve that behavior, including invalid/cross-currency rows.
  const precisions = new Map<number, string>();
  for (const currency of [...catalog.accounts.map((a) => a.currencyCode), ...Object.values(options.accounts).map((a) => a.currency)]) {
    precisions.set(getCurrencyMinorUnitExponent(currency), currency);
  }
  const inferred = new ImportCandidateIndex();
  const inferenceKey = (day: string, amount: number, precision: number, to: string, time: string | number, account: string | null = null) =>
    JSON.stringify([day, amount, precision, to, time, account]);
  for (let index = 0; index < facts.length; index++) {
    yield;
    const fact = facts[index], row = document.rows[index];
    if (fact.type !== "transfer" || options.kind !== "transactions" || options.transferMode !== "paired") continue;
    try { fact.date = parseImportDate(cellValue(row.cells, options, "date"), options.dateFormat, cellValue(row.cells, options, "time")); }
    catch { continue; }
    for (const [precision, currency] of precisions) {
      try { fact.amounts.set(precision, readAmount(row.cells, currency)); } catch { continue; }
      if (options.decisions[row.number] === "skip") continue;
      for (const time of ["day", fact.date.getTime()]) {
        inferred.add(inferenceKey(fact.date.toDateString(), fact.amounts.get(precision)!, precision, fact.to, time), index);
        inferred.add(inferenceKey(fact.date.toDateString(), fact.amounts.get(precision)!, precision, fact.to, time, fact.account), index);
      }
    }
  }
  const accountId = (key: string) => accounts.get(key)?.id || `new:${key}`;
  const resolveAccount = (name: string, cells: string[]): PlannedAccount => {
    const key = normalizeImportName(name);
    if (!key) throw new ImportValidationError("account");
    const mapping = Object.hasOwn(options.accounts, key) ? options.accounts[key] : undefined;
    if (!mapping) throw new ImportValidationError("account");
    const existing = existingAccounts.get(mapping.existingId);
    if (mapping.existingId && !existing) throw new ImportValidationError("account");
    if (existing?.isArchived && options.kind !== "accounts") throw new ImportValidationError("unsupported");
    const currency = existing?.currencyCode || mapping.currency.trim().toUpperCase();
    const rowCurrency = cellValue(cells, options, "currency").toUpperCase();
    if (!currencies.has(currency) || (rowCurrency && rowCurrency !== currency)) throw new ImportValidationError("currency");
    const cached = parsedAccounts.get(key);
    if (cached && options.kind !== "accounts") { accounts.set(key, cached); return cached; }
    const type = accountTypes.get(existing?.accountTypeId || mapping.accountTypeId);
    if (!type) throw new ImportValidationError("account");
    const creditCardDetails =
      !existing && type.creditCard
        ? parseImportCreditCardDetails(mapping, currency, options.decimal)
        : undefined;
    const planned: PlannedAccount = existing ? {
      key, id: existing.id, name: existing.name, accountTypeId: existing.accountTypeId, currency,
      openingBalance: existing.openingBalanceMinorUnits, balanceDate: existing.openingBalanceAt, currentBalance: existing.currentBalanceMinorUnits, isArchived: existing.isArchived,
    } : {
      key, id: null, name: mapping.name.trim(), accountTypeId: type.id, currency,
      openingBalance: parseImportAmount(mapping.openingBalance, currency, options.decimal),
      balanceDate: parseImportDate(mapping.balanceDate, "ymd"),
      currentBalance: parseImportAmount(mapping.openingBalance, currency, options.decimal), note: mapping.note,
      creditCardDetails,
      isArchived: options.kind === "accounts" ? parseImportArchived(cellValue(cells, options, "status")) : false,
    };
    if (!planned.name || planned.name.length > 100 || (planned.note?.length ?? 0) > 1000) throw new ImportValidationError("name");
    const nameKey = JSON.stringify([normalizeImportName(planned.name), currency]);
    if (!planned.id && (existingNames.has(nameKey) || (plannedNames.has(nameKey) && plannedNames.get(nameKey) !== key))) throw new ImportValidationError("account");
    if (!planned.id) plannedNames.set(nameKey, key);
    accounts.set(key, planned);
    parsedAccounts.set(key, planned);
    return planned;
  };
  const rows: ImportPreviewRow[] = [];
  for (let index = 0; index < document.rows.length; index++) {
    yield;
    const row = document.rows[index], fact = facts[index];
    const identity = cellValue(row.cells, options, "sourceId");
    const rowSourceKey = validColumns && row.cells.length === document.headers.length
      ? yield* importJsonDigestWork(identity
        ? [options.kind, source, fact.account, identity]
        : [options.kind, source, fact.account, fileHash, row.number])
      : "";
    const parseRow = () => {
      const result: ImportPreviewRow = { number: row.number, cells: row.cells, skip: options.decisions[row.number] === "skip", duplicate: false, repeated: false, sourceKey: "" };
      const get = (field: ImportField) => cellValue(row.cells, options, field);
      const resolvedType = fact.type;
      if (options.kind === "transactions" && resolvedType === "exclude") result.skip = true;
      try {
        if (!validColumns || row.cells.length !== document.headers.length) throw new ImportValidationError("columns");
        const sourceAccount = get("account") || options.defaultAccount;
        const account = resolveAccount(sourceAccount, row.cells);
        const sourceIdentity = get("sourceId");
        result.sourceKey = rowSourceKey;
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
        if (unsupportedColumns.some((index) => row.cells[index])) throw new ImportValidationError("unsupported");
        if (get("category").includes("|")) throw new ImportValidationError("unsupported");
        const type = resolvedType;
        if (type !== "income" && type !== "expense" && type !== "transfer") throw new ImportValidationError("type");
        const date = fact.date ?? parseImportDate(get("date"), options.dateFormat, get("time"));
        if (date < account.balanceDate) throw new ImportValidationError("balance");
        let amount: number;
        if (options.columns.amount !== undefined) {
          amount = fact.amounts.get(getCurrencyMinorUnitExponent(account.currency)) ?? readAmount(row.cells, account.currency);
        } else {
          const debit = get("debit") ? parseImportAmount(get("debit"), account.currency, options.decimal) : 0;
          const credit = get("credit") ? parseImportAmount(get("credit"), account.currency, options.decimal) : 0;
          if (debit < 0 || credit < 0 || (!!debit === !!credit)) throw new ImportValidationError("amount");
          amount = credit - debit;
          if (!signedAmounts && ((type === "income" && debit) || (type === "expense" && credit))) throw new ImportValidationError("amount");
        }
        if (!amount) throw new ImportValidationError("amount");
        const transaction: PlannedTransaction = { type, accountKey: account.key, amount: signedAmounts ? amount : type === "expense" ? -Math.abs(amount) : type === "income" ? Math.abs(amount) : amount, currency: account.currency, date, name: get("name"), note: get("note"), labels: [...new Set(get("labels").split(";").map((s) => s.trim()).filter(Boolean))] };
        if (transaction.name.length > 200 || transaction.note.length > 1000 || transaction.labels.some((s) => s.length > 100)) throw new ImportValidationError("name");
        if (type === "transfer") {
          // Currency comes from the source; validate the destination independently.
          let destination = get("toAccount");
          if (!destination && options.transferMode === "paired") {
            const lookup = (time: string | number) => {
              let count = 0, sum = 0;
              for (const to of ["", account.key]) {
                const key = (source: string | null = null) => inferenceKey(date.toDateString(), -amount, getCurrencyMinorUnitExponent(account.currency), to, time, source);
                const all = inferred.get(key()), sameAccount = inferred.get(key(account.key));
                count += all.count - sameAccount.count; sum += all.sum - sameAccount.sum;
              }
              return { count, sum };
            };
            const exact = lookup(date.getTime()), matches = exact.count ? exact : lookup("day");
            if (matches.count === 1) destination = facts[matches.sum - 1].name;
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
            const match = categories.get(selected);
            if (!match || match.type !== type) throw new ImportValidationError("category");
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
    };
    rows.push(parseRow());
  }
  // Pair exact opposite legs only. Ambiguous matches are blocked for review.
  if (options.kind === "transactions" && options.transferMode === "paired") {
    const pairing = new ImportCandidateIndex();
    const pairKey = (tx: PlannedTransaction, included: boolean, exact: boolean, reverse = false) =>
      JSON.stringify([accountId(reverse ? tx.toAccountKey! : tx.accountKey), accountId(reverse ? tx.accountKey : tx.toAccountKey!), Math.abs(tx.amount), tx.date.toDateString(), exact ? tx.date.getTime() : "day", included]);
    const indexPair = (row: ImportPreviewRow, index: number, direction: number) => {
      for (const exact of [false, true]) {
        pairing.add(pairKey(row.transaction!, false, exact), index, direction);
        if (!row.skip) pairing.add(pairKey(row.transaction!, true, exact), index, direction);
      }
    };
    for (let index = 0; index < rows.length; index++) {
      yield;
      const row = rows[index];
      if (!row.issue && row.transaction?.type === "transfer" && row.transaction.amount > 0) indexPair(row, index, 1);
    }
    for (const row of [...rows.filter((r) => !r.skip), ...rows.filter((r) => r.skip)]) {
      yield;
      const tx = row.transaction;
      if (!tx || tx.type !== "transfer" || tx.amount >= 0 || row.issue || row.companion) continue;
      const included = !row.skip && pairing.get(pairKey(tx, true, false, true)).count > 0;
      const exact = pairing.get(pairKey(tx, included, true, true));
      const candidates = exact.count ? exact : pairing.get(pairKey(tx, included, false, true));
      if (candidates.count !== 1) { row.issue = "transfer"; continue; }
      const opposite = rows[candidates.sum - 1];
      indexPair(opposite, candidates.sum - 1, -1);
      row.companion = opposite.number; opposite.companion = row.number; opposite.secondary = true;
      // Exclusion applies to both legs; already imported legs must never be recreated.
      row.skip = opposite.skip = row.skip || opposite.skip;
      row.repeated = opposite.repeated = row.repeated || opposite.repeated;
      row.transaction = { ...tx, amount: Math.abs(tx.amount), labels: [...new Set([...tx.labels, ...opposite.transaction!.labels])], note: [...new Set([tx.note, opposite.transaction!.note].filter(Boolean))].join("\n") };
      if (row.transaction.note.length > 1000) row.issue = "name";
    }
    for (const row of rows) if (row.transaction?.type === "transfer" && !row.companion && !row.issue) row.issue = "transfer";
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
  const isPro = constraints?.isPro ?? false;
  const maxActiveAccounts = constraints?.maxActiveAccounts ?? 5;
  const existingActiveCount = catalog.accounts.filter((a) => !a.isArchived).length;
  const remainingFreeSlots = isPro ? Number.POSITIVE_INFINITY : Math.max(0, maxActiveAccounts - existingActiveCount);
  const acceptedNewAccountKeys = new Set<string>();
  const blockedNewAccountKeys = new Set<string>();
  const reserveNewAccounts = (keys: (string | undefined)[]): boolean => {
    if (isPro) return true;
    const needed = [...new Set(keys.filter((k): k is string => Boolean(k) && accounts.has(k!) && !accounts.get(k!)!.id && !accounts.get(k!)!.isArchived))];
    const unseen = needed.filter((k) => !acceptedNewAccountKeys.has(k));
    if (!unseen.length) return true;
    if (unseen.some((k) => blockedNewAccountKeys.has(k)) || acceptedNewAccountKeys.size + unseen.length > remainingFreeSlots) {
      for (const k of unseen) blockedNewAccountKeys.add(k);
      return false;
    }
    for (const k of unseen) acceptedNewAccountKeys.add(k);
    return true;
  };
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
    yield;
    const tx = row.transaction;
    if (!tx) {
      const accountKey = normalizeImportName(cellValue(row.cells, options, "account") || options.defaultAccount);
      if (!reserveNewAccounts([accountKey])) { row.issue = "freeAccountLimit"; continue; }
      actualAccounts.add(accountKey);
      continue;
    }
    const fingerprint = transactionFingerprint(tx.type, accountId(tx.accountKey), tx.toAccountKey ? accountId(tx.toAccountKey) : "", tx.date, tx.amount, tx.name);
    row.duplicate = fingerprints.has(fingerprint);
    if (row.duplicate && options.decisions[row.number] !== "import") { row.issue = "duplicate"; continue; }
    if (!reserveNewAccounts([tx.accountKey, tx.toAccountKey])) { row.issue = "freeAccountLimit"; continue; }
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
    if (tx.type === "expense") expense[tx.currency] = (expense[tx.currency] || 0) - tx.amount;
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
  return { ...preview, signature: yield* importJsonDigestWork(preview) };
}

function* importJsonDigestWork(value: unknown): Generator<void, string> {
  const hash = sha256.create();
  // Preserve the signature's JSON representation while bounding serialization and hashing work.
  function* digest(value: unknown): Generator<void> {
    if (Array.isArray(value)) {
      hash.update(utf8ToBytes("["));
      for (let index = 0; index < value.length; index++) {
        if (index) hash.update(utf8ToBytes(","));
        yield* digest(value[index]);
      }
      hash.update(utf8ToBytes("]"));
    } else if (value && typeof value === "object" && !(value instanceof Date)) {
      hash.update(utf8ToBytes("{"));
      let first = true;
      for (const [key, entry] of Object.entries(value)) {
        if (entry === undefined) continue;
        if (!first) hash.update(utf8ToBytes(","));
        first = false;
        hash.update(utf8ToBytes(JSON.stringify(key) + ":"));
        yield* digest(entry);
      }
      hash.update(utf8ToBytes("}"));
    } else if (typeof value === "string") {
      hash.update(utf8ToBytes('"'));
      for (let offset = 0; offset < value.length;) {
        yield;
        const end = utf8ChunkEnd(value, offset);
        hash.update(utf8ToBytes(JSON.stringify(value.slice(offset, end)).slice(1, -1)));
        offset = end;
      }
      hash.update(utf8ToBytes('"'));
    } else {
      const serialized = JSON.stringify(value) ?? "null";
      // Encode first so a chunk boundary cannot split a Unicode surrogate pair.
      const bytes = utf8ToBytes(serialized);
      for (let offset = 0; offset < bytes.length; offset += 4096) {
        yield;
        hash.update(bytes.subarray(offset, offset + 4096));
      }
    }
  }
  yield* digest(value);
  return bytesToHex(hash.digest());
}

function utf8ChunkEnd(value: string, offset: number): number {
  let end = Math.min(value.length, offset + 4096);
  const last = value.charCodeAt(end - 1);
  if (end < value.length && last >= 0xd800 && last <= 0xdbff) end--;
  return end;
}
