import { Platform } from "react-native";
import * as Application from "expo-application";
import SpInAppUpdates, {
  IAUUpdateKind,
  IAUInstallStatus,
  type StatusUpdateEvent,
} from "sp-react-native-in-app-updates";

import type {
  AppUpdateCheckResult,
  AppUpdateDownloadProgress,
} from "../types/app-updates.types";

let inAppUpdatesInstance: SpInAppUpdates | null = null;

function getInAppUpdatesInstance(): SpInAppUpdates | null {
  if (Platform.OS !== "android") return null;

  if (!inAppUpdatesInstance) {
    try {
      inAppUpdatesInstance = new SpInAppUpdates(false);
    } catch (error) {
      if (__DEV__) {
        console.warn("[InAppUpdates] Failed to initialize in-app updates instance:", error);
      }
      return null;
    }
  }

  return inAppUpdatesInstance;
}

/**
 * Checks Google Play Store for an available update.
 * Gracefully handles non-Play Store and dev builds.
 */
export async function checkAppUpdate(): Promise<AppUpdateCheckResult> {
  if (Platform.OS !== "android") {
    return { shouldUpdate: false };
  }

  const instance = getInAppUpdatesInstance();
  if (!instance) {
    return { shouldUpdate: false };
  }

  try {
    const curVersion = Application.nativeApplicationVersion ?? undefined;
    const result = await instance.checkNeedsUpdate(
      curVersion ? { curVersion } : undefined
    );

    if (!result?.shouldUpdate) {
      return { shouldUpdate: false, storeVersion: result?.storeVersion };
    }

    const other = result.other as
      | {
          isImmediateUpdateAllowed?: boolean;
          isFlexibleUpdateAllowed?: boolean;
          updatePriority?: number;
        }
      | undefined;

    const isImmediate =
      Boolean(other?.isImmediateUpdateAllowed) &&
      (other?.updatePriority ?? 0) >= 4;

    const isFlexible = other?.isFlexibleUpdateAllowed !== false;

    return {
      shouldUpdate: true,
      storeVersion: result.storeVersion,
      isImmediate,
      isFlexible,
    };
  } catch (error) {
    if (__DEV__) {
      console.log("[InAppUpdates] In-app update check skipped or unavailable:", error);
    }
    return { shouldUpdate: false };
  }
}

/**
 * Starts the official Google Play in-app update flow (Flexible by default, or Immediate for high priority).
 */
export async function startAppUpdate(options?: {
  immediate?: boolean;
}): Promise<void> {
  if (Platform.OS !== "android") return;

  const instance = getInAppUpdatesInstance();
  if (!instance) return;

  try {
    const updateType = options?.immediate
      ? IAUUpdateKind.IMMEDIATE
      : IAUUpdateKind.FLEXIBLE;

    await instance.startUpdate({ updateType });
  } catch (error) {
    if (__DEV__) {
      console.log("[InAppUpdates] Failed to start in-app update:", error);
    }
  }
}

/**
 * Automatically checks for updates and immediately triggers the Google Play prompt if one is available.
 */
export async function checkAndPromptUpdate(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    const checkResult = await checkAppUpdate();
    if (!checkResult.shouldUpdate) return;

    await startAppUpdate({ immediate: checkResult.isImmediate });
  } catch (error) {
    if (__DEV__) {
      console.log("[InAppUpdates] Automatic prompt failed:", error);
    }
  }
}

/**
 * Completes a flexible update by restarting the application and applying the downloaded files.
 */
export function completeFlexibleUpdate(): void {
  if (Platform.OS !== "android") return;

  const instance = getInAppUpdatesInstance();
  if (!instance) return;

  try {
    instance.installUpdate();
  } catch (error) {
    console.error("[InAppUpdates] Failed to complete flexible update:", error);
  }
}

/**
 * Subscribes to Google Play download status changes.
 */
export function addUpdateStatusListener(
  onStatusChange: (status: IAUInstallStatus, progress?: AppUpdateDownloadProgress) => void
): () => void {
  if (Platform.OS !== "android") return () => {};

  const instance = getInAppUpdatesInstance();
  if (!instance) return () => {};

  const listener = (event: StatusUpdateEvent) => {
    const progress: AppUpdateDownloadProgress = {
      bytesDownloaded: Number(event.bytesDownloaded ?? 0),
      totalBytesToDownload: Number(event.totalBytesToDownload ?? 0),
    };
    onStatusChange(event.status, progress);
  };

  try {
    instance.addStatusUpdateListener(listener);
  } catch (error) {
    if (__DEV__) {
      console.log("[InAppUpdates] Unable to add status update listener:", error);
    }
    return () => {};
  }

  return () => {
    try {
      instance.removeStatusUpdateListener(listener);
    } catch {
      // noop
    }
  };
}

export { IAUInstallStatus, IAUUpdateKind };

