import type { WalkthroughTargetId } from "../types/walkthrough.types";
import { useModalWalkthrough } from "../hooks/use-modal-walkthrough";
import { POCKET_FORM_WALKTHROUGH_STEPS } from "./pocket-form-walkthrough-steps";

export function usePocketFormWalkthrough({
  onScrollToTarget,
}: {
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
} = {}) {
  return useModalWalkthrough({
    steps: POCKET_FORM_WALKTHROUGH_STEPS,
    dismissPromptKey: "pocketFormWalkthroughDismissed",
    onScrollToTarget,
  });
}

