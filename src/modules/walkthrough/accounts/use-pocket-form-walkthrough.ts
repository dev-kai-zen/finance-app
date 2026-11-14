import { useMemo } from "react";
import type { WalkthroughTargetId } from "../types/walkthrough.types";
import { useModalWalkthrough } from "../hooks/use-modal-walkthrough";
import { getPocketFormWalkthroughSteps } from "./pocket-form-walkthrough-steps";

export function usePocketFormWalkthrough({
  isEditing = false,
  onScrollToTarget,
}: {
  isEditing?: boolean;
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
} = {}) {
  const steps = useMemo(
    () => getPocketFormWalkthroughSteps({ isEditing }),
    [isEditing],
  );

  return useModalWalkthrough({
    steps,
    dismissPromptKey: "pocketFormWalkthroughDismissed",
    onScrollToTarget,
  });
}


