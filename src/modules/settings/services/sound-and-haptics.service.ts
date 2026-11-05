import type { DbContext } from "@/infrastructure/database/client";
import { SOUND_AND_HAPTICS_SETTING_KEY } from "../constants/settings.constants";
import { getSettingByKey } from "../repositories/settings.repository";
import { persistSettingsEntries } from "./persist-settings.service";

export interface SoundSubToggles {
  transactions: boolean;
  calculator: boolean;
  alerts: boolean;
  destructive: boolean;
}

export interface SoundAndHapticsPreferences {
  hapticsEnabled: boolean;
  subToggles: {
    transactions: boolean;
    calculator: boolean;
    alerts: boolean;
    destructive: boolean;
  };
  soundEnabled: boolean;
  soundOnSaveEnabled: boolean;
  soundSubToggles: SoundSubToggles;
}

export const DEFAULT_SOUND_AND_HAPTICS_PREFERENCES: SoundAndHapticsPreferences = {
  hapticsEnabled: false,
  subToggles: {
    transactions: true,
    calculator: true,
    alerts: true,
    destructive: true,
  },
  soundEnabled: false,
  soundOnSaveEnabled: false,
  soundSubToggles: {
    transactions: true,
    calculator: true,
    alerts: true,
    destructive: true,
  },
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
    const isSoundEnabled = Boolean(parsed.soundEnabled ?? parsed.soundOnSaveEnabled);
    const result: SoundAndHapticsPreferences = {
      hapticsEnabled: Boolean(parsed.hapticsEnabled),
      subToggles: {
        transactions: parsed.subToggles?.transactions ?? true,
        calculator: parsed.subToggles?.calculator ?? true,
        alerts: parsed.subToggles?.alerts ?? true,
        destructive: parsed.subToggles?.destructive ?? true,
      },
      soundEnabled: isSoundEnabled,
      soundOnSaveEnabled: isSoundEnabled,
      soundSubToggles: {
        transactions: parsed.soundSubToggles?.transactions ?? true,
        calculator: parsed.soundSubToggles?.calculator ?? true,
        alerts: parsed.soundSubToggles?.alerts ?? true,
        destructive: parsed.soundSubToggles?.destructive ?? true,
      },
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
  const isSoundEnabled = Boolean(preferences.soundEnabled ?? preferences.soundOnSaveEnabled);
  const normalized: SoundAndHapticsPreferences = {
    ...preferences,
    soundEnabled: isSoundEnabled,
    soundOnSaveEnabled: isSoundEnabled,
    soundSubToggles: {
      transactions: preferences.soundSubToggles?.transactions ?? true,
      calculator: preferences.soundSubToggles?.calculator ?? true,
      alerts: preferences.soundSubToggles?.alerts ?? true,
      destructive: preferences.soundSubToggles?.destructive ?? true,
    },
  };
  cachedPreferences = { ...normalized };
  persistSettingsEntries(
    { [SOUND_AND_HAPTICS_SETTING_KEY]: JSON.stringify(normalized) },
    context,
    now,
  );
  notifyListeners(normalized);
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
  } catch (error) {
    console.warn("[HapticsService] Haptic feedback execution failed:", error);
  }
}

let audioPlayerInstance: any = null;

export async function triggerSound(
  category: HapticCategory = "transactions",
): Promise<void> {
  try {
    const prefs = getSoundAndHapticsPreferences();
    if (!prefs.soundEnabled && !prefs.soundOnSaveEnabled) return;
    if (!prefs.soundSubToggles[category]) return;

    const { Platform } = require("react-native");
    if (Platform.OS === "web") return;

    const { createAudioPlayer, setAudioModeAsync } = await import("expo-audio");
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
    } catch {
      // Ignore audio mode configuration error
    }

    if (!audioPlayerInstance) {
      audioPlayerInstance = createAudioPlayer(
        require("../../../../assets/sounds/chime.wav"),
      );
    }
    audioPlayerInstance.seekTo(0);
    audioPlayerInstance.play();
  } catch (error) {
    console.warn("[SoundService] Sound playback failed:", error);
  }
}

export async function playTransactionSavedSound(): Promise<void> {
  return triggerSound("transactions");
}

export function testHapticFeedback(): boolean {
  try {
    const Haptics = require("expo-haptics");
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return true;
  } catch (error) {
    console.warn("[HapticsService] Test haptic failed:", error);
    return false;
  }
}

export async function testSoundPlayback(): Promise<boolean> {
  try {
    const { Platform } = require("react-native");
    if (Platform.OS === "web") return false;

    const { createAudioPlayer, setAudioModeAsync } = await import("expo-audio");
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
    } catch {
      // Ignore audio mode configuration error
    }

    if (!audioPlayerInstance) {
      audioPlayerInstance = createAudioPlayer(
        require("../../../../assets/sounds/chime.wav"),
      );
    }
    audioPlayerInstance.seekTo(0);
    audioPlayerInstance.play();
    return true;
  } catch (error) {
    console.warn("[SoundService] Test sound failed:", error);
    return false;
  }
}


