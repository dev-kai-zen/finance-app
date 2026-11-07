import { db, type DbContext } from "@/infrastructure/database/client";
import {
  getAccountsWithBalances,
  getAccountTypes,
  saveAccountInContext,
  type AccountListItem,
} from "@/modules/accounts";
import { getCategories, saveCategory } from "@/modules/categories";
import { reconcileCreditCardBillingInContext } from "@/modules/credit-cards";
import { listCurrencies } from "@/modules/currencies";
import {
  assignTransactionLabels,
  createLabel,
  getLabels,
} from "@/modules/labels";
import { createLocalBackup } from "@/modules/local-backup";
import { isPersonalWorkspace } from "@/modules/onboarding";
import {
  createTransactionInContext,
  createTransferInContext,
  findSimilarTransaction,
} from "@/modules/transactions";
import { getCurrencyMinorUnitExponent } from "@/utils/currency";
import type {
  AccountMatchDecision,
  CategoryMatchDecision,
  ColumnMappingConfig,
  ImportPreviewSummary,
  ImportType,
  ParsedCsvFile,
  ParsedDataRow,
} from "../types/data-import.types";
import {
  findExistingSourceIdentities,
  insertImportBatch,
  insertImportedSourceIdentities,
  type InsertSourceIdentityRow,
} from "../repositories/data-import.repository";
import { buildCategoryKey, resolveRowLabels } from "./match-categories.service";
import { buildImportPreview } from "./build-import-preview.service";

export interface ExecuteImportInput {
  parsedFile: ParsedCsvFile;
  importType: ImportType;
  config: ColumnMappingConfig;
  accountMatches: Record<string, AccountMatchDecision>;
  categoryMatches: Record<string, CategoryMatchDecision>;
  rowOverrides?: Record<number, Partial<ParsedDataRow>>;
  userExcludedRows?: Set<number>;
  userConfirmedSimilarRows?: Set<number>;
}

export interface ExecuteImportResult {
  batchId: string;
  importedCount: number;
  leftOutCount: number;
  summary: ImportPreviewSummary;
  createdAccountIds: string[];
  createdCategoryIds: string[];
  createdTransactionIds: string[];
}

