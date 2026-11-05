export { GesturesSettingsModal } from "./components/gestures-settings-modal";
export { QuickEntryProvider } from "./components/global-quick-entry-host";
export { useQuickEntry } from "./context/quick-entry-context";
export { useShakeGesture } from "./hooks/use-shake-gesture";
export type { ShakeAction, QuickEntryContextValue } from "./types/gestures.types";
export {
  DEFAULT_SHAKE_ACTION,
  SHAKE_FORCE_THRESHOLD,
  SHAKE_COOLDOWN_MS,
} from "./constants/gestures.constants";

