import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SOUND_AND_HAPTICS_PREFERENCES,
  getSoundAndHapticsPreferences,
  setSoundAndHapticsPreferences,
  subscribeToSoundAndHapticsPreferences,
  testHapticFeedback,
  testSoundPlayback,
  type HapticCategory,
  type SoundAndHapticsPreferences,
  type SoundSubToggles,
} from "../services/sound-and-haptics.service";

export function useSoundAndHaptics() {
  const [preferences, setPreferencesState] = useState<SoundAndHapticsPreferences>(
    () => getSoundAndHapticsPreferences(),
  );

  useEffect(() => {
    return subscribeToSoundAndHapticsPreferences((next) => {
      setPreferencesState(next);
    });
  }, []);

  const updatePreferences = useCallback(
    (updater: (prev: SoundAndHapticsPreferences) => SoundAndHapticsPreferences) => {
      const next = updater(getSoundAndHapticsPreferences());
      setSoundAndHapticsPreferences(next);
    },
    [],
  );

  const setHapticsEnabled = useCallback((enabled: boolean) => {
    const current = getSoundAndHapticsPreferences();
    setSoundAndHapticsPreferences({ ...current, hapticsEnabled: enabled });
  }, []);

  const setSubToggle = useCallback(
    (key: keyof SoundAndHapticsPreferences["subToggles"], value: boolean) => {
      const current = getSoundAndHapticsPreferences();
      setSoundAndHapticsPreferences({
        ...current,
        subToggles: {
          ...current.subToggles,
          [key]: value,
        },
      });
    },
    [],
  );

  const setSoundEnabled = useCallback((enabled: boolean) => {
    const current = getSoundAndHapticsPreferences();
    setSoundAndHapticsPreferences({
      ...current,
      soundEnabled: enabled,
      soundOnSaveEnabled: enabled,
    });
  }, []);

  const setSoundOnSaveEnabled = setSoundEnabled;

  const setSoundSubToggle = useCallback(
    (key: keyof SoundSubToggles, value: boolean) => {
      const current = getSoundAndHapticsPreferences();
      setSoundAndHapticsPreferences({
        ...current,
        soundSubToggles: {
          ...current.soundSubToggles,
          [key]: value,
        },
      });
    },
    [],
  );

  return {
    preferences,
    setHapticsEnabled,
    setSubToggle,
    setHapticSubToggle: setSubToggle,
    setSoundEnabled,
    setSoundOnSaveEnabled,
    setSoundSubToggle,
    testHapticFeedback,
    testSoundPlayback,
    updatePreferences,
  };
}

