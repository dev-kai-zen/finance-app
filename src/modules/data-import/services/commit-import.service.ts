import { randomUUID } from "expo-crypto";
import { db } from "@/infrastructure/database/client";
import { createImportedAccount } from "@/modules/accounts";
import { resolveImportedCategory } from "@/modules/categories";
import { resolveImportLabels } from "@/modules/labels";
import { createLocalBackup } from "@/modules/local-backup";
import { isPersonalWorkspace } from "@/modules/onboarding";
import { createImportedTransactions, type ImportedTransactionCommand } from "@/modules/transactions";
import { insertImportBatch, insertImportRecord } from "../repositories/imports.repository";
import type { CsvDocument, ImportOptions } from "../types/import.types";
import { ImportValidationError, normalizeImportName } from "../utils/csv";
import { buildImportPreview, cellValue } from "../utils/import-preview";
import { getImportCatalog } from "./import-catalog.service";
import { getCurrencyMinorUnitExponent } from "@/utils/currency";

let importing = false;
function decimalAmount(amount: number, currency: string): string {
  const exponent = getCurrencyMinorUnitExponent(currency), abs = Math.abs(amount), divisor = 10 ** exponent;
  return `${amount < 0 ? "-" : ""}${Math.floor(abs / divisor)}${exponent ? `.${String(abs % divisor).padStart(exponent, "0")}` : ""}`;
}
function dateInput(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

export async function commitImport(document: CsvDocument, options: ImportOptions, fileHash: string, fileName: string, signature: string) {
  if (importing) throw new ImportValidationError("busy");
  importing = true;
  // Snapshot the reviewed draft so user interactions cannot change it during backup.
  const draft = JSON.parse(JSON.stringify(options)) as ImportOptions;
  try {
    if (!isPersonalWorkspace()) throw new ImportValidationError("workspace");
    const preview = buildImportPreview(document, draft, getImportCatalog(), fileHash);
    if (!preview.ready || preview.signature !== signature) throw new ImportValidationError("changed");
    try { await createLocalBackup(null, "safety"); }
    catch { throw new ImportValidationError("backup"); }
    return db.transaction((tx) => {
      if (!isPersonalWorkspace(tx)) throw new ImportValidationError("workspace");
      const fresh = buildImportPreview(document, draft, getImportCatalog(tx), fileHash);
      if (!fresh.ready || fresh.signature !== signature) throw new ImportValidationError("changed");
      const batchId = randomUUID(), accountIds = new Map<string, string>();
      const newAccounts: string[] = [], categoryIds = new Map<string, string>();
      for (const account of fresh.accounts) {
        const id = account.id ?? createImportedAccount({
          name: account.name, accountTypeId: account.accountTypeId, currencyCode: account.currency,
          openingAmount: decimalAmount(account.openingBalance, account.currency), openingDate: dateInput(account.balanceDate),
          note: account.note,
          hideFromSelection: false, hideFromReports: false, pocketEnabled: false,
        }, tx);
        accountIds.set(account.key, id);
        if (!account.id) newAccounts.push(id);
      }
      const rows = fresh.rows.filter((r) => !r.skip && !r.issue && !r.secondary);
      const commands: ImportedTransactionCommand[] = [];
      for (const row of rows) {
        const item = row.transaction;
        if (!item) continue;
        const labelIds = resolveImportLabels(item.labels, tx);
        if (item.type === "transfer") {
          commands.push({ kind: "transfer", input: { fromAccountId: accountIds.get(item.accountKey)!, toAccountId: accountIds.get(item.toAccountKey!)!, amountMinorUnits: Math.abs(item.amount), occurredAt: item.date, name: item.name, note: item.note, labelIds } });
        } else {
          let categoryId = item.categoryId || categoryIds.get(item.categoryKey!);
          if (!categoryId) {
            const parentId = item.parentName ? resolveImportedCategory({ name: item.parentName, type: item.type }, tx) : undefined;
            categoryId = resolveImportedCategory({ name: item.categoryName!, type: item.type, parentId }, tx);
            categoryIds.set(item.categoryKey!, categoryId);
          }
          commands.push({ kind: "transaction", input: { accountId: accountIds.get(item.accountKey)!, categoryId, type: item.type, amountMinorUnits: item.amount, occurredAt: item.date, name: item.name, note: item.note, labelIds } });
        }
      }
      const recordIds = commands.length ? createImportedTransactions(commands, tx) : [];
      const summary = {
        accounts: fresh.balances.map((b) => ({ name: b.name, currency: b.currency, balance: b.after })),
        newAccounts, dateFrom: fresh.dateFrom, dateTo: fresh.dateTo,
        excluded: fresh.rows.filter((r) => r.skip).map((r) => ({ row: r.number, reason: r.repeated ? "repeated" : r.issue || "excluded" })),
      };
      insertImportBatch({ id: batchId, fileName, kind: draft.kind, source: draft.source.trim() || "CSV", importedCount: fresh.accepted, skippedCount: fresh.skipped, summaryJson: JSON.stringify(summary), createdAt: new Date() }, tx);
      rows.forEach((row, index) => {
        const sourceAccount = normalizeImportName(cellValue(row.cells, draft, "account") || draft.defaultAccount);
        const ids = draft.kind === "transactions" ? recordIds[index] : [accountIds.get(sourceAccount)!];
        insertImportRecord({ id: randomUUID(), batchId, sourceKey: row.sourceKey, rowNumber: row.number, recordIdsJson: JSON.stringify(ids) }, tx);
        if (row.companion) {
          const other = fresh.rows.find((r) => r.number === row.companion)!;
          insertImportRecord({ id: randomUUID(), batchId, sourceKey: other.sourceKey, rowNumber: other.number, recordIdsJson: JSON.stringify(ids) }, tx);
        }
      });
      return { imported: fresh.accepted, skipped: fresh.skipped, batchId };
    });
  } finally { importing = false; }
}
