import type { WalkthroughStep } from "../types/walkthrough.types";

export interface GetTransactionsWalkthroughStepsOptions {
  hasTransactionInList?: boolean;
}

export function getTransactionsWalkthroughSteps(
  options: GetTransactionsWalkthroughStepsOptions = {},
): WalkthroughStep[] {
  const { hasTransactionInList = false } = options;

  const steps: WalkthroughStep[] = [
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
  ];

  if (hasTransactionInList) {
    steps.push({
      id: "txFirstItem",
      targetId: "txFirstItem",
      titleKey: "transactionsWalkthrough.stepFirstItemTitle",
      descKey: "transactionsWalkthrough.stepFirstItemDesc",
    });
  }

  steps.push({
    id: "txFab",
    targetId: "txFab",
    titleKey: "transactionsWalkthrough.stepFabTitle",
    descKey: "transactionsWalkthrough.stepFabDesc",
  });

  return steps;
}

export const TRANSACTIONS_WALKTHROUGH_STEPS: WalkthroughStep[] =
  getTransactionsWalkthroughSteps();
