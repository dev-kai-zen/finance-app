import type { WalkthroughStep } from "../types/walkthrough.types";

export interface GetBudgetsWalkthroughStepsOptions {
  hasBudgets: boolean;
  hasBudgetInList?: boolean;
}

export function getBudgetsWalkthroughSteps(
  options: GetBudgetsWalkthroughStepsOptions,
): WalkthroughStep[] {
  const { hasBudgets, hasBudgetInList = true } = options;

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

  const steps: WalkthroughStep[] = [
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
  ];

  if (hasBudgetInList) {
    steps.push({
      id: "budgetFirstItemToggle",
      targetId: "budgetFirstItemToggle",
      titleKey: "budgetsWalkthrough.stepFirstItemToggleTitle",
      descKey: "budgetsWalkthrough.stepFirstItemToggleDesc",
    });
  }

  steps.push({
    id: "budgetFab",
    targetId: "budgetFab",
    titleKey: "budgetsWalkthrough.stepFabTitle",
    descKey: "budgetsWalkthrough.stepFabDesc",
  });

  return steps;
}
