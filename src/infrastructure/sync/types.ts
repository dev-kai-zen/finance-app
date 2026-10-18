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