export async function executeDataImport(
  input: ExecuteImportInput,
  context: DbContext = db,
): Promise<ExecuteImportResult> {
  // 1. Verify personal workspace
  if (!isPersonalWorkspace(context)) {
    throw new Error(
      "Data import is only available in your personal workspace. Please switch to your personal workspace first.",
    );
  }

  // 2. Load latest database entities to rebuild and verify preview
  const existingAccounts = getAccountsWithBalances(context);
  const existingCategories = await getCategories(context);
  const activeCurrencies = listCurrencies(context);
  const availableTypes = getAccountTypes(context);

  // Load previously imported identities for the file
  const candidateIdentities: string[] = [];
  for (let r = 1; r <= input.parsedFile.rawRows.length; r++) {
    candidateIdentities.push(
      `${input.importType}:${input.config.sourceName || "CSV"}:${input.parsedFile.fileHash}:${r}`,
    );
  }
  const previouslyImported = findExistingSourceIdentities(candidateIdentities, context);

  // 3. Rebuild preview and verify
  const preview = buildImportPreview({
    parsedFile: input.parsedFile,
    importType: input.importType,
    config: input.config,
    accountMatches: input.accountMatches,
    categoryMatches: input.categoryMatches,
    existingAccounts,
    existingCategories,
    activeCurrencies: activeCurrencies as any,
    availableAccountTypes: availableTypes,
    previouslyImportedIdentities: previouslyImported,
    similarTransactionChecker: (check) => findSimilarTransaction(check, context),
    rowOverrides: input.rowOverrides,
    userExcludedRows: input.userExcludedRows,
    userConfirmedSimilarRows: input.userConfirmedSimilarRows,
  });

  if (!preview.summary.canImport) {
    throw new Error(
      "The import preview is no longer ready. Please review the rows that need attention before importing.",
    );
  }

  // 4. Create local safety backup first!
  try {
    await createLocalBackup(null, "safety");
  } catch (backupError: any) {
    throw new Error(
      `Safety backup failed: ${backupError?.message || "Unable to create backup"}. No data was imported.`,
    );
  }

  // 5. Execute all database writes in ONE atomic transaction
  const executeWrites = async (tx: DbContext): Promise<ExecuteImportResult> => {
    const createdAccountIds: string[] = [];
    const createdCategoryIds: string[] = [];
    const createdTransactionIds: string[] = [];
    const sourceIdentityRecords: InsertSourceIdentityRow[] = [];

    // Map account source name (lowercase) -> accountId
    const resolvedAccountIdMap = new Map<string, string>();
    for (const [key, decision] of Object.entries(input.accountMatches)) {
      if (decision.mode === "existing" && decision.existingAccountId) {
        resolvedAccountIdMap.set(key, decision.existingAccountId);
      } else if (decision.mode === "new" && decision.newAccount) {
        const newAcc = decision.newAccount;
        const newId = saveAccountInContext(
          {
            name: newAcc.name,
            accountTypeId: newAcc.accountTypeId,
            currencyCode: newAcc.currencyCode,
            openingAmount: (newAcc.openingBalanceMinorUnits / (10 ** getCurrencyMinorUnitExponent(newAcc.currencyCode))).toString(),
            openingDate: newAcc.balanceDate.toISOString().split("T")[0],
            note: newAcc.note,
            hideFromSelection: false,
            hideFromReports: false,
            pocketEnabled: false,
          },
          undefined,
          tx,
        );
        resolvedAccountIdMap.set(key, newId);
        createdAccountIds.push(newId);
      }
    }

    // Map category key -> categoryId
    const resolvedCategoryIdMap = new Map<string, string>();
    for (const [key, decision] of Object.entries(input.categoryMatches)) {
      if ((decision.mode === "existing" || decision.mode === "default_other") && decision.existingCategoryId) {
        resolvedCategoryIdMap.set(key, decision.existingCategoryId);
      } else if (decision.mode === "new" && decision.newCategory) {
        const newCat = decision.newCategory;
        const savedCat = await saveCategory(
          {
            name: newCat.name.slice(0, 50),
            type: newCat.type,
            parentId: newCat.parentId ?? null,
          },
          undefined,
          tx,
        );
        resolvedCategoryIdMap.set(key, savedCat.id);
        createdCategoryIds.push(savedCat.id);
      }
    }

    // Cache labels in memory for transaction
    let currentLabels = getLabels(tx, { includeArchived: true });
    const labelNameToId = new Map<string, string>();
    for (const l of currentLabels) {
      labelNameToId.set(l.name.trim().toLowerCase(), l.id);
    }

    const ensureLabel = (name: string): string => {
      const lower = name.trim().toLowerCase();
      if (labelNameToId.has(lower)) {
        return labelNameToId.get(lower)!;
      }
      const created = createLabel({ name: name.trim().slice(0, 100) }, tx);
      labelNameToId.set(lower, created.id);
      return created.id;
    };

    const now = new Date();
    const batchId = "batch_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

    if (input.importType === "accounts") {
      // Accounts only import
      for (const row of preview.rows) {
        if (row.status !== "ready") continue;

        const lowerName = (row.accountName || "").toLowerCase();
        let accId = resolvedAccountIdMap.get(lowerName);

        if (!accId) {
          // Create account from row details
          const exponent = getCurrencyMinorUnitExponent(row.currencyCode || "PHP");
          const majorUnits = ((row.openingBalanceMinorUnits || 0) / (10 ** exponent)).toString();
          const openDate = (row.balanceDate || now).toISOString().split("T")[0];

          // Find matching account type or fallback
          const matchedType = availableTypes.find(
            (t) => t.name.trim().toLowerCase() === (row.accountType || "").trim().toLowerCase(),
          ) || availableTypes[0];

          accId = saveAccountInContext(
            {
              name: (row.accountName || "Account").slice(0, 100),
              accountTypeId: matchedType?.id ?? "",
              currencyCode: row.currencyCode || "PHP",
              openingAmount: majorUnits,
              openingDate: openDate,
              note: row.note,
              hideFromSelection: false,
              hideFromReports: false,
              pocketEnabled: false,
            },
            undefined,
            tx,
          );
          resolvedAccountIdMap.set(lowerName, accId);
          createdAccountIds.push(accId);
        }

        sourceIdentityRecords.push({
          batchId,
          sourceIdentity: row.sourceIdentity,
          rowNumber: row.rowNumber,
          createdRecordIds: [accId],
          createdAt: now,
        });
      }
    } else {
      // Transaction history import
      const handledPairedRows = new Set<number>();

      for (const row of preview.rows) {
        if (row.status !== "ready") continue;

        // For paired transfers, only process once
        if (row.type === "transfer" && row.pairedRowNumber) {
          if (handledPairedRows.has(row.rowNumber)) {
            continue;
          }
        }

        const sourceAccId = resolvedAccountIdMap.get((row.accountName || "").toLowerCase());
        if (!sourceAccId) {
          throw new Error(`Account "${row.accountName}" could not be resolved.`);
        }

        // Resolve labels
        const labelIds: string[] = [];
        if (row.labels && row.labels.length > 0) {
          for (const lblName of row.labels) {
            labelIds.push(ensureLabel(lblName));
          }
        }

        const rowDate = row.date || now;

        if (row.type === "transfer") {
          // Transfer creation
          const destAccId = resolvedAccountIdMap.get((row.toAccountName || "").toLowerCase());
          if (!destAccId) {
            throw new Error(`Destination account "${row.toAccountName}" could not be resolved.`);
          }

          const transferRes = createTransferInContext(
            {
              fromAccountId: sourceAccId,
              toAccountId: destAccId,
              amountMinorUnits: Math.abs(row.amountMinorUnits || 0),
              occurredAt: rowDate,
              name: row.description,
              note: row.note,
            },
            tx,
          );

          createdTransactionIds.push(transferRes.outLeg.id, transferRes.inLeg.id);

          if (labelIds.length > 0) {
            assignTransactionLabels(transferRes.outLeg.id, labelIds, tx);
            assignTransactionLabels(transferRes.inLeg.id, labelIds, tx);
          }

          const createdIds = [transferRes.outLeg.id, transferRes.inLeg.id];

          sourceIdentityRecords.push({
            batchId,
            sourceIdentity: row.sourceIdentity,
            rowNumber: row.rowNumber,
            createdRecordIds: createdIds,
            createdAt: now,
          });

          if (row.pairedRowNumber) {
            handledPairedRows.add(row.rowNumber);
            handledPairedRows.add(row.pairedRowNumber);

            const pairedRow = preview.rows.find((r) => r.rowNumber === row.pairedRowNumber);
            if (pairedRow) {
              sourceIdentityRecords.push({
                batchId,
                sourceIdentity: pairedRow.sourceIdentity,
                rowNumber: pairedRow.rowNumber,
                createdRecordIds: createdIds,
                createdAt: now,
              });
            }
          }
        } else {
          // Income or Expense creation
          const catKey = buildCategoryKey(
            row.type as "income" | "expense",
            row.categoryName || "",
            row.subcategoryName,
          );
          const categoryId = resolvedCategoryIdMap.get(catKey) || null;

          const createdTx = createTransactionInContext(
            {
              accountId: sourceAccId,
              categoryId: categoryId,
              type: row.type as "income" | "expense",
              currencyCode: row.currencyCode,
              amountMinorUnits: row.amountMinorUnits || 0,
              name: row.description,
              note: row.note,
              occurredAt: rowDate,
              labelIds,
            },
            tx,
          );

          createdTransactionIds.push(createdTx.id);

          sourceIdentityRecords.push({
            batchId,
            sourceIdentity: row.sourceIdentity,
            rowNumber: row.rowNumber,
            createdRecordIds: [createdTx.id],
            createdAt: now,
          });
        }
      }
    }

    // Reconcile credit cards once after all transactions created
    reconcileCreditCardBillingInContext(now, tx);

    // Compute left out row numbers & reasons for history summary
    const leftOutRows = preview.rows
      .filter((r) => r.status !== "ready")
      .map((r) => ({
        rowNumber: r.rowNumber,
        reason: r.issues.join("; ") || "Excluded by user",
      }));

    // Resulting balances
    const latestAccounts = getAccountsWithBalances(tx);
    const accountBalancesSummary = latestAccounts
      .filter((a) => resolvedAccountIdMap.has(a.name.toLowerCase()))
      .map((a) => ({
        accountName: a.name,
        currencyCode: a.currencyCode,
        balanceBeforeMinorUnits: a.openingBalanceMinorUnits,
        balanceAfterMinorUnits: a.currentBalanceMinorUnits,
      }));

    const batchSummaryJson = JSON.stringify({
      totalIncomeMinorUnits: preview.summary.totalIncomeMinorUnits,
      totalExpenseMinorUnits: preview.summary.totalExpenseMinorUnits,
      accountBalances: accountBalancesSummary,
      dateRange: {
        earliest: preview.summary.earliestDate?.toISOString() || "",
        latest: preview.summary.latestDate?.toISOString() || "",
      },
      leftOutRows,
    });

    // Insert batch record and source identity records
    insertImportBatch(
      {
        id: batchId,
        fileName: input.parsedFile.fileName,
        importType: input.importType,
        sourceName: input.config.sourceName || "CSV",
        importedCount: preview.summary.readyCount,
        leftOutCount: preview.summary.leftOutCount,
        summary: batchSummaryJson,
        createdAt: now,
      },
      tx,
    );

    insertImportedSourceIdentities(sourceIdentityRecords, tx);

    return {
      batchId,
      importedCount: preview.summary.readyCount,
      leftOutCount: preview.summary.leftOutCount,
      summary: preview.summary,
      createdAccountIds,
      createdCategoryIds,
      createdTransactionIds,
    };
  };

  if (context === db) {
    return await db.transaction(executeWrites);
  }
  return await executeWrites(context);
}

