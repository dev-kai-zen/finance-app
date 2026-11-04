import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SOUND_AND_HAPTICS_PREFERENCES,
  getSoundAndHapticsPreferences,
  setSoundAndHapticsPreferences,
  subscribeToSoundAndHapticsPreferences,
  type SoundAndHapticsPreferences,
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

  const setSoundOnSaveEnabled = useCallback((enabled: boolean) => {
    const current = getSoundAndHapticsPreferences();
    setSoundAndHapticsPreferences({ ...current, soundOnSaveEnabled: enabled });
  }, []);

  return {
    preferences,
    setHapticsEnabled,
    setSubToggle,
    setSoundOnSaveEnabled,
    updatePreferences,
  };
}

