export type WalkthroughTargetId =
  | "netWorthCard"
  | "collapseIcon"
  | "settingsIcon"
  | "settingsDemonstration"
  | "eyeIcon"
  | "recentTxCard"
  | "fabButton"
  | "archivedChip"
  | "fundGroupsChip"
  | "searchBox"
  | "assetsSection"
  | "liabilitiesSection"
  | "accountsFab"
  | "accountsSheetDemonstration"
  | "txSearch"
  | "txFilter"
  | "txSortDate"
  | "txSortAmount"
  | "txSortOrder"
  | "txViewMode"
  | "txScheduled"
  | "txTrash"
  | "txExport"
  | "txFab"
  | "calArrows"
  | "calTransactionsTab"
  | "calSchedulesTab"
  | "calNetTab"
  | "calBalanceSheetTab"
  | "catTypeToggle"
  | "catReorderGroups"
  | "catPresetsIcon"
  | "catNewCategory"
  | "catFirstGroupReorderSub"
  | "catFirstGroupAddSub"
  | "budgetEmptyCreateButton"
  | "budgetTotalActiveCard"
  | "budgetFrequencyTabs"
  | "budgetFirstItemToggle"
  | "budgetFab"
  | "goalTotalTargetCard"
  | "goalStatusFilters"
  | "goalFirstItemMarkComplete"
  | "goalFab";

export type WalkthroughStepId = WalkthroughTargetId;

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WalkthroughStep {
  id: WalkthroughStepId;
  targetId: WalkthroughTargetId;
  titleKey: string;
  descKey: string;
  isSimulatedModal?: boolean;
}
