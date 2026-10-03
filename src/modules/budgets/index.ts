import { deferComponent, deferFunction } from "@/utils/deferred-module";

// Screens
export const BudgetsScreen = deferComponent(
  () => require("./screens/budgets-screen").BudgetsScreen,
  "BudgetsScreen",
) as typeof import("./screens/budgets-screen").BudgetsScreen;

// Components
export const BudgetCard = deferComponent(
  () => require("./components/budget-card").BudgetCard,
  "BudgetCard",
) as typeof import("./components/budget-card").BudgetCard;

export const BudgetFormModal = deferComponent(
  () => require("./components/budget-form-modal").BudgetFormModal,
  "BudgetFormModal",
) as typeof import("./components/budget-form-modal").BudgetFormModal;

export const OverBudgetWarningModal = deferComponent(
  () =>
    require("./components/over-budget-warning-modal").OverBudgetWarningModal,
  "OverBudgetWarningModal",
) as typeof import("./components/over-budget-warning-modal").OverBudgetWarningModal;

export const BudgetLiveIndicator = deferComponent(
  () => require("./components/budget-live-indicator").BudgetLiveIndicator,
  "BudgetLiveIndicator",
) as typeof import("./components/budget-live-indicator").BudgetLiveIndicator;

// Hooks
export const useBudgets = deferFunction(
  () => require("./hooks/use-budgets").useBudgets,
) as typeof import("./hooks/use-budgets").useBudgets;

// Services
export const checkBudgetExceeded = deferFunction(
  () => require("./services/check-budget-exceeded.service").checkBudgetExceeded,
) as typeof import("./services/check-budget-exceeded.service").checkBudgetExceeded;

export const calculateCategoryBudgetStatus = deferFunction(
  () =>
    require("./services/calculate-category-budget.service")
      .calculateCategoryBudgetStatus,
) as typeof import("./services/calculate-category-budget.service").calculateCategoryBudgetStatus;

export const saveCategoryBudget = deferFunction(
  () => require("./services/save-category-budget.service").saveCategoryBudget,
) as typeof import("./services/save-category-budget.service").saveCategoryBudget;

export const toggleCategoryBudget = deferFunction(
  () =>
    require("./services/toggle-category-budget.service").toggleCategoryBudget,
) as typeof import("./services/toggle-category-budget.service").toggleCategoryBudget;

export const deleteCategoryBudget = deferFunction(
  () =>
    require("./services/delete-category-budget.service").deleteCategoryBudget,
) as typeof import("./services/delete-category-budget.service").deleteCategoryBudget;

// Types
export type {
  BudgetFrequency,
  BudgetRolloverMode,
  CategoryBudget,
  CategoryBudgetInput,
  BudgetMonthlyTarget,
  MonthlyTargetInput,
  BudgetStatus,
  BudgetCheckResult,
} from "./types/budget.types";
export type { CheckBudgetExceededInput } from "./services/check-budget-exceeded.service";
