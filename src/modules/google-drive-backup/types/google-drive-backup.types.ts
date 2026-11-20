import type {
  GoogleDriveBackupCatalog,
  GoogleDriveBackupFile,
  QuickSyncConfig,
  QuickSyncNetworkPreference,
  QuickSyncRemoteConflict,
  QuickSyncState,
  QuickSyncStatus,
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

export type {
  QuickSyncConfig,
  QuickSyncNetworkPreference,
  QuickSyncRemoteConflict,
  QuickSyncState,
  QuickSyncStatus,
};

export interface GoogleDriveScheduledBackupConfig extends BackupScheduleFields {
  enabled: boolean;
}

export type GoogleDriveScheduledBackupOperation = "idle" | "configuring";
