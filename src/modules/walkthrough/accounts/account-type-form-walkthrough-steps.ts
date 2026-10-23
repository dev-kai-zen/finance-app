import type { WalkthroughStep } from "../types/walkthrough.types";

export const ACCOUNT_TYPE_FORM_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "accountTypeFormName",
    targetId: "accountTypeFormName",
    titleKey: "accountTypeFormWalkthrough.stepNameTitle",
    descKey: "accountTypeFormWalkthrough.stepNameDesc",
  },
  {
    id: "accountTypeFormClassification",
    targetId: "accountTypeFormClassification",
    titleKey: "accountTypeFormWalkthrough.stepClassificationTitle",
    descKey: "accountTypeFormWalkthrough.stepClassificationDesc",
  },
  {
    id: "accountTypeFormIcon",
    targetId: "accountTypeFormIcon",
    titleKey: "accountTypeFormWalkthrough.stepIconTitle",
    descKey: "accountTypeFormWalkthrough.stepIconDesc",
  },
  {
    id: "accountTypeFormColor",
    targetId: "accountTypeFormColor",
    titleKey: "accountTypeFormWalkthrough.stepColorTitle",
    descKey: "accountTypeFormWalkthrough.stepColorDesc",
  },
  {
    id: "accountTypeFormCustomColor",
    targetId: "accountTypeFormCustomColor",
    titleKey: "accountTypeFormWalkthrough.stepCustomColorTitle",
    descKey: "accountTypeFormWalkthrough.stepCustomColorDesc",
  },
  {
    id: "accountTypeFormSave",
    targetId: "accountTypeFormSave",
    titleKey: "accountTypeFormWalkthrough.stepSaveTitle",
    descKey: "accountTypeFormWalkthrough.stepSaveDesc",
  },
];
