import { useEffect } from "react";
import { AppState } from "react-native";

import { useWorkspace } from "@/modules/onboarding";
import { runAutomaticLocalBackupIfDue } from "@/modules/local-backup/services/automatic-local-backup.service";

export function LocalBackupProcessor() {
  const workspace = useWorkspace();
  const isPersonalWorkspace = workspace.state.mode === "personal";

  useEffect(() => {
    if (!isPersonalWorkspace) return;

    const runIfDue = () => {
      void runAutomaticLocalBackupIfDue().catch(() => {
        // The manager screen reports actionable storage errors to the user.
      });
    };

    runIfDue();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") runIfDue();
    });

    return () => subscription.remove();
  }, [isPersonalWorkspace]);

  return null;
}
