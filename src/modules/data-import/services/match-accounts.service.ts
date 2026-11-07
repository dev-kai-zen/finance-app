import type { AccountListItem, AccountType } from "@/modules/accounts";
import { isCreditCardAccountType } from "@/modules/accounts/utils/pocket-eligibility";
import type {
  AccountMatchDecision,
  ColumnMappingConfig,
  ImportType,
  ParsedDataRow,
} from "../types/data-import.types";

export interface AccountCandidate {
  name: string;
  sourceCurrency?: string;
  sourceAccountType?: string;
  sourceOpeningBalanceMinorUnits?: number;
  sourceBalanceDate?: Date;
}

/**
 * Collects unique account names from file rows and column configuration.
 */
export function extractAccountCandidates(
  headers: string[],
  rows: string[][],
  config: ColumnMappingConfig,
  defaultCurrencyCode: string,
  earliestDateInFile?: Date,
): AccountCandidate[] {
  const accountColIdx = config.accountColumn ? headers.indexOf(config.accountColumn) : -1;
  const toAccountColIdx = config.toAccountColumn ? headers.indexOf(config.toAccountColumn) : -1;
  const currencyColIdx = config.currencyColumn ? headers.indexOf(config.currencyColumn) : -1;
  const typeColIdx = config.accountTypeColumn ? headers.indexOf(config.accountTypeColumn) : -1;
  const openBalColIdx = config.openingBalanceColumn ? headers.indexOf(config.openingBalanceColumn) : -1;
  const balDateColIdx = config.balanceDateColumn ? headers.indexOf(config.balanceDateColumn) : -1;

  const candidateMap = new Map<string, AccountCandidate>();

  const addCandidate = (name: string, currency?: string, accountType?: string, openingBal?: number, balDate?: Date) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (!candidateMap.has(lower)) {
      candidateMap.set(lower, {
        name: trimmed,
        sourceCurrency: currency?.trim().toUpperCase() || defaultCurrencyCode,
        sourceAccountType: accountType?.trim(),
        sourceOpeningBalanceMinorUnits: openingBal,
        sourceBalanceDate: balDate,
      });
    }
  };

  // If a single default account was typed for the whole file
  if (config.defaultAccountName?.trim()) {
    addCandidate(
      config.defaultAccountName,
      config.defaultCurrencyCode || defaultCurrencyCode,
      undefined,
      0,
      earliestDateInFile,
    );
  }

  for (const row of rows) {
    const curr = currencyColIdx >= 0 ? row[currencyColIdx] : config.defaultCurrencyCode || defaultCurrencyCode;
    const accType = typeColIdx >= 0 ? row[typeColIdx] : undefined;

    if (accountColIdx >= 0) {
      const acc = row[accountColIdx];
      if (acc) {
        addCandidate(acc, curr, accType);
      }
    }

    if (toAccountColIdx >= 0) {
      const toAcc = row[toAccountColIdx];
      if (toAcc) {
        addCandidate(toAcc, curr, accType);
      }
    }
  }

  return Array.from(candidateMap.values());
}

/**
 * Builds initial account matching decisions.
 * Suggests an existing account ONLY when exactly ONE active account matches name and currency (and type if present).
 * Excludes archived accounts and credit cards.
 */
export function buildInitialAccountMatches(
  candidates: AccountCandidate[],
  existingAccounts: AccountListItem[],
  availableTypes: AccountType[],
  defaultCurrencyCode: string,
  importType: ImportType,
  earliestDateInFile: Date = new Date(),
): Record<string, AccountMatchDecision> {
  const result: Record<string, AccountMatchDecision> = {};

  // Filter out archived accounts and credit cards
  const eligibleExisting = existingAccounts.filter((acc) => {
    if (acc.isArchived) return false;
    if (isCreditCardAccountType(acc.accountTypeId, acc.accountType?.name ?? "")) return false;
    if (acc.accountType?.accountGroup === "liability" || acc.creditCardDetails !== null) return false;
    return true;
  });

  // Default non-credit-card asset account type for new accounts
  const defaultAssetType =
    availableTypes.find((t) => t.accountGroup === "asset" && !isCreditCardAccountType(t.id, t.name)) ||
    availableTypes[0];

  for (const cand of candidates) {
    const targetCurrency = (cand.sourceCurrency || defaultCurrencyCode).toUpperCase();
    const candNameLower = cand.name.toLowerCase();

    // Look for matching active accounts by name and currency
    const matches = eligibleExisting.filter((acc) => {
      const nameMatches = acc.name.trim().toLowerCase() === candNameLower;
      const currMatches = acc.currencyCode.toUpperCase() === targetCurrency;
      if (!nameMatches || !currMatches) return false;

      // If file specified an account type, check that too
      if (cand.sourceAccountType) {
        return acc.accountType?.name?.trim().toLowerCase() === cand.sourceAccountType.trim().toLowerCase();
      }
      return true;
    });

    if (matches.length === 1) {
      // Exactly one match -> suggest existing
      result[candNameLower] = {
        sourceName: cand.name,
        mode: "existing",
        existingAccountId: matches[0].id,
      };
    } else {
      // Set up new account
      // For transaction history: opening balance is 0 and earliest date
      // For accounts only: balance from file or 0
      const openingBal = importType === "transactions" ? 0 : cand.sourceOpeningBalanceMinorUnits ?? 0;
      const balDate = importType === "transactions" ? earliestDateInFile : cand.sourceBalanceDate ?? earliestDateInFile;

      result[candNameLower] = {
        sourceName: cand.name,
        mode: "new",
        newAccount: {
          name: cand.name.slice(0, 100),
          accountTypeId: defaultAssetType?.id ?? "",
          currencyCode: targetCurrency,
          openingBalanceMinorUnits: openingBal,
          balanceDate: balDate,
        },
      };
    }
  }

  return result;
}

