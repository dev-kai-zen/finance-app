import type { WalkthroughStep } from "../types/walkthrough.types";

export interface GetGoalsWalkthroughStepsOptions {
  hasGoalInList?: boolean;
}

export function getGoalsWalkthroughSteps(
  options: GetGoalsWalkthroughStepsOptions = {},
): WalkthroughStep[] {
  const { hasGoalInList = false } = options;

  const steps: WalkthroughStep[] = [
    {
      id: "goalTotalTargetCard",
      targetId: "goalTotalTargetCard",
      titleKey: "goalsWalkthrough.stepTotalTargetTitle",
      descKey: "goalsWalkthrough.stepTotalTargetDesc",
    },
    {
      id: "goalStatusFilters",
      targetId: "goalStatusFilters",
      titleKey: "goalsWalkthrough.stepStatusFiltersTitle",
      descKey: "goalsWalkthrough.stepStatusFiltersDesc",
    },
  ];

  if (hasGoalInList) {
    steps.push({
      id: "goalFirstItemMarkComplete",
      targetId: "goalFirstItemMarkComplete",
      titleKey: "goalsWalkthrough.stepFirstItemMarkCompleteTitle",
      descKey: "goalsWalkthrough.stepFirstItemMarkCompleteDesc",
    });
  }

  steps.push({
    id: "goalFab",
    targetId: "goalFab",
    titleKey: "goalsWalkthrough.stepFabTitle",
    descKey: "goalsWalkthrough.stepFabDesc",
  });

  return steps;
}
