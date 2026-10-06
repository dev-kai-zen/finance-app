import { deferComponent, deferFunction } from "@/utils/deferred-module";

// Screens
export const GoalsScreen = deferComponent(
  () => require("./screens/goals-screen").GoalsScreen,
  "GoalsScreen",
) as typeof import("./screens/goals-screen").GoalsScreen;

// Components
export const GoalCard = deferComponent(
  () => require("./components/goal-card").GoalCard,
  "GoalCard",
) as typeof import("./components/goal-card").GoalCard;

export const GoalFormModal = deferComponent(
  () => require("./components/goal-form-modal").GoalFormModal,
  "GoalFormModal",
) as typeof import("./components/goal-form-modal").GoalFormModal;

export const GoalSummaryHeader = deferComponent(
  () => require("./components/goal-summary-header").GoalSummaryHeader,
  "GoalSummaryHeader",
) as typeof import("./components/goal-summary-header").GoalSummaryHeader;

export const GoalAccountPickerModal = deferComponent(
  () => require("./components/goal-account-picker-modal").GoalAccountPickerModal,
  "GoalAccountPickerModal",
) as typeof import("./components/goal-account-picker-modal").GoalAccountPickerModal;

// Hooks
export const useGoals = deferFunction(
  () => require("./hooks/use-goals").useGoals,
) as typeof import("./hooks/use-goals").useGoals;

// Services
export const getGoalsWithProgress = deferFunction(
  () =>
    require("./services/get-goals-with-progress.service").getGoalsWithProgress,
) as typeof import("./services/get-goals-with-progress.service").getGoalsWithProgress;

export const saveGoal = deferFunction(
  () => require("./services/save-goal.service").saveGoal,
) as typeof import("./services/save-goal.service").saveGoal;

export const deleteGoal = deferFunction(
  () => require("./services/delete-goal.service").deleteGoal,
) as typeof import("./services/delete-goal.service").deleteGoal;

export const clearGoalWorkspace = deferFunction(
  () => require("./services/delete-goal.service").clearGoalWorkspace,
) as typeof import("./services/delete-goal.service").clearGoalWorkspace;

export const toggleGoalStatus = deferFunction(
  () => require("./services/toggle-goal-status.service").toggleGoalStatus,
) as typeof import("./services/toggle-goal-status.service").toggleGoalStatus;

export const calculateGoalProgress = deferFunction(
  () =>
    require("./services/calculate-goal-progress.service").calculateGoalProgress,
) as typeof import("./services/calculate-goal-progress.service").calculateGoalProgress;

// Types
export type {
  Goal,
  GoalStatus,
  GoalWithProgress,
  LinkedAccountItem,
  LinkedPocketItem,
  GoalInput,
  GoalSummaryStats,
} from "./types/goal.types";
export type { GoalFilter } from "./hooks/use-goals";
