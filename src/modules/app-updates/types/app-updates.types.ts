export type AppUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "failed";

export interface AppUpdateCheckResult {
  shouldUpdate: boolean;
  storeVersion?: string;
  isImmediate?: boolean;
  isFlexible?: boolean;
}

export interface AppUpdateDownloadProgress {
  bytesDownloaded: number;
  totalBytesToDownload: number;
}

