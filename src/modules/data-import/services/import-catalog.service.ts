import { db, type DbContext } from "@/infrastructure/database/client";
import { getAccountImportCatalog } from "@/modules/accounts";
import { DEFAULT_OTHERS_CATEGORY_IDS, getCategoryImportCatalog } from "@/modules/categories";
import { getCategoryKeywordMapSync } from "@/modules/chat-with-kai";
import { getImportCurrencies } from "@/modules/currencies";
import { getTransactionImportCatalog } from "@/modules/transactions";
import { listImportedSourceKeys } from "../repositories/imports.repository";
import type { ImportCatalog } from "../types/import.types";
import { transactionFingerprint } from "../utils/csv";

export function getImportCatalog(
  context: DbContext = db,
  options?: { includeFingerprints?: boolean },
): ImportCatalog {
  const includeFingerprints = options?.includeFingerprints !== false;
  const accountCatalog = getAccountImportCatalog(context);
  const categoryCatalog = getCategoryImportCatalog(context);
  let categoryKeywordsMap: Map<string, string> | undefined;
  try {
    categoryKeywordsMap = getCategoryKeywordMapSync(context);
  } catch {
    categoryKeywordsMap = undefined;
  }
  return {
    ...accountCatalog, categories: categoryCatalog.map((c) => ({ ...c, parentId: c.parentId ?? null })),
    pickerAccounts: accountCatalog.accounts.filter((a) => !a.creditCard && !a.isArchived),
    pickerAccountTypes: accountCatalog.accountTypes.filter((a) => !a.creditCard),
    pickerCategories: categoryCatalog,
    categoryKeywordsMap,
    fallbackCategoryIds: DEFAULT_OTHERS_CATEGORY_IDS,
    currencies: getImportCurrencies(context),
    sourceKeys: listImportedSourceKeys(context),
    fingerprints: includeFingerprints
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
