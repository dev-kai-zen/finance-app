import { db, type DbContext } from "@/infrastructure/database/client";
import { getExchangeRateMap } from "@/modules/currencies";
import {
  getAccountBalanceDeltasAtDate,
  getPocketBalanceDeltasAtDate,
} from "@/modules/transactions";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import { listAccounts } from "../repositories/accounts.repository";
import { listPockets } from "../repositories/pockets.repository";
import { compareAccountTypesForDisplay } from "../utils/account-type-order";

export interface BalanceSheetPocketItem {
  id: string;
  name: string;
  targetAmountMinorUnits: number | null;
  balanceMinorUnits: number;
}

export interface BalanceSheetAccountItem {
  id: string;
  name: string;
  iconKey: string | null;
  currencyCode: string;
  pocketEnabled: boolean;
  balanceMinorUnits: number;
  availableMinorUnits: number;
  pockets: BalanceSheetPocketItem[];
}

export interface BalanceSheetAccountTypeGroup {
  id: string;
  name: string;
  iconKey: string | null;
  color: string | null;
  sortOrder: number;
  totalBalanceMinorUnits: number;
  accounts: BalanceSheetAccountItem[];
}

export interface BalanceSheetGroupData {
  totalMinorUnits: number;
  accountTypes: BalanceSheetAccountTypeGroup[];
}

export interface BalanceSheetData {
  cutoffDate: Date;
  assets: BalanceSheetGroupData;
  liabilities: BalanceSheetGroupData;
  netWorthMinorUnits: number;
}

/**
 * Computes a complete Balance Sheet snapshot as of a specified cutoff date.
 *
 * For each active account:
 * - Opening balance applies if account.openingBalanceAt <= cutoffDate.
 * - Transaction deltas are aggregated up to the cutoffDate.
 * - Pockets balances are aggregated up to the cutoffDate.
 * - Accounts are grouped by account group (Asset vs Liability) and then by Account Type.
 */
export function getBalanceSheet(
  cutoffDate: Date,
  context: DbContext = db,
): BalanceSheetData {
  const accounts = listAccounts(context).filter((a) => !a.isArchived);
  const pockets = listPockets(context).filter((p) => !p.isArchived);

  const accountDeltas = getAccountBalanceDeltasAtDate(cutoffDate, context);
  const pocketDeltas = getPocketBalanceDeltasAtDate(cutoffDate, context);

  const cutoffTime = cutoffDate.getTime();
  const ratesMap = getExchangeRateMap(DEFAULT_BASE_CURRENCY, context);

  // Index pockets by accountId
  const pocketsByAccountId = new Map<string, BalanceSheetPocketItem[]>();
  for (const pocket of pockets) {
    const list = pocketsByAccountId.get(pocket.accountId) ?? [];
    list.push({
      id: pocket.id,
      name: pocket.name,
      targetAmountMinorUnits: pocket.targetAmountMinorUnits,
      balanceMinorUnits: pocketDeltas[pocket.id] ?? 0,
    });
    pocketsByAccountId.set(pocket.accountId, list);
  }

  // Build account items
  const assetTypeMap = new Map<string, BalanceSheetAccountTypeGroup>();
  const liabilityTypeMap = new Map<string, BalanceSheetAccountTypeGroup>();

  let totalAssetsMinorUnits = 0;
  let totalLiabilitiesMinorUnits = 0;

  for (const account of accounts) {
    if (account.hideFromReports) continue;

    const openingBalance =
      account.openingBalanceAt.getTime() <= cutoffTime
        ? account.openingBalanceMinorUnits
        : 0;
    const delta = accountDeltas[account.id] ?? 0;
    const balance = openingBalance + delta;

    const convertedBalance = convertCurrencyMinorUnits(
      balance,
      account.currencyCode,
      DEFAULT_BASE_CURRENCY,
      ratesMap,
    );

    const accountPockets = pocketsByAccountId.get(account.id) ?? [];
    const totalPocketsBalance = accountPockets.reduce(
      (sum, p) => sum + p.balanceMinorUnits,
      0,
    );
    const availableMinorUnits = balance - totalPocketsBalance;

    const accountItem: BalanceSheetAccountItem = {
      id: account.id,
      name: account.name,
      iconKey: account.iconKey,
      currencyCode: account.currencyCode,
      pocketEnabled: account.pocketEnabled,
      balanceMinorUnits: balance,
      availableMinorUnits,
      pockets: accountPockets,
    };

    const isLiability = account.accountType?.accountGroup === "liability";
    const targetMap = isLiability ? liabilityTypeMap : assetTypeMap;

    if (isLiability) {
      totalLiabilitiesMinorUnits += convertedBalance;
    } else {
      totalAssetsMinorUnits += convertedBalance;
    }

    const typeId = account.accountTypeId || "other";
    const existingGroup = targetMap.get(typeId);

    if (existingGroup) {
      existingGroup.totalBalanceMinorUnits += convertedBalance;
      existingGroup.accounts.push(accountItem);
    } else {
      const typeInfo = account.accountType;
      targetMap.set(typeId, {
        id: typeId,
        name: typeInfo?.name ?? "Other",
        iconKey: typeInfo?.iconKey ?? "landmark",
        color: typeInfo?.color ?? null,
        sortOrder: typeInfo?.sortOrder ?? 999,
        totalBalanceMinorUnits: convertedBalance,
        accounts: [accountItem],
      });
    }
  }

  // Sort groups
  const sortedAssetTypes = Array.from(assetTypeMap.values()).sort((a, b) =>
    compareAccountTypesForDisplay(
      { id: a.id, name: a.name, sortOrder: a.sortOrder },
      { id: b.id, name: b.name, sortOrder: b.sortOrder },
    ),
  );

  const sortedLiabilityTypes = Array.from(liabilityTypeMap.values()).sort(
    (a, b) =>
      compareAccountTypesForDisplay(
        { id: a.id, name: a.name, sortOrder: a.sortOrder },
        { id: b.id, name: b.name, sortOrder: b.sortOrder },
      ),
  );

  // Liabilities are stored as negative (debt), so netWorth = assets + liabilities
  const netWorthMinorUnits = totalAssetsMinorUnits + totalLiabilitiesMinorUnits;

  return {
    cutoffDate,
    assets: {
      totalMinorUnits: totalAssetsMinorUnits,
      accountTypes: sortedAssetTypes,
    },
    liabilities: {
      totalMinorUnits: totalLiabilitiesMinorUnits,
      accountTypes: sortedLiabilityTypes,
    },
    netWorthMinorUnits,
  };
}
