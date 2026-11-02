import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useWorkspace } from "@/modules/onboarding";
import { useInAppUpdate } from "../hooks/use-in-app-update";
import { InAppUpdateBanner } from "./in-app-update-banner";

export function InAppUpdateProcessor() {
  const { state } = useWorkspace();
  const {
    isDownloaded,
    checkAndUpdate,
    completeUpdate,
    dismissDownloadedPrompt,
  } = useInAppUpdate();

  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (state.status !== "completed") return;

    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      const timer = setTimeout(() => {
        void checkAndUpdate();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [state.status, checkAndUpdate]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && state.status === "completed") {
        void checkAndUpdate();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [state.status, checkAndUpdate]);

  return (
    <InAppUpdateBanner
      onDismiss={dismissDownloadedPrompt}
      onRestart={completeUpdate}
      visible={isDownloaded}
    />
  );
}

