import type {
  GoogleDriveBackupCatalog,
  GoogleDriveBackupFile,
} from "@/infrastructure/sync";

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
  variant: "success" | "error";
  message: string;
}
