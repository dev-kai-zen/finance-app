import {
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardLayoutPreferences,
  type DashboardWidgetId,
} from "@/modules/settings";
import type { WalkthroughStep } from "../types/walkthrough.types";

export const WIDGET_WALKTHROUGH_STEPS: Record<
  DashboardWidgetId,
  WalkthroughStep[]
> = {
  greeting: [
    {
      id: "greetingCard",
      targetId: "greetingCard",
      titleKey: "dashboard.stepGreetingTitle",
      descKey: "dashboard.stepGreetingDesc",
    },
  ],
  netWorth: [
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
  ],
  quickActions: [
    {
      id: "quickActionsCard",
      targetId: "quickActionsCard",
      titleKey: "dashboard.stepQuickActionsTitle",
      descKey: "dashboard.stepQuickActionsDesc",
    },
  ],
  cashflow: [
    {
      id: "cashflowCard",
      targetId: "cashflowCard",
      titleKey: "dashboard.stepCashflowTitle",
      descKey: "dashboard.stepCashflowDesc",
    },
  ],
  accountsStrip: [
    {
      id: "accountsCard",
      targetId: "accountsCard",
      titleKey: "dashboard.stepAccountsTitle",
      descKey: "dashboard.stepAccountsDesc",
    },
  ],
  topCategories: [
    {
      id: "topCategoriesCard",
      targetId: "topCategoriesCard",
      titleKey: "dashboard.stepTopCategoriesTitle",
      descKey: "dashboard.stepTopCategoriesDesc",
    },
  ],
  recentTransactions: [
    {
      id: "recentTxCard",
      targetId: "recentTxCard",
      titleKey: "dashboard.stepRecentTxTitle",
      descKey: "dashboard.stepRecentTxDesc",
    },
  ],
};

export const FOOTER_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "customizeHomeButton",
    targetId: "customizeHomeButton",
    titleKey: "dashboard.stepCustomizeHomeTitle",
    descKey: "dashboard.stepCustomizeHomeDesc",
  },
  {
    id: "fabButton",
    targetId: "fabButton",
    titleKey: "dashboard.stepFabTitle",
    descKey: "dashboard.stepFabDesc",
  },
];

export function getDashboardWalkthroughSteps(
  layout?: DashboardLayoutPreferences,
): WalkthroughStep[] {
  const activeLayout = layout ?? DEFAULT_DASHBOARD_LAYOUT;
  const hiddenSet = new Set(activeLayout.hidden ?? []);
  const visibleOrder = (activeLayout.order ?? []).filter(
    (widgetId) => !hiddenSet.has(widgetId),
  );

  const steps: WalkthroughStep[] = [];
  for (const widgetId of visibleOrder) {
    const widgetSteps = WIDGET_WALKTHROUGH_STEPS[widgetId];
    if (widgetSteps) {
      steps.push(...widgetSteps);
    }
  }

  steps.push(...FOOTER_WALKTHROUGH_STEPS);
  return steps;
}

export const DASHBOARD_WALKTHROUGH_STEPS: WalkthroughStep[] =
  getDashboardWalkthroughSteps(DEFAULT_DASHBOARD_LAYOUT);
