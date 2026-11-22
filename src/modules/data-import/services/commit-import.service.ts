import { randomUUID } from "expo-crypto";
import { db } from "@/infrastructure/database/client";
import { StagedDatabaseChangedError, withStagedDatabaseTransaction } from "@/infrastructure/database/staged-transaction";
import { createImportedAccount } from "@/modules/accounts";
import { resolveImportedCategory } from "@/modules/categories";
import { reconcileImportedCreditCardBillingWork } from "@/modules/credit-cards";
import { resolveImportLabels } from "@/modules/labels";
import { createLocalBackup } from "@/modules/local-backup";
import {
  canImportWorkspaceData,
  clearSampleWorkspaceIfNeeded,
  markOnboardingPendingInContext,
} from "@/modules/onboarding";
import { getCurrentProStatus, PRO_LIMITS } from "@/modules/pro";
import { createImportedTransactionsWork, type ImportedTransactionCommand } from "@/modules/transactions";
import { insertImportBatch, insertImportRecord } from "../repositories/imports.repository";
import type { CsvDocument, ImportOptions } from "../types/import.types";
import { ImportValidationError, normalizeImportName } from "../utils/csv";
import { cellValue } from "../utils/import-preview";
import { getImportCatalog } from "./import-catalog.service";
import { prepareImportPreviewWork, prepareImportPreviewAsync } from "./prepare-import-preview.service";
import { runImportWork } from "../utils/import-work";
import { getCurrencyMinorUnitExponent } from "@/utils/currency";
import { logTelemetryEvent } from "@/infrastructure/telemetry";

let importing = false;
function decimalAmount(amount: number, currency: string): string {
  const exponent = getCurrencyMinorUnitExponent(currency), abs = Math.abs(amount), divisor = 10 ** exponent;
  return `${amount < 0 ? "-" : ""}${Math.floor(abs / divisor)}${exponent ? `.${String(abs % divisor).padStart(exponent, "0")}` : ""}`;
}
function dateInput(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

export async function commitImport(
  document: CsvDocument,
  options: ImportOptions,
  fileHash: string,
  fileName: string,
  signature: string,
  commitOptions?: { allowOnboarding?: boolean },
) {
  if (importing) throw new ImportValidationError("busy");
  importing = true;
  // Snapshot the reviewed draft so user interactions cannot change it during backup.
  const draft = JSON.parse(JSON.stringify(options)) as ImportOptions;
  const allowOnboarding = Boolean(commitOptions?.allowOnboarding);
  try {
    if (!canImportWorkspaceData(db, { allowOnboarding })) throw new ImportValidationError("workspace");
    const isPro = getCurrentProStatus().isPro;
    const previewConstraints = { isPro, maxActiveAccounts: PRO_LIMITS.FREE_MAX_ACCOUNTS };
    const preview = await prepareImportPreviewAsync(document, draft, getImportCatalog(), fileHash, previewConstraints);
    if (!preview.ready || preview.signature !== signature) throw new ImportValidationError("changed");
    try { await createLocalBackup(null, "safety"); }
    catch { throw new ImportValidationError("backup"); }
    const committed = await withStagedDatabaseTransaction(async (tx) => runImportWork((function* () {
      if (!canImportWorkspaceData(tx, { allowOnboarding })) throw new ImportValidationError("workspace");
      clearSampleWorkspaceIfNeeded(tx, { preserveAccountTypes: true });
      if (allowOnboarding) {
        markOnboardingPendingInContext(tx, draft.defaultCurrency);
      }
      const freshCatalog = getImportCatalog(tx);
      const fresh = yield* prepareImportPreviewWork(document, draft, freshCatalog, fileHash, previewConstraints, tx);
      if (!fresh.ready || fresh.signature !== signature) throw new ImportValidationError("changed");
      if (!isPro) {
        const existingActiveCount = freshCatalog.accounts.filter((a) => !a.isArchived).length;
        const plannedNewAccounts = fresh.accounts.filter((a) => !a.id && !a.isArchived).length;
        if (existingActiveCount + plannedNewAccounts > PRO_LIMITS.FREE_MAX_ACCOUNTS) {
          throw new ImportValidationError("freeAccountLimit");
        }
      }
      const batchId = randomUUID(), accountIds = new Map<string, string>();
      const newAccounts: string[] = [], categoryIds = new Map<string, string>();
      for (const account of fresh.accounts) {
        yield;
        const id = account.id ?? createImportedAccount({
          name: account.name, accountTypeId: account.accountTypeId, currencyCode: account.currency,
          openingAmount: decimalAmount(account.openingBalance, account.currency), openingDate: dateInput(account.balanceDate),
          note: account.note,
          hideFromSelection: false, hideFromReports: false, pocketEnabled: false,
          creditCardDetails: account.creditCardDetails
            ? {
                creditLimit: decimalAmount(account.creditCardDetails.creditLimit, account.currency),
                statementDay: String(account.creditCardDetails.statementDay),
                paymentDueDay: String(account.creditCardDetails.paymentDueDay),
              }
            : undefined,
        }, tx, { isArchived: account.isArchived });
        accountIds.set(account.key, id);
        if (!account.id) {
          newAccounts.push(id);
        }
      }
      const rows = fresh.rows.filter((r) => !r.skip && !r.issue && !r.secondary);
      const commands: ImportedTransactionCommand[] = [];
      for (const row of rows) {
        yield;
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
      const recordIds = yield* createImportedTransactionsWork(commands, tx);
      yield* reconcileImportedCreditCardBillingWork([...new Set(accountIds.values())], new Date(), tx);
      const summary = {
        accounts: fresh.balances.map((b) => ({ name: b.name, currency: b.currency, balance: b.after })),
        newAccounts, dateFrom: fresh.dateFrom, dateTo: fresh.dateTo,
        excluded: fresh.rows.filter((r) => r.skip).map((r) => ({ row: r.number, reason: r.repeated ? "repeated" : r.issue || "excluded" })),
      };
      insertImportBatch({ id: batchId, fileName, kind: draft.kind, source: draft.source.trim() || "CSV", importedCount: fresh.accepted, skippedCount: fresh.skipped, summaryJson: JSON.stringify(summary), createdAt: new Date() }, tx);
      const rowsByNumber = new Map(fresh.rows.map((r) => [r.number, r]));
      for (let index = 0; index < rows.length; index++) {
        yield;
        const row = rows[index];
        const sourceAccount = normalizeImportName(cellValue(row.cells, draft, "account") || draft.defaultAccount);
        const ids = draft.kind === "transactions" ? recordIds[index] : [accountIds.get(sourceAccount)!];
        insertImportRecord({ id: randomUUID(), batchId, sourceKey: row.sourceKey, rowNumber: row.number, recordIdsJson: JSON.stringify(ids) }, tx);
        if (row.companion) {
          const other = rowsByNumber.get(row.companion)!;
          insertImportRecord({ id: randomUUID(), batchId, sourceKey: other.sourceKey, rowNumber: other.number, recordIdsJson: JSON.stringify(ids) }, tx);
        }
      }
      return { imported: fresh.accepted, skipped: fresh.skipped, batchId };
    })()));

    const bracket =
      committed.imported < 100
        ? "under_100"
        : committed.imported <= 1000
          ? "100_to_1000"
          : "over_1000";
    logTelemetryEvent("csv_import_completed", { bracket, success: true });
    return committed;
  } catch (error) {
    if (error instanceof StagedDatabaseChangedError) throw new ImportValidationError("changed");
    throw error;
  } finally {
    importing = false;
  }
}
