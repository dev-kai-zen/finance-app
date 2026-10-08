import type { Category } from "@/modules/categories";

export type BudgetFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "semi_monthly"
  | "monthly"
  | "custom_monthly"
  | "quarterly"
  | "yearly";

export type BudgetRolloverMode = "positive_only" | "full";

export interface BudgetMonthlyTarget {
  id: string;
  budgetId: string;
  year: number;
  month: number; // 1 - 12
  amountMinorUnits: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryBudget {
  id: string;
  categoryId: string;
  isEnabled: boolean;
  amountMinorUnits: number;
  frequency: BudgetFrequency;
  startDate: Date;
  allowRollover: boolean;
  rolloverMode: BudgetRolloverMode;
  notifyOnExceeded: boolean;
  createdAt: Date;
  updatedAt: Date;
  monthlyTargets?: BudgetMonthlyTarget[];
}

export interface MonthlyTargetInput {
  year: number;
  month: number;
  amountMinorUnits: number;
}

export interface CategoryBudgetInput {
  id?: string;
  categoryId: string;
  isEnabled?: boolean;
  amountMinorUnits: number;
  frequency: BudgetFrequency;
  startDate?: Date;
  allowRollover?: boolean;
  rolloverMode?: BudgetRolloverMode;
  notifyOnExceeded?: boolean;
  monthlyTargets?: MonthlyTargetInput[];
}

export interface BudgetStatus {
  budget: CategoryBudget;
  category: Category;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  baseTargetCents: number;
  rolloverCents: number;
  effectiveTargetCents: number;
  spentCents: number;
  remainingCents: number;
  percentage: number;
  isExceeded: boolean;
  isNearLimit: boolean;
}

export interface BudgetCheckResult {
  hasBudget: boolean;
  isEnabled: boolean;
  categoryName: string;
  frequency: BudgetFrequency;
  periodLabel: string;
  effectiveBudgetCents: number;
  currentSpentCents: number;
  additionalExpenseCents: number;
  newSpentCents: number;
  remainingBeforeCents: number;
  remainingAfterCents: number;
  exceeds: boolean;
  exceededByCents: number;
  notifyOnExceeded: boolean;
}
