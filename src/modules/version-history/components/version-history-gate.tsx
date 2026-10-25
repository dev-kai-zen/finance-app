import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

import { useWorkspace } from "@/modules/onboarding";
import { useExperiencePreferences } from "@/modules/settings";
import { VersionHistoryModal } from "@/modules/version-history/components/version-history-modal";
import {
  evaluateAutoShowPresentation,
  markVersionHistorySeen,
} from "@/modules/version-history/services/version-history.service";
import type { ReleaseNoteBlock } from "@/modules/version-history/types/version-history.types";

export function VersionHistoryGate({ children }: PropsWithChildren) {
  const { state } = useWorkspace();
  const experience = useExperiencePreferences();
  const [visible, setVisible] = useState(false);
  const [blocks, setBlocks] = useState<ReleaseNoteBlock[]>([]);

  useEffect(() => {
    if (state.status !== "completed") return;
    if (!experience.isPromptDismissed("developerMessageSeen")) return;

    const presentation = evaluateAutoShowPresentation();
    if (!presentation) return;

    const timer = setTimeout(() => {
      setBlocks(presentation.blocks);
      setVisible(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [state.status, experience.isPromptDismissed]);

  return (
    <>
      {children}
      <VersionHistoryModal
        blocks={blocks}
        visible={visible}
        onClose={() => {
          setVisible(false);
          markVersionHistorySeen();
        }}
      />
    </>
  );
}
