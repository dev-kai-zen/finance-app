import type { WalkthroughStep } from "../types/walkthrough.types";

export interface ScheduledTransactionsWalkthroughOptions {
  hasSchedules?: boolean;
  hasDueSchedule?: boolean;
  /** Due card is mounted. Defaults to hasDueSchedule. */
  showDueSection?: boolean;
  /** A schedule row is mounted. Defaults to hasSchedules. */
  showFirstItem?: boolean;
}

export function getScheduledTransactionsWalkthroughSteps(
  options: ScheduledTransactionsWalkthroughOptions = {},
): WalkthroughStep[] {
  const {
    hasSchedules = false,
    hasDueSchedule = false,
    showDueSection = hasDueSchedule,
    showFirstItem = hasSchedules,
  } = options;

  const searchStep: WalkthroughStep = {
    id: "scheduledSearch",
    targetId: "scheduledSearch",
    titleKey: "scheduledTransactionsWalkthrough.stepSearchTitle",
    descKey: "scheduledTransactionsWalkthrough.stepSearchDesc",
  };
  const filterStep: WalkthroughStep = {
    id: "scheduledFilter",
    targetId: "scheduledFilter",
    titleKey: "scheduledTransactionsWalkthrough.stepFilterTitle",
    descKey: "scheduledTransactionsWalkthrough.stepFilterDesc",
  };
  const fabStep: WalkthroughStep = {
    id: "scheduledFab",
    targetId: "scheduledFab",
    titleKey: "scheduledTransactionsWalkthrough.stepFabTitle",
    descKey: "scheduledTransactionsWalkthrough.stepFabDesc",
  };

  if (!hasSchedules) {
    return [searchStep, filterStep, fabStep];
  }

  const steps: WalkthroughStep[] = [searchStep];

  if (showDueSection) {
    steps.push(
      {
        id: "scheduledDueCard",
        targetId: "scheduledDueCard",
        titleKey: "scheduledTransactionsWalkthrough.stepDueCardTitle",
        descKey: "scheduledTransactionsWalkthrough.stepDueCardDesc",
      },
      {
        id: "scheduledDueSkip",
        targetId: "scheduledDueSkip",
        titleKey: "scheduledTransactionsWalkthrough.stepDueSkipTitle",
        descKey: "scheduledTransactionsWalkthrough.stepDueSkipDesc",
      },
      {
        id: "scheduledDuePost",
        targetId: "scheduledDuePost",
        titleKey: "scheduledTransactionsWalkthrough.stepDuePostTitle",
        descKey: "scheduledTransactionsWalkthrough.stepDuePostDesc",
      },
    );
  }

  steps.push(filterStep);

  if (showFirstItem) {
    steps.push({
      id: "scheduledFirstItem",
      targetId: "scheduledFirstItem",
      titleKey: "scheduledTransactionsWalkthrough.stepFirstItemTitle",
      descKey: "scheduledTransactionsWalkthrough.stepFirstItemDesc",
    });
  }

  steps.push(fabStep);
  return steps;
}
