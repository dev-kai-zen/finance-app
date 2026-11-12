import type { WalkthroughTargetId } from "../types/walkthrough.types";
import { useModalWalkthrough } from "../hooks/use-modal-walkthrough";
import { NOTE_EDITOR_WALKTHROUGH_STEPS } from "./note-editor-walkthrough-steps";

export function useNoteEditorWalkthrough({
  onScrollToTarget,
}: {
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
} = {}) {
  return useModalWalkthrough({
    steps: NOTE_EDITOR_WALKTHROUGH_STEPS,
    dismissPromptKey: "noteEditorWalkthroughDismissed",
    onScrollToTarget,
  });
}

