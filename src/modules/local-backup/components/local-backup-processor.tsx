import { useEffect } from "react";
import { AppState } from "react-native";

import { scheduleAfterInteractions } from "@/utils/schedule-after-interactions";
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

    const cancelInitial = scheduleAfterInteractions(runIfDue);
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelResumeSchedule: (() => void) | null = null;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
          cancelResumeSchedule = scheduleAfterInteractions(runIfDue);
        }, 2000);
      } else {
        if (resumeTimer) {
          clearTimeout(resumeTimer);
          resumeTimer = null;
        }
        if (cancelResumeSchedule) {
          cancelResumeSchedule();
          cancelResumeSchedule = null;
        }
      }
    });

    return () => {
      cancelInitial();
      if (resumeTimer) clearTimeout(resumeTimer);
      if (cancelResumeSchedule) cancelResumeSchedule();
      subscription.remove();
    };
  }, [isPersonalWorkspace]);

  return null;
}
