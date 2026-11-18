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
  // On-demand walkthrough model: do not auto-trigger surprise popups on first visit
  const canTrigger = false;
  const isWaitingForIntro = false;
  const scrollEnabled = !isIntroVisible;

  const triggerIfFirstTime = useCallback(() => {
    // Intentionally no-op: tours are triggered on-demand via header Sparkles buttons
  }, []);

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
