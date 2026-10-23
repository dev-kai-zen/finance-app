import type { WalkthroughStep } from "../types/walkthrough.types";

export const CATEGORY_FORM_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "categoryFormType",
    targetId: "categoryFormType",
    titleKey: "categoryFormWalkthrough.stepGroupTypeTitle",
    descKey: "categoryFormWalkthrough.stepGroupTypeDesc",
  },
  {
    id: "categoryFormName",
    targetId: "categoryFormName",
    titleKey: "categoryFormWalkthrough.stepNameTitle",
    descKey: "categoryFormWalkthrough.stepNameDesc",
  },
  {
    id: "categoryFormIcon",
    targetId: "categoryFormIcon",
    titleKey: "categoryFormWalkthrough.stepIconTitle",
    descKey: "categoryFormWalkthrough.stepIconDesc",
  },
  {
    id: "categoryFormColor",
    targetId: "categoryFormColor",
    titleKey: "categoryFormWalkthrough.stepColorTitle",
    descKey: "categoryFormWalkthrough.stepColorDesc",
  },
  {
    id: "categoryFormCustomColor",
    targetId: "categoryFormCustomColor",
    titleKey: "categoryFormWalkthrough.stepCustomColorTitle",
    descKey: "categoryFormWalkthrough.stepCustomColorDesc",
  },
  {
    id: "categoryFormCancel",
    targetId: "categoryFormCancel",
    titleKey: "categoryFormWalkthrough.stepCancelTitle",
    descKey: "categoryFormWalkthrough.stepCancelDesc",
  },
  {
    id: "categoryFormSave",
    targetId: "categoryFormSave",
    titleKey: "categoryFormWalkthrough.stepSaveTitle",
    descKey: "categoryFormWalkthrough.stepSaveDesc",
  },
];
