import type { DbContext } from "@/infrastructure/database/client";
import { SOUND_AND_HAPTICS_SETTING_KEY } from "../constants/settings.constants";
import { getSettingByKey } from "../repositories/settings.repository";
import { persistSettingsEntries } from "./persist-settings.service";

export interface SoundAndHapticsPreferences {
  hapticsEnabled: boolean;
  subToggles: {
    transactions: boolean;
    calculator: boolean;
    alerts: boolean;
    destructive: boolean;
  };
  soundOnSaveEnabled: boolean;
}

export const DEFAULT_SOUND_AND_HAPTICS_PREFERENCES: SoundAndHapticsPreferences = {
  hapticsEnabled: false,
  subToggles: {
    transactions: true,
    calculator: true,
    alerts: true,
    destructive: true,
  },
  soundOnSaveEnabled: false,
};

type SoundAndHapticsListener = (prefs: SoundAndHapticsPreferences) => void;
const listeners = new Set<SoundAndHapticsListener>();

let cachedPreferences: SoundAndHapticsPreferences | null = null;

export function subscribeToSoundAndHapticsPreferences(
  listener: SoundAndHapticsListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(prefs: SoundAndHapticsPreferences): void {
  listeners.forEach((listener) => {
    try {
      listener(prefs);
    } catch {
      // Ignore listener error
    }
  });
}

export function getSoundAndHapticsPreferences(
  context?: DbContext,
): SoundAndHapticsPreferences {
  if (cachedPreferences !== null && !context) {
    return cachedPreferences;
  }
  const raw = getSettingByKey(SOUND_AND_HAPTICS_SETTING_KEY, context);
  if (!raw) {
    if (!context) cachedPreferences = { ...DEFAULT_SOUND_AND_HAPTICS_PREFERENCES };
    return DEFAULT_SOUND_AND_HAPTICS_PREFERENCES;
  }
  try {
    const parsed = JSON.parse(raw);
    const result: SoundAndHapticsPreferences = {
      hapticsEnabled: Boolean(parsed.hapticsEnabled),
      subToggles: {
        transactions: parsed.subToggles?.transactions ?? true,
        calculator: parsed.subToggles?.calculator ?? true,
        alerts: parsed.subToggles?.alerts ?? true,
        destructive: parsed.subToggles?.destructive ?? true,
      },
      soundOnSaveEnabled: Boolean(parsed.soundOnSaveEnabled),
    };
    if (!context) cachedPreferences = result;
    return result;
  } catch {
    return DEFAULT_SOUND_AND_HAPTICS_PREFERENCES;
  }
}

export function setSoundAndHapticsPreferences(
  preferences: SoundAndHapticsPreferences,
  context?: DbContext,
  now = new Date(),
): void {
  cachedPreferences = { ...preferences };
  persistSettingsEntries(
    { [SOUND_AND_HAPTICS_SETTING_KEY]: JSON.stringify(preferences) },
    context,
    now,
  );
  notifyListeners(preferences);
}

export type HapticCategory =
  | "transactions"
  | "calculator"
  | "alerts"
  | "destructive";

export type HapticType =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

export function triggerHaptic(
  type: HapticType = "light",
  category: HapticCategory = "transactions",
): void {
  try {
    const prefs = getSoundAndHapticsPreferences();
    if (!prefs.hapticsEnabled) return;
    if (!prefs.subToggles[category]) return;

    // Dynamically require expo-haptics
    const Haptics = require("expo-haptics");
    switch (type) {
      case "light":
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        void Haptics.selectionAsync();
        break;
    }
  } catch {
    // Graceful fallback if haptics fail or device does not support it
  }
}

let audioPlayerInstance: any = null;

export async function playTransactionSavedSound(): Promise<void> {
  try {
    const prefs = getSoundAndHapticsPreferences();
    if (!prefs.soundOnSaveEnabled) return;

    const { Platform } = require("react-native");
    if (Platform.OS === "web") return;

    const { createAudioPlayer } = await import("expo-audio");
    if (!audioPlayerInstance) {
      audioPlayerInstance = createAudioPlayer(
        require("../../../../assets/sounds/chime.wav"),
      );
    }
    audioPlayerInstance.seekTo(0);
    audioPlayerInstance.play();
  } catch {
    // Graceful fallback if audio is unsupported or fails to load
  }
}


