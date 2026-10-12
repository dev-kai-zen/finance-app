import { db, type DbContext } from "@/infrastructure/database/client";
import {
  getBalanceSheet,
  type BalanceSheetAccountItem,
  type BalanceSheetAccountTypeGroup,
  type BalanceSheetData,
  type BalanceSheetPocketItem,
} from "@/modules/accounts";
import { getCurrencyPreferences } from "@/modules/currencies";
import { formatCurrency } from "@/utils/currency";
import { REPORT_COLORS } from "../constants/reports.constants";
import type {
  BalanceSheetComparisonData,
  ComparisonDateRange,
  ReportAccountNode,
  ReportAccountTypeNode,
  ReportGroupNode,
  ReportPocketNode,
  VarianceValue,
} from "../types/reports.types";

interface CalculateVarianceOptions {
  prevMinorUnits: number;
  currentMinorUnits: number;
  isLiability: boolean;
  currencyCode?: string;
}

export function calculateVariance({
  prevMinorUnits,
  currentMinorUnits,
  isLiability,
  currencyCode = "PHP",
}: CalculateVarianceOptions): VarianceValue {
  if (isLiability) {
    // Liabilities: debt magnitude
    // Negative balance = debt.
    const prevDebt = Math.abs(prevMinorUnits);
    const currentDebt = Math.abs(currentMinorUnits);
    const debtDiff = currentDebt - prevDebt;

    if (debtDiff < 0) {
      // Debt decreased: Favorable! (Green, Down arrow ▼, negative sign -)
      const absDiff = Math.abs(debtDiff);
      return {
        prevMinorUnits,
        currentMinorUnits,
        diffMinorUnits: debtDiff,
        isFavorable: true,
        direction: "down",
        symbol: "▼",
        color: REPORT_COLORS.positiveGreen,
        formattedDiff: formatCurrency(-absDiff, currencyCode),
      };
    } else if (debtDiff > 0) {
      // Debt increased: Unfavorable! (Red, Up arrow ▲, positive sign +)
      return {
        prevMinorUnits,
        currentMinorUnits,
        diffMinorUnits: debtDiff,
        isFavorable: false,
        direction: "up",
        symbol: "▲",
        color: REPORT_COLORS.negativeRed,
        formattedDiff: formatCurrency(debtDiff, currencyCode, true),
      };
    } else {
      return {
        prevMinorUnits,
        currentMinorUnits,
        diffMinorUnits: 0,
        isFavorable: true,
        direction: "neutral",
        symbol: "",
        color: REPORT_COLORS.neutralMuted,
        formattedDiff: formatCurrency(0, currencyCode),
      };
    }
  }

  // Asset or Net Worth
  const diff = currentMinorUnits - prevMinorUnits;
  if (diff > 0) {
    // Asset increased: Favorable! (Green, Up arrow ▲, positive sign +)
    return {
      prevMinorUnits,
      currentMinorUnits,
      diffMinorUnits: diff,
      isFavorable: true,
      direction: "up",
      symbol: "▲",
      color: REPORT_COLORS.positiveGreen,
      formattedDiff: formatCurrency(diff, currencyCode, true),
    };
  } else if (diff < 0) {
    // Asset decreased: Unfavorable! (Red, Down arrow ▼, negative sign -)
    const absDiff = Math.abs(diff);
    return {
      prevMinorUnits,
      currentMinorUnits,
      diffMinorUnits: diff,
      isFavorable: false,
      direction: "down",
      symbol: "▼",
      color: REPORT_COLORS.negativeRed,
      formattedDiff: formatCurrency(-absDiff, currencyCode),
    };
  } else {
    return {
      prevMinorUnits,
      currentMinorUnits,
      diffMinorUnits: 0,
      isFavorable: true,
      direction: "neutral",
      symbol: "",
      color: REPORT_COLORS.neutralMuted,
      formattedDiff: formatCurrency(0, currencyCode),
    };
  }
}

/**
 * Builds a comparative Balance Sheet between two cutoff dates.
 */
