import type { WalkthroughStep } from "../types/walkthrough.types";

export interface GetBudgetsWalkthroughStepsOptions {
  hasBudgets: boolean;
}

export function getBudgetsWalkthroughSteps(
  options: GetBudgetsWalkthroughStepsOptions,
): WalkthroughStep[] {
  const { hasBudgets } = options;

  if (!hasBudgets) {
    return [
      {
        id: "budgetEmptyCreateButton",
        targetId: "budgetEmptyCreateButton",
        titleKey: "budgetsWalkthrough.stepEmptyCreateTitle",
        descKey: "budgetsWalkthrough.stepEmptyCreateDesc",
      },
    ];
  }

  return [
    {
      id: "budgetTotalActiveCard",
      targetId: "budgetTotalActiveCard",
      titleKey: "budgetsWalkthrough.stepTotalActiveTitle",
      descKey: "budgetsWalkthrough.stepTotalActiveDesc",
    },
    {
      id: "budgetFrequencyTabs",
      targetId: "budgetFrequencyTabs",
      titleKey: "budgetsWalkthrough.stepFrequencyTabsTitle",
      descKey: "budgetsWalkthrough.stepFrequencyTabsDesc",
    },
    {
      id: "budgetFirstItemToggle",
      targetId: "budgetFirstItemToggle",
      titleKey: "budgetsWalkthrough.stepFirstItemToggleTitle",
      descKey: "budgetsWalkthrough.stepFirstItemToggleDesc",
    },
    {
      id: "budgetFab",
      targetId: "budgetFab",
      titleKey: "budgetsWalkthrough.stepFabTitle",
      descKey: "budgetsWalkthrough.stepFabDesc",
    },
  ];
}
