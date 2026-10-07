export interface BackupNotice {
  variant: "success" | "warning" | "error";
  message: string;
}

export type LocalBackupKind = "manual" | "automatic" | "safety";

export interface LocalBackupFile {
  id: string;
  uri: string;
  name: string;
  createdAt: Date;
  size: number;
  kind: LocalBackupKind;
  passwordProtected: boolean | null;
  valid: boolean;
}

export type AutomaticBackupFrequency = "daily" | "weekly";

export interface AutomaticBackupConfig {
  enabled: boolean;
  frequency: AutomaticBackupFrequency;
}

export type LocalBackupOperation =
  | "idle"
  | "loading"
  | "creating"
  | "importing"
  | "exporting"
  | "restoring"
  | "deleting"
  | "configuring";

export interface LocalRestoreCandidate {
  name: string;
  uri: string;
  createdAt: Date;
  passwordProtected: boolean;
}