export function getBalanceSheetComparison(
  range: ComparisonDateRange,
  options: { hideZeroBalances?: boolean; context?: DbContext } = {},
): BalanceSheetComparisonData {
  const context = options.context ?? db;
  const hideZeroBalances = options.hideZeroBalances ?? true;
  const homeCurrency = getCurrencyPreferences(context).defaultCurrency;

  const prevSheet: BalanceSheetData = getBalanceSheet(range.prevDate, context);
  const currentSheet: BalanceSheetData = getBalanceSheet(
    range.currentDate,
    context,
  );

  const assets = buildGroupComparison(
    "asset",
    "ASSET",
    prevSheet.assets.accountTypes,
    currentSheet.assets.accountTypes,
    prevSheet.assets.totalMinorUnits,
    currentSheet.assets.totalMinorUnits,
    hideZeroBalances,
    homeCurrency,
  );

  const liabilities = buildGroupComparison(
    "liability",
    "LIABILITY",
    prevSheet.liabilities.accountTypes,
    currentSheet.liabilities.accountTypes,
    prevSheet.liabilities.totalMinorUnits,
    currentSheet.liabilities.totalMinorUnits,
    hideZeroBalances,
    homeCurrency,
  );

  const netWorthVariance = calculateVariance({
    prevMinorUnits: prevSheet.netWorthMinorUnits,
    currentMinorUnits: currentSheet.netWorthMinorUnits,
    isLiability: false,
    currencyCode: homeCurrency,
  });

  return {
    range,
    assets,
    liabilities,
    netWorth: {
      prevMinorUnits: prevSheet.netWorthMinorUnits,
      currentMinorUnits: currentSheet.netWorthMinorUnits,
      diffMinorUnits: currentSheet.netWorthMinorUnits - prevSheet.netWorthMinorUnits,
      variance: netWorthVariance,
    },
  };
}

function buildGroupComparison(
  group: "asset" | "liability",
  title: string,
  prevTypes: BalanceSheetAccountTypeGroup[],
  currentTypes: BalanceSheetAccountTypeGroup[],
  prevTotal: number,
  currentTotal: number,
  hideZeroBalances: boolean,
  homeCurrency: string,
): ReportGroupNode {
  const isLiability = group === "liability";
  const typeMap = new Map<
    string,
    {
      prev?: BalanceSheetAccountTypeGroup;
      current?: BalanceSheetAccountTypeGroup;
    }
  >();

  for (const pt of prevTypes) {
    typeMap.set(pt.id, { prev: pt });
  }
  for (const ct of currentTypes) {
    const existing = typeMap.get(ct.id);
    if (existing) {
      existing.current = ct;
    } else {
      typeMap.set(ct.id, { current: ct });
    }
  }

  const accountTypeNodes: ReportAccountTypeNode[] = [];

  for (const [typeId, { prev, current }] of typeMap.entries()) {
    const name = current?.name ?? prev?.name ?? "Other";
    const iconKey = current?.iconKey ?? prev?.iconKey ?? null;
    const color = current?.color ?? prev?.color ?? null;
    const sortOrder = current?.sortOrder ?? prev?.sortOrder ?? 999;

    const prevTypeTotal = prev?.totalBalanceMinorUnits ?? 0;
    const currentTypeTotal = current?.totalBalanceMinorUnits ?? 0;

    // Merge accounts under this type
    const accounts = buildAccountComparisons(
      prev?.accounts ?? [],
      current?.accounts ?? [],
      isLiability,
      hideZeroBalances,
    );

    // If hideZeroBalances is active and all accounts are filtered out, skip type
    if (hideZeroBalances && accounts.length === 0 && prevTypeTotal === 0 && currentTypeTotal === 0) {
      continue;
    }

    const typeVariance = calculateVariance({
      prevMinorUnits: prevTypeTotal,
      currentMinorUnits: currentTypeTotal,
      isLiability,
      currencyCode: homeCurrency,
    });

    accountTypeNodes.push({
      id: typeId,
      name,
      iconKey,
      color,
      sortOrder,
      variance: typeVariance,
      accounts,
    });
  }

  // Sort account types by sortOrder then name
  accountTypeNodes.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });

  const groupVariance = calculateVariance({
    prevMinorUnits: prevTotal,
    currentMinorUnits: currentTotal,
    isLiability,
    currencyCode: homeCurrency,
  });

  return {
    group,
    title,
    variance: groupVariance,
    accountTypes: accountTypeNodes,
  };
}

