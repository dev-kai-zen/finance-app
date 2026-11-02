import { useCallback, useEffect, useState } from "react";
import {
  addUpdateStatusListener,
  checkAppUpdate,
  completeFlexibleUpdate,
  IAUInstallStatus,
  startAppUpdate,
} from "../services/in-app-update.service";
import type {
  AppUpdateDownloadProgress,
  AppUpdateStatus,
} from "../types/app-updates.types";

export function useInAppUpdate() {
  const [status, setStatus] = useState<AppUpdateStatus>("idle");
  const [progress, setProgress] = useState<AppUpdateDownloadProgress | null>(null);
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = addUpdateStatusListener((installStatus, downloadProgress) => {
      if (downloadProgress) {
        setProgress(downloadProgress);
      }

      switch (installStatus) {
        case IAUInstallStatus.DOWNLOADING:
          setStatus("downloading");
          break;
        case IAUInstallStatus.DOWNLOADED:
          setStatus("downloaded");
          setIsPromptDismissed(false);
          break;
        case IAUInstallStatus.FAILED:
          setStatus("failed");
          break;
        case IAUInstallStatus.INSTALLED:
          setStatus("idle");
          break;
        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkAndUpdate = useCallback(async (options?: { immediate?: boolean }) => {
    setStatus("checking");
    try {
      const result = await checkAppUpdate();
      if (result.shouldUpdate) {
        setStatus("available");
        await startAppUpdate({
          immediate: options?.immediate ?? result.isImmediate,
        });
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("failed");
    }
  }, []);

  const completeUpdate = useCallback(() => {
    completeFlexibleUpdate();
  }, []);

  const dismissDownloadedPrompt = useCallback(() => {
    setIsPromptDismissed(true);
  }, []);

  return {
    status,
    progress,
    isDownloaded: status === "downloaded" && !isPromptDismissed,
    isDownloading: status === "downloading",
    checkAndUpdate,
    completeUpdate,
    dismissDownloadedPrompt,
  };
}

