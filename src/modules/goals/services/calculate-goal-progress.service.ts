import type {
  Goal,
  GoalWithProgress,
  LinkedAccountItem,
  LinkedPocketItem,
} from "../types/goal.types";

export interface CalculateGoalProgressParams {
  goal: Goal;
  currentAmountMinorUnits: number;
  linkedAccounts?: LinkedAccountItem[];
  linkedPockets?: LinkedPocketItem[];
  now?: Date;
}

export function calculateGoalProgress({
  goal,
  currentAmountMinorUnits,
  linkedAccounts = [],
  linkedPockets = [],
  now = new Date(),
}: CalculateGoalProgressParams): GoalWithProgress {
  const current = Math.max(0, currentAmountMinorUnits);
  const target = Math.max(1, goal.targetAmountMinorUnits);
  const progressRatio = current / target;
  const rawPercentage = Math.round(progressRatio * 100);

  const remainingMinorUnits = Math.max(0, target - current);
  const isCompleted = goal.status === "completed" || current >= target;
  const isExceeded = current > target;

  let daysRemaining: number | null = null;
  let monthsRemaining: number | null = null;
  let pacePerMonthMinorUnits: number | null = null;
  let isPastDeadline = false;

  if (goal.targetDate) {
    const targetMs = goal.targetDate.getTime();
    const nowMs = now.getTime();
    const diffMs = targetMs - nowMs;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      isPastDeadline = true;
      daysRemaining = 0;
      monthsRemaining = 0;
      pacePerMonthMinorUnits = remainingMinorUnits > 0 ? remainingMinorUnits : 0;
    } else {
      isPastDeadline = false;
      daysRemaining = diffDays;
      const yearDiff = goal.targetDate.getFullYear() - now.getFullYear();
      const monthDiff = goal.targetDate.getMonth() - now.getMonth();
      const totalMonths = yearDiff * 12 + monthDiff;
      monthsRemaining = Math.max(1, totalMonths <= 0 ? 1 : totalMonths);

      if (remainingMinorUnits > 0) {
        pacePerMonthMinorUnits = Math.ceil(remainingMinorUnits / monthsRemaining);
      } else {
        pacePerMonthMinorUnits = 0;
      }
    }
  }

  return {
    ...goal,
    currentAmountMinorUnits: current,
    progressPercentage: rawPercentage,
    remainingMinorUnits,
    isCompleted,
    isExceeded,
    linkedAccounts,
    linkedPockets,
    daysRemaining,
    monthsRemaining,
    pacePerMonthMinorUnits,
    isPastDeadline,
  };
}
