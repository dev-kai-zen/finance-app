export type GoalStatus = "in_progress" | "completed" | "paused";

export interface Goal {
  id: string;
  name: string;
  note: string | null;
  targetAmountMinorUnits: number;
  currencyCode: string;
  accountId: string | null;
  pocketId: string | null;
  accountIds: string[];
  pocketIds: string[];
  targetDate: Date | null;
  iconKey: string | null;
  hexColorsId: string | null;
  status: GoalStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkedAccountItem {
  id: string;
  name: string;
  iconKey: string | null;
  currentBalanceMinorUnits: number;
}

export interface LinkedPocketItem {
  id: string;
  name: string;
  accountId: string;
  accountName?: string;
  currentBalanceMinorUnits: number;
}

export interface GoalWithProgress extends Goal {
  currentAmountMinorUnits: number;
  progressPercentage: number;
  remainingMinorUnits: number;
  isCompleted: boolean;
  isExceeded: boolean;
  linkedAccounts: LinkedAccountItem[];
  linkedPockets: LinkedPocketItem[];
  daysRemaining: number | null;
  monthsRemaining: number | null;
  pacePerMonthMinorUnits: number | null;
  isPastDeadline: boolean;
}

export interface GoalInput {
  name: string;
  note?: string | null;
  targetAmountMinorUnits: number;
  currencyCode?: string;
  accountId?: string | null;
  pocketId?: string | null;
  accountIds?: string[];
  pocketIds?: string[];
  targetDate?: Date | null;
  iconKey?: string | null;
  hexColorsId?: string | null;
  status?: GoalStatus;
  sortOrder?: number;
}

export interface GoalSummaryStats {
  totalTargetMinorUnits: number;
  totalSavedMinorUnits: number;
  overallProgressPercentage: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  totalGoalsCount: number;
}
