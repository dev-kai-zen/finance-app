export type QuickSyncNetworkPreference = "wifi_only" | "any";

export interface QuickSyncConfig {
  enabled: boolean;
  network: QuickSyncNetworkPreference;
  syncAttachments: boolean;
  lastSyncedAt: string | null;
  fileId: string | null;
  accountEmail?: string | null;
}

export type QuickSyncStatus =
  | "disabled"
  | "idle"
  | "syncing"
  | "synced"
  | "waiting_network"
  | "remote_ahead"
  | "error";

export interface QuickSyncRemoteConflict {
  fileId: string;
  remoteVersion: number | null;
  remoteModifiedTime: string;
  remoteDeviceId: string | null;
  remoteDeviceName: string | null;
  localLastSyncedAt: string | null;
  hasUnsyncedLocalChanges: boolean;
}

export interface QuickSyncDeviceMetadata {
  deviceId: string;
  customDeviceName: string | null;
  lastKnownRemoteSyncId: string | null;
  lastKnownRemoteHeadRevisionId: string | null;
  lastKnownRemoteVersion: number | null;
  lastKnownRemoteModifiedTime: string | null;
  lastKnownRemoteFileId: string | null;
  hasUnsyncedLocalChanges: boolean;
}

export interface QuickSyncState {
  enabled: boolean;
  syncAttachments: boolean;
  status: QuickSyncStatus;
  networkPreference: QuickSyncNetworkPreference;
  lastSyncedAt: string | null;
  fileId: string | null;
  accountEmail?: string | null;
  lastError: string | null;
  remoteConflict: QuickSyncRemoteConflict | null;
  conflictPromptVisible: boolean;
  hasUnsyncedLocalChanges: boolean;
  deviceLabel: string;
  customDeviceName: string | null;
  hardwareDeviceName: string;
}
