import type { WalkthroughStep } from "../types/walkthrough.types";

export const GOAL_FORM_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "goalFormTitle",
    targetId: "goalFormTitle",
    titleKey: "goalFormWalkthrough.stepTitleTitle",
    descKey: "goalFormWalkthrough.stepTitleDesc",
  },
  {
    id: "goalFormAmount",
    targetId: "goalFormAmount",
    titleKey: "goalFormWalkthrough.stepTargetAmountTitle",
    descKey: "goalFormWalkthrough.stepTargetAmountDesc",
  },
  {
    id: "goalFormLinked",
    targetId: "goalFormLinked",
    titleKey: "goalFormWalkthrough.stepLinkedAccountsTitle",
    descKey: "goalFormWalkthrough.stepLinkedAccountsDesc",
  },
  {
    id: "goalFormDate",
    targetId: "goalFormDate",
    titleKey: "goalFormWalkthrough.stepTargetDateTitle",
    descKey: "goalFormWalkthrough.stepTargetDateDesc",
  },
  {
    id: "goalFormIcon",
    targetId: "goalFormIcon",
    titleKey: "goalFormWalkthrough.stepIconTitle",
    descKey: "goalFormWalkthrough.stepIconDesc",
  },
  {
    id: "goalFormColor",
    targetId: "goalFormColor",
    titleKey: "goalFormWalkthrough.stepAccentColorTitle",
    descKey: "goalFormWalkthrough.stepAccentColorDesc",
  },
  {
    id: "goalFormNotes",
    targetId: "goalFormNotes",
    titleKey: "goalFormWalkthrough.stepNotesTitle",
    descKey: "goalFormWalkthrough.stepNotesDesc",
  },
  {
    id: "goalFormSave",
    targetId: "goalFormSave",
    titleKey: "goalFormWalkthrough.stepSaveTitle",
    descKey: "goalFormWalkthrough.stepSaveDesc",
  },
];
