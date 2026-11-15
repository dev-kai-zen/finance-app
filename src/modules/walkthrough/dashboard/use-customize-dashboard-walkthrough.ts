import type { WalkthroughTargetId } from "../types/walkthrough.types";
import { useModalWalkthrough } from "../hooks/use-modal-walkthrough";
import { CUSTOMIZE_DASHBOARD_WALKTHROUGH_STEPS } from "./customize-dashboard-walkthrough-steps";

export function useCustomizeDashboardWalkthrough({
  onScrollToTarget,
}: {
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
} = {}) {
  return useModalWalkthrough({
    steps: CUSTOMIZE_DASHBOARD_WALKTHROUGH_STEPS,
    dismissPromptKey: "customizeDashboardWalkthroughDismissed",
    onScrollToTarget,
  });
}

