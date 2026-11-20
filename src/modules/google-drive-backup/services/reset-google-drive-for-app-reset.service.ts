import {
  clearQuickSyncRemoteConflict,
  clearQuickSyncRemoteTracking,
  resetQuickSyncLocalMetadata,
  setQuickSyncRuntimeStatus,
} from "@/infrastructure/sync";
import {
  disconnectGoogleDrive,
  getGoogleDriveConfigurationError,
} from "./google-drive-auth.service";

export async function resetGoogleDriveConnectionForAppReset(): Promise<void> {
  resetQuickSyncLocalMetadata();
  clearQuickSyncRemoteTracking();
  clearQuickSyncRemoteConflict();
  if (getGoogleDriveConfigurationError()) {
    setQuickSyncRuntimeStatus("disabled");
    return;
  }

  try {
    await disconnectGoogleDrive();
  } catch {
    // Ignore when no Google session exists or native sign-out is unavailable.
  }

  setQuickSyncRuntimeStatus("disabled");
}
