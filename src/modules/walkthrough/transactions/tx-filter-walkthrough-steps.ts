import type { WalkthroughStep } from "../types/walkthrough.types";

export const TX_FILTER_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "txFilterDate",
    targetId: "txFilterDate",
    titleKey: "txFilterWalkthrough.stepDateTitle",
    descKey: "txFilterWalkthrough.stepDateDesc",
  },
  {
    id: "txFilterType",
    targetId: "txFilterType",
    titleKey: "txFilterWalkthrough.stepTypeTitle",
    descKey: "txFilterWalkthrough.stepTypeDesc",
  },
  {
    id: "txFilterAccounts",
    targetId: "txFilterAccounts",
    titleKey: "txFilterWalkthrough.stepAccountsTitle",
    descKey: "txFilterWalkthrough.stepAccountsDesc",
  },
  {
    id: "txFilterAmount",
    targetId: "txFilterAmount",
    titleKey: "txFilterWalkthrough.stepAmountTitle",
    descKey: "txFilterWalkthrough.stepAmountDesc",
  },
  {
    id: "txFilterApply",
    targetId: "txFilterApply",
    titleKey: "txFilterWalkthrough.stepApplyTitle",
    descKey: "txFilterWalkthrough.stepApplyDesc",
  },
];

