import type { WalkthroughTargetId } from "../types/walkthrough.types";
import { useModalWalkthrough } from "../hooks/use-modal-walkthrough";
import { CATEGORY_FORM_WALKTHROUGH_STEPS } from "./category-form-walkthrough-steps";

export function useCategoryFormWalkthrough({
  onScrollToTarget,
}: {
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
} = {}) {
  return useModalWalkthrough({
    steps: CATEGORY_FORM_WALKTHROUGH_STEPS,
    dismissPromptKey: "categoryFormWalkthroughDismissed",
    onScrollToTarget,
  });
}

