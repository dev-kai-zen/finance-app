import type { ShakeAction } from "@/modules/settings";

export const DEFAULT_SHAKE_ACTION: ShakeAction = "disabled";

export const SHAKE_UPDATE_INTERVAL_MS = 50; // 20 updates per sec
export const SHAKE_FORCE_THRESHOLD = 1.75; // G's
export const SHAKE_DELTA_THRESHOLD = 1.1; // Delta acceleration
export const SHAKE_PEAK_WINDOW_MS = 500; // Multi-peak detection window
export const SHAKE_COOLDOWN_MS = 1500; // Cooldown lockout after trigger

