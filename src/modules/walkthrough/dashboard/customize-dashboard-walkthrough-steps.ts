import type { WalkthroughStep } from "../types/walkthrough.types";

export const CUSTOMIZE_DASHBOARD_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "customizeDashPreview",
    targetId: "customizeDashPreview",
    titleKey: "customizeDashboardWalkthrough.stepPreviewTitle",
    descKey: "customizeDashboardWalkthrough.stepPreviewDesc",
  },
  {
    id: "customizeDashCards",
    targetId: "customizeDashCards",
    titleKey: "customizeDashboardWalkthrough.stepCardsTitle",
    descKey: "customizeDashboardWalkthrough.stepCardsDesc",
  },
  {
    id: "customizeDashDone",
    targetId: "customizeDashDone",
    titleKey: "customizeDashboardWalkthrough.stepDoneTitle",
    descKey: "customizeDashboardWalkthrough.stepDoneDesc",
  },
];

