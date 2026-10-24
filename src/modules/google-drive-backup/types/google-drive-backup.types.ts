import type {
  GoogleDriveBackupCatalog,
  GoogleDriveBackupFile,
} from "@/infrastructure/sync";
import type { BackupScheduleFields } from "@/utils/backup-schedule";

export interface GoogleDriveUser {
  id: string;
  email: string | null;
  name: string | null;
}

export type BackupFile = GoogleDriveBackupFile;
export type BackupCatalog = GoogleDriveBackupCatalog;

export type BackupOperation =
  | "idle"
  | "connecting"
  | "loading"
  | "creating"
  | "restoring"
  | "disconnecting";

export interface BackupNotice {
  variant: "success" | "warning" | "error";
  message: string;
}

export type QuickSyncNetworkPreference = "wifi_only" | "any";

export interface QuickSyncConfig {
  enabled: boolean;
  network: QuickSyncNetworkPreference;
  lastSyncedAt: string | null;
  fileId: string | null;
}

export type QuickSyncStatus =
  | "disabled"
  | "idle"
  | "syncing"
  | "synced"
  | "waiting_network"
  | "error";

export interface QuickSyncState {
  enabled: boolean;
  status: QuickSyncStatus;
  networkPreference: QuickSyncNetworkPreference;
  lastSyncedAt: string | null;
  fileId: string | null;
  lastError: string | null;
}

export interface GoogleDriveScheduledBackupConfig extends BackupScheduleFields {
  enabled: boolean;
}

export type GoogleDriveScheduledBackupOperation = "idle" | "configuring";
