import type { WalkthroughStep } from "../types/walkthrough.types";

export const REPORTS_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "reportsTabBar",
    targetId: "reportsTabBar",
    titleKey: "reportsWalkthrough.stepTabBarTitle",
    descKey: "reportsWalkthrough.stepTabBarDesc",
  },
  {
    id: "reportsFilterBar",
    targetId: "reportsFilterBar",
    titleKey: "reportsWalkthrough.stepFilterBarTitle",
    descKey: "reportsWalkthrough.stepFilterBarDesc",
  },
  {
    id: "reportsChart",
    targetId: "reportsChart",
    titleKey: "reportsWalkthrough.stepChartTitle",
    descKey: "reportsWalkthrough.stepChartDesc",
  },
  {
    id: "reportsBreakdownTable",
    targetId: "reportsBreakdownTable",
    titleKey: "reportsWalkthrough.stepBreakdownTableTitle",
    descKey: "reportsWalkthrough.stepBreakdownTableDesc",
  },
];

export function getReportsWalkthroughSteps(): WalkthroughStep[] {
  return REPORTS_WALKTHROUGH_STEPS;
}

