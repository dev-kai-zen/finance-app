import { useCallback, useState } from "react";
import {
  useExperiencePreferences,
  type PromptSettingKey,
} from "@/modules/settings";

export interface UseWalkthroughIntroOptions {
  promptKey: PromptSettingKey;
  onStart: () => void;
  prerequisitePromptKey?: PromptSettingKey;
  enabled?: boolean;
}

export function useWalkthroughIntro({
  promptKey,
  onStart,
  prerequisitePromptKey,
  enabled = true,
}: UseWalkthroughIntroOptions) {
  const { isPromptDismissed, dismissPrompt } = useExperiencePreferences();
  const [isIntroVisible, setIsIntroVisible] = useState(false);

  const isDismissed = isPromptDismissed(promptKey);
  const isPrerequisiteMet = prerequisitePromptKey
    ? isPromptDismissed(prerequisitePromptKey)
    : true;
  const canTrigger = !isDismissed && isPrerequisiteMet && enabled;

  const triggerIfFirstTime = useCallback(() => {
    if (!isPromptDismissed(promptKey) && isPrerequisiteMet && enabled) {
      setIsIntroVisible(true);
    }
  }, [isPromptDismissed, promptKey, isPrerequisiteMet, enabled]);

  const showIntro = useCallback(() => {
    setIsIntroVisible(true);
  }, []);

  const hideIntro = useCallback(() => {
    setIsIntroVisible(false);
  }, []);

  const handleStart = useCallback(() => {
    setIsIntroVisible(false);
    onStart();
  }, [onStart]);

  const handleSkip = useCallback(() => {
    setIsIntroVisible(false);
    dismissPrompt(promptKey);
  }, [dismissPrompt, promptKey]);

  return {
    isIntroVisible,
    isDismissed,
    isPrerequisiteMet,
    canTrigger,
    triggerIfFirstTime,
    showIntro,
    hideIntro,
    handleStart,
    handleSkip,
  };
}
