import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

import { useWorkspace } from "@/modules/onboarding";
import { useAppLock } from "@/modules/security";
import { VersionHistoryModal } from "@/modules/version-history/components/version-history-modal";
import {
  evaluateAutoShowPresentation,
  markVersionHistorySeen,
} from "@/modules/version-history/services/version-history.service";
import type { ReleaseNoteBlock } from "@/modules/version-history/types/version-history.types";

export function VersionHistoryGate({ children }: PropsWithChildren) {
  const { state } = useWorkspace();
  const { isLocked, isReady } = useAppLock();
  const [visible, setVisible] = useState(false);
  const [blocks, setBlocks] = useState<ReleaseNoteBlock[]>([]);

  useEffect(() => {
    if (!isReady || isLocked) return;
    if (state.status !== "completed") return;

    const presentation = evaluateAutoShowPresentation();
    if (!presentation) return;

    const timer = setTimeout(() => {
      setBlocks(presentation.blocks);
      setVisible(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [state.status, isLocked, isReady]);

  return (
    <>
      {children}
      <VersionHistoryModal
        blocks={blocks}
        visible={visible && !isLocked}
        onClose={() => {
          setVisible(false);
          markVersionHistorySeen();
        }}
      />
    </>
  );
}
