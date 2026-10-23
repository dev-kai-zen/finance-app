import type { WalkthroughStep } from "../types/walkthrough.types";

export interface ScheduledTransactionsWalkthroughOptions {
  hasSchedules?: boolean;
  hasDueSchedule?: boolean;
}

export function getScheduledTransactionsWalkthroughSteps(
  options: ScheduledTransactionsWalkthroughOptions = {},
): WalkthroughStep[] {
  const { hasSchedules = false, hasDueSchedule = false } = options;

  // Case A: No schedules created yet
  if (!hasSchedules) {
    return [
      {
        id: "scheduledSearch",
        targetId: "scheduledSearch",
        titleKey: "scheduledTransactionsWalkthrough.stepSearchTitle",
        descKey: "scheduledTransactionsWalkthrough.stepSearchDesc",
      },
      {
        id: "scheduledFilter",
        targetId: "scheduledFilter",
        titleKey: "scheduledTransactionsWalkthrough.stepFilterTitle",
        descKey: "scheduledTransactionsWalkthrough.stepFilterDesc",
      },
      {
        id: "scheduledFab",
        targetId: "scheduledFab",
        titleKey: "scheduledTransactionsWalkthrough.stepFabTitle",
        descKey: "scheduledTransactionsWalkthrough.stepFabDesc",
      },
    ];
  }

  // Case B: Due schedule exists needing attention
  if (hasDueSchedule) {
    return [
      {
        id: "scheduledSearch",
        targetId: "scheduledSearch",
        titleKey: "scheduledTransactionsWalkthrough.stepSearchTitle",
        descKey: "scheduledTransactionsWalkthrough.stepSearchDesc",
      },
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
      {
        id: "scheduledFilter",
        targetId: "scheduledFilter",
        titleKey: "scheduledTransactionsWalkthrough.stepFilterTitle",
        descKey: "scheduledTransactionsWalkthrough.stepFilterDesc",
      },
      {
        id: "scheduledFirstItem",
        targetId: "scheduledFirstItem",
        titleKey: "scheduledTransactionsWalkthrough.stepFirstItemTitle",
        descKey: "scheduledTransactionsWalkthrough.stepFirstItemDesc",
      },
      {
        id: "scheduledFab",
        targetId: "scheduledFab",
        titleKey: "scheduledTransactionsWalkthrough.stepFabTitle",
        descKey: "scheduledTransactionsWalkthrough.stepFabDesc",
      },
    ];
  }

  // Case C: Standard list / 1st schedule walkthrough
  return [
    {
      id: "scheduledSearch",
      targetId: "scheduledSearch",
      titleKey: "scheduledTransactionsWalkthrough.stepSearchTitle",
      descKey: "scheduledTransactionsWalkthrough.stepSearchDesc",
    },
    {
      id: "scheduledFilter",
      targetId: "scheduledFilter",
      titleKey: "scheduledTransactionsWalkthrough.stepFilterTitle",
      descKey: "scheduledTransactionsWalkthrough.stepFilterDesc",
    },
    {
      id: "scheduledFirstItem",
      targetId: "scheduledFirstItem",
      titleKey: "scheduledTransactionsWalkthrough.stepFirstItemTitle",
      descKey: "scheduledTransactionsWalkthrough.stepFirstItemDesc",
    },
    {
      id: "scheduledFab",
      targetId: "scheduledFab",
      titleKey: "scheduledTransactionsWalkthrough.stepFabTitle",
      descKey: "scheduledTransactionsWalkthrough.stepFabDesc",
    },
  ];
}
