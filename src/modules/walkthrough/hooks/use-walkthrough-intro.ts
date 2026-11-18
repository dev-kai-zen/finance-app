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
  autoTrigger?: boolean;
}

export function useWalkthroughIntro({
  promptKey,
  onStart,
  prerequisitePromptKey,
  enabled = true,
  autoTrigger = false,
}: UseWalkthroughIntroOptions) {
  const { isPromptDismissed, dismissPrompt } = useExperiencePreferences();
  const [isIntroVisible, setIsIntroVisible] = useState(false);

  const isDismissed = isPromptDismissed(promptKey);
  const isPrerequisiteMet = prerequisitePromptKey
    ? isPromptDismissed(prerequisitePromptKey)
    : true;
  const canTrigger = autoTrigger && !isDismissed && isPrerequisiteMet && enabled;
  const isWaitingForIntro = canTrigger && !isIntroVisible;
  const scrollEnabled = !isWaitingForIntro && !isIntroVisible;

  const triggerIfFirstTime = useCallback(() => {
    if (autoTrigger && !isPromptDismissed(promptKey) && isPrerequisiteMet && enabled) {
      setIsIntroVisible(true);
    }
  }, [autoTrigger, isPromptDismissed, promptKey, isPrerequisiteMet, enabled]);

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
    isWaitingForIntro,
    scrollEnabled,
    triggerIfFirstTime,
    showIntro,
    hideIntro,
    handleStart,
    handleSkip,
  };
}
