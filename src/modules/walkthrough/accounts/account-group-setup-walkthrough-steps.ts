import type { WalkthroughStep } from "../types/walkthrough.types";

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
