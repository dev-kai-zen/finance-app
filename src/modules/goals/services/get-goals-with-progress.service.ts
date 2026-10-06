import { db, type DbContext } from "@/infrastructure/database/client";
import {
  getAccountsWithBalances,
  getPocketsWithBalances,
} from "@/modules/accounts";
import { listGoals } from "../repositories/goals.repository";
import type {
  GoalSummaryStats,
  GoalWithProgress,
  LinkedAccountItem,
  LinkedPocketItem,
} from "../types/goal.types";
import { calculateGoalProgress } from "./calculate-goal-progress.service";

export interface GoalsDataResult {
  goals: GoalWithProgress[];
  summary: GoalSummaryStats;
}

export function getGoalsWithProgress(
  context: DbContext = db,
  now: Date = new Date(),
): GoalsDataResult {
  const goals = listGoals(context);
  const accounts = getAccountsWithBalances(context);
  const pockets = getPocketsWithBalances(context);

  const accountsById = new Map(accounts.map((a) => [a.id, a]));
  const pocketsById = new Map(pockets.map((p) => [p.id, p]));

  let totalTarget = 0;
  let totalSaved = 0;
  let activeCount = 0;
  let completedCount = 0;

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

    // Accounts sum
    const accountsSum = linkedAccounts.reduce(
      (sum, acc) => sum + Math.max(0, acc.currentBalanceMinorUnits),
      0,
    );

    // Pockets sum: exclude pockets whose parent account is already in linkedAccounts to avoid double counting
    const nonDuplicatedPockets = linkedPockets.filter(
      (p) => !linkedAccountIdsSet.has(p.accountId),
    );
    const pocketsSum = nonDuplicatedPockets.reduce(
      (sum, pocket) => sum + Math.max(0, pocket.currentBalanceMinorUnits),
      0,
    );

    const currentBalance = accountsSum + pocketsSum;

    const item = calculateGoalProgress({
      goal,
      currentAmountMinorUnits: currentBalance,
      linkedAccounts,
      linkedPockets,
      now,
    });

    if (item.status !== "paused") {
      totalTarget += item.targetAmountMinorUnits;
      totalSaved += item.currentAmountMinorUnits;
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
    totalTargetMinorUnits: totalTarget,
    totalSavedMinorUnits: totalSaved,
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
