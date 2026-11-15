import type { WalkthroughTargetId } from "../types/walkthrough.types";
import { useModalWalkthrough } from "../hooks/use-modal-walkthrough";
import { TX_FILTER_WALKTHROUGH_STEPS } from "./tx-filter-walkthrough-steps";

export function useTxFilterWalkthrough({
  onScrollToTarget,
}: {
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
} = {}) {
  return useModalWalkthrough({
    steps: TX_FILTER_WALKTHROUGH_STEPS,
    dismissPromptKey: "txFilterWalkthroughDismissed",
    onScrollToTarget,
  });
}

