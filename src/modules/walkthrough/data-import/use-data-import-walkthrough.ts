import type { WalkthroughTargetId } from "../types/walkthrough.types";
import { useModalWalkthrough } from "../hooks/use-modal-walkthrough";
import { DATA_IMPORT_WALKTHROUGH_STEPS } from "./data-import-walkthrough-steps";

export function useDataImportWalkthrough({
  onScrollToTarget,
}: {
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
} = {}) {
  return useModalWalkthrough({
    steps: DATA_IMPORT_WALKTHROUGH_STEPS,
    dismissPromptKey: "dataImportWalkthroughDismissed",
    onScrollToTarget,
  });
}

