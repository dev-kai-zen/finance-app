import type { WalkthroughStep } from "../types/walkthrough.types";

export const DATA_IMPORT_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "importStepFile",
    targetId: "importStepFile",
    titleKey: "dataImportWalkthrough.stepFileTitle",
    descKey: "dataImportWalkthrough.stepFileDesc",
  },
  {
    id: "importStepMapping",
    targetId: "importStepMapping",
    titleKey: "dataImportWalkthrough.stepMappingTitle",
    descKey: "dataImportWalkthrough.stepMappingDesc",
  },
  {
    id: "importStepAccount",
    targetId: "importStepAccount",
    titleKey: "dataImportWalkthrough.stepAccountTitle",
    descKey: "dataImportWalkthrough.stepAccountDesc",
  },
  {
    id: "importStepReview",
    targetId: "importStepReview",
    titleKey: "dataImportWalkthrough.stepReviewTitle",
    descKey: "dataImportWalkthrough.stepReviewDesc",
  },
];

