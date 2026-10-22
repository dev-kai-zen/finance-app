import type { WalkthroughStep } from "../types/walkthrough.types";

export interface GetGoalsWalkthroughStepsOptions {
  hasGoals: boolean;
}

export function getGoalsWalkthroughSteps(
  options: GetGoalsWalkthroughStepsOptions,
): WalkthroughStep[] {
  const { hasGoals } = options;

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

  if (hasGoals) {
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
