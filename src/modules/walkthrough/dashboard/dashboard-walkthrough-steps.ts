import type { WalkthroughStep } from "../types/walkthrough.types";

export const DASHBOARD_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "netWorthCard",
    targetId: "netWorthCard",
    titleKey: "dashboard.stepNetWorthTitle",
    descKey: "dashboard.stepNetWorthDesc",
  },
  {
    id: "collapseIcon",
    targetId: "collapseIcon",
    titleKey: "dashboard.stepCollapseTitle",
    descKey: "dashboard.stepCollapseDesc",
  },
  {
    id: "settingsIcon",
    targetId: "settingsIcon",
    titleKey: "dashboard.stepSettingsTitle",
    descKey: "dashboard.stepSettingsDesc",
  },
  {
    id: "settingsDemonstration",
    targetId: "settingsDemonstration",
    titleKey: "dashboard.stepSettingsModalTitle",
    descKey: "dashboard.stepSettingsModalDesc",
    isSimulatedModal: true,
  },
  {
    id: "eyeIcon",
    targetId: "eyeIcon",
    titleKey: "dashboard.stepEyeTitle",
    descKey: "dashboard.stepEyeDesc",
  },
  {
    id: "recentTxCard",
    targetId: "recentTxCard",
    titleKey: "dashboard.stepRecentTxTitle",
    descKey: "dashboard.stepRecentTxDesc",
  },
  {
    id: "fabButton",
    targetId: "fabButton",
    titleKey: "dashboard.stepFabTitle",
    descKey: "dashboard.stepFabDesc",
  },
];
