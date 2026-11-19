import type { AccountListItem } from "@/modules/accounts";
import { extractAmounts } from "./extract-amount.service";

export type SupportedChatLanguage = "en" | "fil" | "es";

export interface BuildSuggestedPromptsInput {
  accounts: AccountListItem[];
  defaultExpenseAccountId?: string | null;
  defaultIncomeAccountId?: string | null;
  language?: SupportedChatLanguage;
}

function cleanAccountName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
}

function isParserFriendlyAccount(account: AccountListItem): boolean {
  if (!cleanAccountName(account.name)) {
    return false;
  }
  // Avoid account names containing numeric tokens that would trigger multiple_amounts
  return extractAmounts(account.name).allAmounts.length === 0;
}

function isAssetAccount(account: AccountListItem): boolean {
  return account.accountType?.accountGroup === "asset";
}

function isLiabilityAccount(account: AccountListItem): boolean {
  return account.accountType?.accountGroup === "liability";
}

function pickPreferredAsset(
  pool: AccountListItem[],
  predicate?: (account: AccountListItem) => boolean,
): AccountListItem | null {
  const candidates = predicate ? pool.filter(predicate) : pool;
  if (candidates.length === 0) return null;

  return (
    candidates.find(isAssetAccount) ??
    candidates.find((account) => !isLiabilityAccount(account)) ??
    candidates[0] ??
    null
  );
}

function formatExpensePrompt(
  lang: SupportedChatLanguage,
  accountName: string | null,
): string {
  if (lang === "fil") {
    return accountName
      ? `Gumastos ng 500 sa tanghalian sa McDonald's gamit ang ${accountName}`
      : "Gumastos ng 500 sa tanghalian sa McDonald's";
  }
  if (lang === "es") {
    return accountName
      ? `Gasté 500 en almuerzo en McDonald's con ${accountName}`
      : "Gasté 500 en almuerzo en McDonald's";
  }
  return accountName
    ? `Spent 500 on lunch at McDonald's using ${accountName}`
    : "Spent 500 on lunch at McDonald's";
}

function formatIncomePrompt(
  lang: SupportedChatLanguage,
  accountName: string | null,
): string {
  if (lang === "fil") {
    return accountName
      ? `Sweldo 25000 pumasok sa ${accountName}`
      : "Sweldo 25000 pumasok";
  }
  if (lang === "es") {
    return accountName
      ? `Recibí 25000 de sueldo en ${accountName}`
      : "Recibí 25000 de sueldo";
  }
  return accountName
    ? `Received 25000 salary to ${accountName}`
    : "Received 25000 salary";
}

function formatTransferPrompt(
  lang: SupportedChatLanguage,
  fromName: string,
  toName: string,
): string {
  if (lang === "fil") {
    return `Lipat 2000 mula ${fromName} papuntang ${toName}`;
  }
  if (lang === "es") {
    return `Transferir 2000 desde ${fromName} a ${toName}`;
  }
  return `Transfer 2000 from ${fromName} to ${toName}`;
}

/**
 * Builds up to 3 dynamic sample prompts (Expense, Income, Transfer) grounded in
 * the user's existing active accounts so tapping any suggestion chip produces a
 * recognized transaction draft in Chat with Kai.
 *
 * - 0 active accounts -> []
 * - 1 active account  -> [Expense, Income]
 * - 2+ active accounts -> [Expense, Income, Transfer]
 */
export function buildSuggestedPrompts({
  accounts,
  defaultExpenseAccountId,
  defaultIncomeAccountId,
  language = "en",
}: BuildSuggestedPromptsInput): string[] {
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  if (activeAccounts.length === 0) {
    return [];
  }

  const selectableAccounts = activeAccounts.filter(
    (account) => !account.hideFromSelection,
  );
  const pool = selectableAccounts.length > 0 ? selectableAccounts : activeAccounts;
  const parserFriendlyPool = pool.filter(isParserFriendlyAccount);

  const defaultExpenseAccount = defaultExpenseAccountId
    ? pool.find((account) => account.id === defaultExpenseAccountId) ?? null
    : null;
  const defaultIncomeAccount = defaultIncomeAccountId
    ? pool.find((account) => account.id === defaultIncomeAccountId) ?? null
    : null;

  // 1. Expense account: configured default expense, else first asset account, else first active account
  const expenseAccount =
    defaultExpenseAccount ??
    pickPreferredAsset(parserFriendlyPool) ??
    pickPreferredAsset(pool);

  const expenseAccountName =
    expenseAccount && isParserFriendlyAccount(expenseAccount)
      ? expenseAccount.name
      : null;

  // 2. Income account: configured default income, else default expense if non-liability, else first asset
  const defaultExpenseAsset =
    defaultExpenseAccount && !isLiabilityAccount(defaultExpenseAccount)
      ? defaultExpenseAccount
      : null;

  const incomeAccount =
    defaultIncomeAccount ??
    defaultExpenseAsset ??
    pickPreferredAsset(parserFriendlyPool) ??
    pickPreferredAsset(pool);

  const incomeAccountName =
    incomeAccount && isParserFriendlyAccount(incomeAccount)
      ? incomeAccount.name
      : null;

  const prompts: string[] = [
    formatExpensePrompt(language, expenseAccountName),
    formatIncomePrompt(language, incomeAccountName),
  ];

  // 3. Transfer pair: only include when at least 2 distinct parser-friendly active accounts exist
  if (pool.length >= 2 && parserFriendlyPool.length >= 2) {
    const transferFrom =
      (expenseAccount && isParserFriendlyAccount(expenseAccount)
        ? expenseAccount
        : null) ?? pickPreferredAsset(parserFriendlyPool);

    if (transferFrom) {
      const fromCleanName = cleanAccountName(transferFrom.name);
      const isDistinctDestination = (candidate: AccountListItem) =>
        candidate.id !== transferFrom.id &&
        cleanAccountName(candidate.name) !== fromCleanName;

      const transferTo =
        (incomeAccount &&
        isParserFriendlyAccount(incomeAccount) &&
        isDistinctDestination(incomeAccount)
          ? incomeAccount
          : null) ??
        pickPreferredAsset(parserFriendlyPool, isDistinctDestination);

      if (transferTo) {
        prompts.push(
          formatTransferPrompt(language, transferFrom.name, transferTo.name),
        );
      }
    }
  }

  return prompts;
}
