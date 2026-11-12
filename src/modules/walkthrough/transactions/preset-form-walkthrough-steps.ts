import type { WalkthroughStep } from "../types/walkthrough.types";

export const PRESET_FORM_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "presetFormName",
    targetId: "presetFormName",
    titleKey: "presetFormWalkthrough.stepNameTitle",
    descKey: "presetFormWalkthrough.stepNameDesc",
  },
  {
    id: "presetFormType",
    targetId: "presetFormType",
    titleKey: "presetFormWalkthrough.stepTypeTitle",
    descKey: "presetFormWalkthrough.stepTypeDesc",
  },
  {
    id: "presetFormAmount",
    targetId: "presetFormAmount",
    titleKey: "presetFormWalkthrough.stepAmountTitle",
    descKey: "presetFormWalkthrough.stepAmountDesc",
  },
  {
    id: "presetFormDetails",
    targetId: "presetFormDetails",
    titleKey: "presetFormWalkthrough.stepDetailsTitle",
    descKey: "presetFormWalkthrough.stepDetailsDesc",
  },
  {
    id: "presetFormSave",
    targetId: "presetFormSave",
    titleKey: "presetFormWalkthrough.stepSaveTitle",
    descKey: "presetFormWalkthrough.stepSaveDesc",
  },
];

