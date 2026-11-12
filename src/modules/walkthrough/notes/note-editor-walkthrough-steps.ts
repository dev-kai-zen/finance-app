import type { WalkthroughStep } from "../types/walkthrough.types";

export const NOTE_EDITOR_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "noteEditorTitle",
    targetId: "noteEditorTitle",
    titleKey: "noteEditorWalkthrough.stepTitleTitle",
    descKey: "noteEditorWalkthrough.stepTitleDesc",
  },
  {
    id: "noteEditorContent",
    targetId: "noteEditorContent",
    titleKey: "noteEditorWalkthrough.stepContentTitle",
    descKey: "noteEditorWalkthrough.stepContentDesc",
  },
  {
    id: "noteEditorColor",
    targetId: "noteEditorColor",
    titleKey: "noteEditorWalkthrough.stepColorTitle",
    descKey: "noteEditorWalkthrough.stepColorDesc",
  },
  {
    id: "noteEditorPin",
    targetId: "noteEditorPin",
    titleKey: "noteEditorWalkthrough.stepPinTitle",
    descKey: "noteEditorWalkthrough.stepPinDesc",
  },
  {
    id: "noteEditorAttachments",
    targetId: "noteEditorAttachments",
    titleKey: "noteEditorWalkthrough.stepAttachmentsTitle",
    descKey: "noteEditorWalkthrough.stepAttachmentsDesc",
  },
  {
    id: "noteEditorSave",
    targetId: "noteEditorSave",
    titleKey: "noteEditorWalkthrough.stepSaveTitle",
    descKey: "noteEditorWalkthrough.stepSaveDesc",
  },
];

