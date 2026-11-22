import { db, type DbContext } from "@/infrastructure/database/client";
import { getAccountImportCatalog } from "@/modules/accounts";
import { DEFAULT_OTHERS_CATEGORY_IDS, getCategoryImportCatalog } from "@/modules/categories";
import { getCategoryKeywordMapSync } from "@/modules/chat-with-kai";
import { getImportCurrencies } from "@/modules/currencies";
import { isSampleWorkspace } from "@/modules/onboarding";
import type { ImportCatalog } from "../types/import.types";

export function getImportCatalog(
  context: DbContext = db,
): ImportCatalog {
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
    sourceKeys: [],
    fingerprints: [],
  };
}
