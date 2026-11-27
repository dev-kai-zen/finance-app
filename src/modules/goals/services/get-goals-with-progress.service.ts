import { db, type DbContext } from "@/infrastructure/database/client";
import {
  getAccountsWithBalances,
  getPocketsWithBalances,
} from "@/modules/accounts";
import {
  getCurrencyPreferences,
  getExchangeRateMap,
} from "@/modules/currencies";
import {
  convertCurrencyMinorUnits,
  DEFAULT_BASE_CURRENCY,
} from "@/utils/currency";
import { listGoals } from "../repositories/goals.repository";
import type {
  GoalSummaryStats,
  GoalWithProgress,
  LinkedAccountItem,
  LinkedPocketItem,
} from "../types/goal.types";
import { calculateGoalProgress } from "./calculate-goal-progress.service";
import { calculateLinkedFundsBalance } from "../utils/calculate-linked-balance";

export interface GoalsDataResult {
  goals: GoalWithProgress[];
  summary: GoalSummaryStats;
}

export function getGoalsWithProgress(
  context: DbContext = db,
  now: Date = new Date(),
): GoalsDataResult {
  const goals = listGoals(context);

  if (goals.length === 0) {
    const defaultCurrency =
      getCurrencyPreferences(context).defaultCurrency || DEFAULT_BASE_CURRENCY;
    return {
      goals: [],
      summary: {
        currencyCode: defaultCurrency,
        totalTargetMinorUnits: 0,
        totalSavedMinorUnits: 0,
        totalRemainingMinorUnits: 0,
        overallProgressPercentage: 0,
        activeGoalsCount: 0,
        completedGoalsCount: 0,
        totalGoalsCount: 0,
      },
    };
  }

  const accounts = getAccountsWithBalances(context, {
    includeManagementFlags: false,
  });
  const pockets = getPocketsWithBalances(context, {
    includeManagementFlags: false,
  });

  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  const pocketsById = new Map(pockets.map((p) => [p.id, p]));

  let totalTarget = 0;
  let totalSaved = 0;
  let totalRemaining = 0;
  let activeCount = 0;
  let completedCount = 0;

  const defaultCurrency =
    getCurrencyPreferences(context).defaultCurrency || DEFAULT_BASE_CURRENCY;
  const distinctCurrencies = new Set(goals.map((g) => g.currencyCode));
  const summaryCurrency =
    distinctCurrencies.size === 1
      ? Array.from(distinctCurrencies)[0]
      : defaultCurrency;

  const ratesMap =
    distinctCurrencies.size > 1
      ? getExchangeRateMap(DEFAULT_BASE_CURRENCY, context)
      : undefined;

  const goalsWithProgress: GoalWithProgress[] = goals.map((goal) => {
    const linkedAccounts: LinkedAccountItem[] = goal.accountIds
      .map((id) => accountsById.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({
        id: a.id,
        name: a.name,
        iconKey: a.iconKey ?? null,
        currentBalanceMinorUnits: a.currentBalanceMinorUnits,
      }));

    const linkedAccountIdsSet = new Set(linkedAccounts.map((a) => a.id));

    const linkedPockets: LinkedPocketItem[] = goal.pocketIds
      .map((id) => pocketsById.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => {
        const parent = accountsById.get(p.accountId);
        return {
          id: p.id,
          name: p.name,
          accountId: p.accountId,
          accountName: parent?.name,
          currentBalanceMinorUnits: p.currentBalanceMinorUnits,
        };
      });

    const currentBalance = calculateLinkedFundsBalance({
      goalCurrencyCode: goal.currencyCode,
      selectedAccounts: linkedAccounts,
      selectedPockets: linkedPockets,
      accountMap: accountsById,
    });

    const item = calculateGoalProgress({
      goal,
      currentAmountMinorUnits: currentBalance,
      linkedAccounts,
      linkedPockets,
      now,
    });

    if (item.status !== "paused") {
      const convertedTarget = convertCurrencyMinorUnits(
        item.targetAmountMinorUnits,
        item.currencyCode,
        summaryCurrency,
        ratesMap,
        DEFAULT_BASE_CURRENCY,
      );
      const convertedSaved = convertCurrencyMinorUnits(
        item.currentAmountMinorUnits,
        item.currencyCode,
        summaryCurrency,
        ratesMap,
        DEFAULT_BASE_CURRENCY,
      );
      const convertedRemaining = convertCurrencyMinorUnits(
        item.remainingMinorUnits,
        item.currencyCode,
        summaryCurrency,
        ratesMap,
        DEFAULT_BASE_CURRENCY,
      );

      totalTarget += convertedTarget;
      totalSaved += convertedSaved;
      totalRemaining += convertedRemaining;
    }

    if (item.isCompleted) {
      completedCount++;
    } else if (item.status === "in_progress") {
      activeCount++;
    }

    return item;
  });

  const overallProgressPercentage =
    totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  const summary: GoalSummaryStats = {
    currencyCode: summaryCurrency,
    totalTargetMinorUnits: totalTarget,
    totalSavedMinorUnits: totalSaved,
    totalRemainingMinorUnits: totalRemaining,
    overallProgressPercentage,
    activeGoalsCount: activeCount,
    completedGoalsCount: completedCount,
    totalGoalsCount: goals.length,
  };

  return {
    goals: goalsWithProgress,
    summary,
  };
}
