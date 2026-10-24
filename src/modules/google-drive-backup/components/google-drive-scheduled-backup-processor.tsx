import { useEffect } from "react";
import { AppState } from "react-native";

import { useWorkspace } from "@/modules/onboarding";
import { runGoogleDriveScheduledBackupIfDue } from "@/modules/google-drive-backup/services/run-google-drive-scheduled-backup-if-due.service";

export function GoogleDriveScheduledBackupProcessor() {
  const workspace = useWorkspace();
  const isPersonalWorkspace = workspace.state.mode === "personal";

  useEffect(() => {
    if (!isPersonalWorkspace) return;

    const runIfDue = () => {
      void runGoogleDriveScheduledBackupIfDue().catch(() => {
        // The Google Drive screen surfaces connection and upload errors.
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
