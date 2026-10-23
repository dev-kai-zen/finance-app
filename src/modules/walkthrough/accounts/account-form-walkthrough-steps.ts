import type { WalkthroughStep } from "../types/walkthrough.types";

export interface GetAccountFormWalkthroughStepsOptions {
  showMaintainingBalance: boolean;
  showPockets: boolean;
}

export function getAccountFormWalkthroughSteps({
  showMaintainingBalance,
  showPockets,
}: GetAccountFormWalkthroughStepsOptions): WalkthroughStep[] {
  return ACCOUNT_FORM_WALKTHROUGH_STEPS.filter((step) => {
    if (step.id === "accountFormMaintainingBalance") {
      return showMaintainingBalance;
    }
    if (step.id === "accountFormEnablePockets") {
      return showPockets;
    }
    return true;
  });
}

export const ACCOUNT_FORM_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "accountFormName",
    targetId: "accountFormName",
    titleKey: "accountFormWalkthrough.stepNameTitle",
    descKey: "accountFormWalkthrough.stepNameDesc",
  },
  {
    id: "accountFormNote",
    targetId: "accountFormNote",
    titleKey: "accountFormWalkthrough.stepNoteTitle",
    descKey: "accountFormWalkthrough.stepNoteDesc",
  },
  {
    id: "accountFormType",
    targetId: "accountFormType",
    titleKey: "accountFormWalkthrough.stepTypeTitle",
    descKey: "accountFormWalkthrough.stepTypeDesc",
  },
  {
    id: "accountFormIcon",
    targetId: "accountFormIcon",
    titleKey: "accountFormWalkthrough.stepIconTitle",
    descKey: "accountFormWalkthrough.stepIconDesc",
  },
  {
    id: "accountFormStartingBalance",
    targetId: "accountFormStartingBalance",
    titleKey: "accountFormWalkthrough.stepStartingBalanceTitle",
    descKey: "accountFormWalkthrough.stepStartingBalanceDesc",
  },
  {
    id: "accountFormCurrency",
    targetId: "accountFormCurrency",
    titleKey: "accountFormWalkthrough.stepCurrencyTitle",
    descKey: "accountFormWalkthrough.stepCurrencyDesc",
  },
  {
    id: "accountFormMaintainingBalance",
    targetId: "accountFormMaintainingBalance",
    titleKey: "accountFormWalkthrough.stepMaintainingBalanceTitle",
    descKey: "accountFormWalkthrough.stepMaintainingBalanceDesc",
  },
  {
    id: "accountFormEnablePockets",
    targetId: "accountFormEnablePockets",
    titleKey: "accountFormWalkthrough.stepEnablePocketsTitle",
    descKey: "accountFormWalkthrough.stepEnablePocketsDesc",
  },
  {
    id: "accountFormHideSelection",
    targetId: "accountFormHideSelection",
    titleKey: "accountFormWalkthrough.stepHideSelectionTitle",
    descKey: "accountFormWalkthrough.stepHideSelectionDesc",
  },
  {
    id: "accountFormHideReports",
    targetId: "accountFormHideReports",
    titleKey: "accountFormWalkthrough.stepHideReportsTitle",
    descKey: "accountFormWalkthrough.stepHideReportsDesc",
  },
  {
    id: "accountFormOpeningDate",
    targetId: "accountFormOpeningDate",
    titleKey: "accountFormWalkthrough.stepOpeningDateTitle",
    descKey: "accountFormWalkthrough.stepOpeningDateDesc",
  },
];
