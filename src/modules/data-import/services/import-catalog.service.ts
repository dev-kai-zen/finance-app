import { db, type DbContext } from "@/infrastructure/database/client";
import { getAccountImportCatalog } from "@/modules/accounts";
import { DEFAULT_OTHERS_CATEGORY_IDS, getCategoryImportCatalog } from "@/modules/categories";
import { getCategoryKeywordMapSync } from "@/modules/chat-with-kai";
import { getImportCurrencies } from "@/modules/currencies";
import { isSampleWorkspace } from "@/modules/onboarding";
import { getTransactionImportCatalog } from "@/modules/transactions";
import { listImportedSourceKeys } from "../repositories/imports.repository";
import type { ImportCatalog } from "../types/import.types";
import { transactionFingerprint } from "../utils/csv";

export function getImportCatalog(
  context: DbContext = db,
  options?: { includeFingerprints?: boolean },
): ImportCatalog {
  const includeFingerprints = options?.includeFingerprints !== false;
  const sampleMode = isSampleWorkspace(context);
  const accountCatalog = getAccountImportCatalog(context);
  const accounts = sampleMode ? [] : accountCatalog.accounts;
  const categoryCatalog = sampleMode ? [] : getCategoryImportCatalog(context);
  let categoryKeywordsMap: Map<string, string> | undefined;
  if (!sampleMode) {
    try {
      categoryKeywordsMap = getCategoryKeywordMapSync(context);
    } catch {
      categoryKeywordsMap = undefined;
    }
  }
  return {
    accountTypes: accountCatalog.accountTypes,
    accounts,
    categories: categoryCatalog.map((c) => ({ ...c, parentId: c.parentId ?? null })),
    pickerAccounts: accounts.filter((a) => !a.isArchived),
    pickerAccountTypes: accountCatalog.accountTypes,
    pickerCategories: categoryCatalog,
    categoryKeywordsMap,
    fallbackCategoryIds: DEFAULT_OTHERS_CATEGORY_IDS,
    currencies: getImportCurrencies(context),
    sourceKeys: sampleMode ? [] : listImportedSourceKeys(context),
    fingerprints:
      !sampleMode && includeFingerprints
        ? getTransactionImportCatalog(context).map((t) =>
            transactionFingerprint(
              t.type,
              t.accountId,
              t.toAccountId,
              t.date,
              t.amount,
              t.name,
            ),
          )
        : [],
  };
}
