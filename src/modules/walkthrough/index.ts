export {
  WalkthroughRegistryProvider,
  WalkthroughTarget,
  useWalkthroughRegistry,
  useWalkthroughTarget,
} from "./components/walkthrough-target";
export {
  isWalkthroughTargetVisible,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
} from "./utils/walkthrough-viewport";
export {
  DraggableTourChip,
  type DraggableTourChipProps,
  type GuideChipPlacement,
} from "./components/draggable-tour-chip";
export {
  WalkthroughIntroModal,
  type WalkthroughIntroModalProps,
} from "./components/walkthrough-intro-modal";
export {
  useWalkthroughIntro,
  type UseWalkthroughIntroOptions,
} from "./hooks/use-walkthrough-intro";

export { DashboardWalkthroughOverlay } from "./dashboard/dashboard-walkthrough-overlay";
export { DashboardCongratulationsModal } from "./dashboard/dashboard-congratulations-modal";
export { useDashboardWalkthrough } from "./dashboard/use-dashboard-walkthrough";
export { DASHBOARD_WALKTHROUGH_STEPS } from "./dashboard/dashboard-walkthrough-steps";

export { AccountsWalkthroughOverlay } from "./accounts/accounts-walkthrough-overlay";
export { useAccountsWalkthrough } from "./accounts/use-accounts-walkthrough";
export { ACCOUNTS_WALKTHROUGH_STEPS } from "./accounts/accounts-walkthrough-steps";

export { AccountFormWalkthroughOverlay } from "./accounts/account-form-walkthrough-overlay";
export { useAccountFormWalkthrough } from "./accounts/use-account-form-walkthrough";
export {
  ACCOUNT_FORM_WALKTHROUGH_STEPS,
  getAccountFormWalkthroughSteps,
} from "./accounts/account-form-walkthrough-steps";

export { AccountGroupSetupWalkthroughOverlay } from "./accounts/account-group-setup-walkthrough-overlay";
export { useAccountGroupSetupWalkthrough } from "./accounts/use-account-group-setup-walkthrough";
export {
  ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS,
  getAccountGroupSetupWalkthroughSteps,
} from "./accounts/account-group-setup-walkthrough-steps";

export { AccountTypeFormWalkthroughOverlay } from "./accounts/account-type-form-walkthrough-overlay";
export { useAccountTypeFormWalkthrough } from "./accounts/use-account-type-form-walkthrough";
export { ACCOUNT_TYPE_FORM_WALKTHROUGH_STEPS } from "./accounts/account-type-form-walkthrough-steps";

export { TransactionsWalkthroughOverlay } from "./transactions/transactions-walkthrough-overlay";
export { useTransactionsWalkthrough } from "./transactions/use-transactions-walkthrough";
export { TRANSACTIONS_WALKTHROUGH_STEPS } from "./transactions/transactions-walkthrough-steps";

export { TransactionFormWalkthroughOverlay } from "./transactions/transaction-form-walkthrough-overlay";
export { useTransactionFormWalkthrough } from "./transactions/use-transaction-form-walkthrough";
export {
  getTransactionFormWalkthroughSteps,
  TRANSACTION_FORM_WALKTHROUGH_STEPS,
} from "./transactions/transaction-form-walkthrough-steps";

export { ScheduledTransactionsWalkthroughOverlay } from "./scheduled/scheduled-transactions-walkthrough-overlay";
export { useScheduledTransactionsWalkthrough } from "./scheduled/use-scheduled-transactions-walkthrough";
export { getScheduledTransactionsWalkthroughSteps } from "./scheduled/scheduled-transactions-walkthrough-steps";
export { FirstScheduleCongratulationsModal } from "./scheduled/first-schedule-congratulations-modal";

export { ScheduleFormWalkthroughOverlay } from "./scheduled/schedule-form-walkthrough-overlay";
export { useScheduleFormWalkthrough } from "./scheduled/use-schedule-form-walkthrough";
export {
  getScheduleFormWalkthroughSteps,
  SCHEDULE_FORM_WALKTHROUGH_STEPS,
} from "./scheduled/schedule-form-walkthrough-steps";

export { CalendarWalkthroughOverlay } from "./calendar/calendar-walkthrough-overlay";
export { useCalendarWalkthrough } from "./calendar/use-calendar-walkthrough";
export { CALENDAR_WALKTHROUGH_STEPS } from "./calendar/calendar-walkthrough-steps";

export { CategoriesWalkthroughOverlay } from "./categories/categories-walkthrough-overlay";
export { useCategoriesWalkthrough } from "./categories/use-categories-walkthrough";
export { getCategoriesWalkthroughSteps } from "./categories/categories-walkthrough-steps";

export { BudgetCongratulationsModal } from "./budgets/budget-congratulations-modal";
export { BudgetsWalkthroughOverlay } from "./budgets/budgets-walkthrough-overlay";
export { useBudgetsWalkthrough } from "./budgets/use-budgets-walkthrough";
export { getBudgetsWalkthroughSteps } from "./budgets/budgets-walkthrough-steps";
export { BudgetFormWalkthroughOverlay } from "./budgets/budget-form-walkthrough-overlay";
export { useBudgetFormWalkthrough } from "./budgets/use-budget-form-walkthrough";
export { BUDGET_FORM_WALKTHROUGH_STEPS } from "./budgets/budget-form-walkthrough-steps";

export { GoalCongratulationsModal } from "./goals/goal-congratulations-modal";
export { GoalsWalkthroughOverlay } from "./goals/goals-walkthrough-overlay";
export { useGoalsWalkthrough } from "./goals/use-goals-walkthrough";
export { getGoalsWalkthroughSteps } from "./goals/goals-walkthrough-steps";
export { GoalFormWalkthroughOverlay } from "./goals/goal-form-walkthrough-overlay";
export { useGoalFormWalkthrough } from "./goals/use-goal-form-walkthrough";
export { GOAL_FORM_WALKTHROUGH_STEPS } from "./goals/goal-form-walkthrough-steps";

export { NotesWalkthroughOverlay } from "./notes/notes-walkthrough-overlay";
export { useNotesWalkthrough } from "./notes/use-notes-walkthrough";
export { getNotesWalkthroughSteps } from "./notes/notes-walkthrough-steps";

export { SettingsWalkthroughOverlay } from "./settings/settings-walkthrough-overlay";
export { useSettingsWalkthrough } from "./settings/use-settings-walkthrough";
export { SETTINGS_WALKTHROUGH_STEPS } from "./settings/settings-walkthrough-steps";

export type {
  LayoutRect,
  WalkthroughStep,
  WalkthroughStepId,
  WalkthroughTargetId,
} from "./types/walkthrough.types";

