import { db, type DbContext } from "@/infrastructure/database/client";
import { getTransactionImportCatalog } from "@/modules/transactions";
import { isSampleWorkspace } from "@/modules/onboarding";
import { listImportedSourceKeys } from "../repositories/imports.repository";
import type { CsvDocument, ImportCatalog, ImportOptions, ImportPreview, ImportPreviewConstraints } from "../types/import.types";
import { transactionFingerprint } from "../utils/csv";
import { importPreviewWork } from "../utils/import-preview";
import { runImportWork, type ImportWorkOptions } from "../utils/import-work";

/** Comparison reads are scoped to this draft, never the whole ledger/import history. */
export function* prepareImportPreviewWork(
  document: CsvDocument, options: ImportOptions, catalog: ImportCatalog, fileHash: string,
  constraints?: ImportPreviewConstraints, context: DbContext = db,
): Generator<void, ImportPreview> {
  const preliminary = yield* importPreviewWork(document, options, catalog, fileHash, constraints);
  if (isSampleWorkspace(context)) return preliminary;
  const keys = [...new Set(preliminary.rows.map((r) => r.sourceKey).filter(Boolean))];
  const sourceKeys: string[] = [];
  for (let offset = 0; offset < keys.length; offset += 500) {
    yield;
    sourceKeys.push(...listImportedSourceKeys(keys.slice(offset, offset + 500), context));
  }
  const wanted = new Set<string>();
  const accountId = (key: string) => options.accounts[key]?.existingId || `new:${key}`;
  const candidates = preliminary.rows.flatMap((row) => {
    const tx = row.transaction;
    if (!tx || row.secondary || !options.accounts[tx.accountKey]?.existingId) return [];
    const amount = tx.type === "transfer" ? Math.abs(tx.amount) : tx.amount;
    wanted.add(transactionFingerprint(tx.type, accountId(tx.accountKey), tx.toAccountKey ? accountId(tx.toAccountKey) : "", tx.date, amount, tx.name));
    return [{
      type: tx.type, accountId: accountId(tx.accountKey), amount, date: tx.date,
    }];
  });
  const fingerprints = new Set<string>();
  for (const page of getTransactionImportCatalog(candidates, context)) {
    yield;
    for (const t of page) {
      yield;
      const fingerprint = transactionFingerprint(t.type, t.accountId, t.toAccountId, t.date, t.amount, t.name);
      if (wanted.has(fingerprint)) fingerprints.add(fingerprint);
    }
    if (fingerprints.size === wanted.size) break;
  }
  return yield* importPreviewWork(document, options, { ...catalog, sourceKeys, fingerprints: [...fingerprints] }, fileHash, constraints);
}

export function prepareImportPreview(
  document: CsvDocument, options: ImportOptions, catalog: ImportCatalog, fileHash: string,
  constraints?: ImportPreviewConstraints, context: DbContext = db,
): ImportPreview {
  const work = prepareImportPreviewWork(document, options, catalog, fileHash, constraints, context);
  let result = work.next();
  while (!result.done) result = work.next();
  return result.value;
}

export function prepareImportPreviewAsync(
  document: CsvDocument, options: ImportOptions, catalog: ImportCatalog, fileHash: string,
  constraints?: ImportPreviewConstraints, workOptions?: ImportWorkOptions,
): Promise<ImportPreview> {
  return runImportWork(prepareImportPreviewWork(document, options, catalog, fileHash, constraints), workOptions);
}
