import type { WalkthroughTargetId } from "../types/walkthrough.types";
import { useModalWalkthrough } from "../hooks/use-modal-walkthrough";
import { PRESET_FORM_WALKTHROUGH_STEPS } from "./preset-form-walkthrough-steps";

export function usePresetFormWalkthrough({
  onScrollToTarget,
}: {
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
} = {}) {
  return useModalWalkthrough({
    steps: PRESET_FORM_WALKTHROUGH_STEPS,
    dismissPromptKey: "presetFormWalkthroughDismissed",
    onScrollToTarget,
  });
}

