import type { WalkthroughStep } from "../types/walkthrough.types";

export interface GetAccountGroupSetupWalkthroughStepsOptions {
  showReorder: boolean;
}

export function getAccountGroupSetupWalkthroughSteps({
  showReorder,
}: GetAccountGroupSetupWalkthroughStepsOptions): WalkthroughStep[] {
  return ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS.filter((step) => {
    if (step.id === "accountGroupReorder") {
      return showReorder;
    }
    return true;
  });
}

export const ACCOUNT_GROUP_SETUP_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "accountGroupPicker",
    targetId: "accountGroupPicker",
    titleKey: "accountGroupSetupWalkthrough.stepClassificationPickerTitle",
    descKey: "accountGroupSetupWalkthrough.stepClassificationPickerDesc",
  },
  {
    id: "accountGroupReorder",
    targetId: "accountGroupReorder",
    titleKey: "accountGroupSetupWalkthrough.stepReorderTitle",
    descKey: "accountGroupSetupWalkthrough.stepReorderDesc",
  },
  {
    id: "accountGroupNew",
    targetId: "accountGroupNew",
    titleKey: "accountGroupSetupWalkthrough.stepNewGroupTitle",
    descKey: "accountGroupSetupWalkthrough.stepNewGroupDesc",
  },
];