function buildAccountComparisons(
  prevAccounts: BalanceSheetAccountItem[],
  currentAccounts: BalanceSheetAccountItem[],
  isLiability: boolean,
  hideZeroBalances: boolean,
): ReportAccountNode[] {
  const accountMap = new Map<
    string,
    {
      prev?: BalanceSheetAccountItem;
      current?: BalanceSheetAccountItem;
    }
  >();

  for (const pa of prevAccounts) {
    accountMap.set(pa.id, { prev: pa });
  }
  for (const ca of currentAccounts) {
    const existing = accountMap.get(ca.id);
    if (existing) {
      existing.current = ca;
    } else {
      accountMap.set(ca.id, { current: ca });
    }
  }

  const nodes: ReportAccountNode[] = [];

  for (const [accId, { prev, current }] of accountMap.entries()) {
    const name = current?.name ?? prev?.name ?? "Account";
    const iconKey = current?.iconKey ?? prev?.iconKey ?? null;
    const currencyCode = current?.currencyCode ?? prev?.currencyCode ?? "PHP";
    const pocketEnabled = current?.pocketEnabled ?? prev?.pocketEnabled ?? false;

    const prevBal = prev?.balanceMinorUnits ?? 0;
    const currentBal = current?.balanceMinorUnits ?? 0;

    // Filter zero balance account if hideZeroBalances
    if (hideZeroBalances && prevBal === 0 && currentBal === 0) {
      continue;
    }

    const pockets = buildPocketComparisons(
      prev,
      current,
      currencyCode,
      isLiability,
      hideZeroBalances,
    );

    const variance = calculateVariance({
      prevMinorUnits: prevBal,
      currentMinorUnits: currentBal,
      isLiability,
      currencyCode,
    });

    nodes.push({
      id: accId,
      name,
      iconKey,
      currencyCode,
      pocketEnabled,
      variance,
      pockets,
    });
  }

  nodes.sort((a, b) => a.name.localeCompare(b.name));
  return nodes;
}

function buildPocketComparisons(
  prevAccount: BalanceSheetAccountItem | undefined,
  currentAccount: BalanceSheetAccountItem | undefined,
  currencyCode: string,
  isLiability: boolean,
  hideZeroBalances: boolean,
): ReportPocketNode[] {
  const pocketEnabled = currentAccount?.pocketEnabled ?? prevAccount?.pocketEnabled ?? false;
  if (!pocketEnabled) return [];

  const pocketMap = new Map<
    string,
    {
      name: string;
      target: number | null;
      prevMinorUnits: number;
      currentMinorUnits: number;
    }
  >();

  // Add "Available" unallocated balance if either snapshot has available balance or pockets
  const prevAvailable = prevAccount?.availableMinorUnits ?? 0;
  const currentAvailable = currentAccount?.availableMinorUnits ?? 0;

  if (prevAvailable !== 0 || currentAvailable !== 0 || !hideZeroBalances) {
    pocketMap.set("__available__", {
      name: "Available",
      target: null,
      prevMinorUnits: prevAvailable,
      currentMinorUnits: currentAvailable,
    });
  }

  // Pockets from prev
  if (prevAccount?.pockets) {
    for (const p of prevAccount.pockets) {
      pocketMap.set(p.id, {
        name: p.name,
        target: p.targetAmountMinorUnits,
        prevMinorUnits: p.balanceMinorUnits,
        currentMinorUnits: 0,
      });
    }
  }

  // Pockets from current
  if (currentAccount?.pockets) {
    for (const p of currentAccount.pockets) {
      const existing = pocketMap.get(p.id);
      if (existing) {
        existing.currentMinorUnits = p.balanceMinorUnits;
        if (p.name) existing.name = p.name;
        if (p.targetAmountMinorUnits != null) existing.target = p.targetAmountMinorUnits;
      } else {
        pocketMap.set(p.id, {
          name: p.name,
          target: p.targetAmountMinorUnits,
          prevMinorUnits: 0,
          currentMinorUnits: p.balanceMinorUnits,
        });
      }
    }
  }

  const result: ReportPocketNode[] = [];

  for (const [id, data] of pocketMap.entries()) {
    if (hideZeroBalances && data.prevMinorUnits === 0 && data.currentMinorUnits === 0) {
      continue;
    }

    const variance = calculateVariance({
      prevMinorUnits: data.prevMinorUnits,
      currentMinorUnits: data.currentMinorUnits,
      isLiability,
      currencyCode,
    });

    result.push({
      id,
      name: data.name,
      targetAmountMinorUnits: data.target,
      variance,
    });
  }

  // Keep "Available" first, then sort remaining pockets by name
  result.sort((a, b) => {
    if (a.id === "__available__") return -1;
    if (b.id === "__available__") return 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}
