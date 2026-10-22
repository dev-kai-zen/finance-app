import type { WalkthroughStep } from "../types/walkthrough.types";

export const TRANSACTIONS_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "txSearch",
    targetId: "txSearch",
    titleKey: "transactionsWalkthrough.stepSearchTitle",
    descKey: "transactionsWalkthrough.stepSearchDesc",
  },
  {
    id: "txFilter",
    targetId: "txFilter",
    titleKey: "transactionsWalkthrough.stepFilterTitle",
    descKey: "transactionsWalkthrough.stepFilterDesc",
  },
  {
    id: "txSortDate",
    targetId: "txSortDate",
    titleKey: "transactionsWalkthrough.stepSortDateTitle",
    descKey: "transactionsWalkthrough.stepSortDateDesc",
  },
  {
    id: "txSortAmount",
    targetId: "txSortAmount",
    titleKey: "transactionsWalkthrough.stepSortAmountTitle",
    descKey: "transactionsWalkthrough.stepSortAmountDesc",
  },
  {
    id: "txSortOrder",
    targetId: "txSortOrder",
    titleKey: "transactionsWalkthrough.stepSortOrderTitle",
    descKey: "transactionsWalkthrough.stepSortOrderDesc",
  },
  {
    id: "txViewMode",
    targetId: "txViewMode",
    titleKey: "transactionsWalkthrough.stepViewModeTitle",
    descKey: "transactionsWalkthrough.stepViewModeDesc",
  },
  {
    id: "txScheduled",
    targetId: "txScheduled",
    titleKey: "transactionsWalkthrough.stepScheduledTitle",
    descKey: "transactionsWalkthrough.stepScheduledDesc",
  },
  {
    id: "txTrash",
    targetId: "txTrash",
    titleKey: "transactionsWalkthrough.stepTrashTitle",
    descKey: "transactionsWalkthrough.stepTrashDesc",
  },
  {
    id: "txExport",
    targetId: "txExport",
    titleKey: "transactionsWalkthrough.stepExportTitle",
    descKey: "transactionsWalkthrough.stepExportDesc",
  },
  {
    id: "txFab",
    targetId: "txFab",
    titleKey: "transactionsWalkthrough.stepFabTitle",
    descKey: "transactionsWalkthrough.stepFabDesc",
  },
];
