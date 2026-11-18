import type { WalkthroughStep } from "../types/walkthrough.types";

export interface GetSubscriptionsWalkthroughStepsOptions {
  hasSubscriptions?: boolean;
  hasSubInList?: boolean;
}

export function getSubscriptionsWalkthroughSteps(
  options: GetSubscriptionsWalkthroughStepsOptions = {},
): WalkthroughStep[] {
  const { hasSubscriptions = false, hasSubInList = false } = options;

  if (!hasSubscriptions) {
    return [
      {
        id: "subEmptyAddButton",
        targetId: "subEmptyAddButton",
        titleKey: "subscriptionsWalkthrough.stepEmptyCreateTitle",
        descKey: "subscriptionsWalkthrough.stepEmptyCreateDesc",
      },
      {
        id: "subFab",
        targetId: "subFab",
        titleKey: "subscriptionsWalkthrough.stepFabTitle",
        descKey: "subscriptionsWalkthrough.stepFabDesc",
      },
    ];
  }

  const steps: WalkthroughStep[] = [
    {
      id: "subBurnRateSummary",
      targetId: "subBurnRateSummary",
      titleKey: "subscriptionsWalkthrough.stepBurnRateSummaryTitle",
      descKey: "subscriptionsWalkthrough.stepBurnRateSummaryDesc",
    },
    {
      id: "subFilterTabs",
      targetId: "subFilterTabs",
      titleKey: "subscriptionsWalkthrough.stepFilterTabsTitle",
      descKey: "subscriptionsWalkthrough.stepFilterTabsDesc",
    },
  ];

  if (hasSubInList) {
    steps.push({
      id: "subFirstItemCard",
      targetId: "subFirstItemCard",
      titleKey: "subscriptionsWalkthrough.stepFirstItemTitle",
      descKey: "subscriptionsWalkthrough.stepFirstItemDesc",
    });
  }

  steps.push({
    id: "subFab",
    targetId: "subFab",
    titleKey: "subscriptionsWalkthrough.stepFabTitle",
    descKey: "subscriptionsWalkthrough.stepFabDesc",
  });

  return steps;
}
