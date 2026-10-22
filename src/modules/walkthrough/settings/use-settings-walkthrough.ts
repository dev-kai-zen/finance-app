import { useCallback, useEffect, useRef, useState } from "react";
import { useExperiencePreferences } from "@/modules/settings";
import { SETTINGS_WALKTHROUGH_STEPS } from "./settings-walkthrough-steps";
import type { LayoutRect, WalkthroughStep, WalkthroughTargetId } from "../types/walkthrough.types";
import { useWalkthroughRegistry } from "../components/walkthrough-target";

export function useSettingsWalkthrough({
  onScrollToTarget,
}: {
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
} = {}) {
  const { isPromptDismissed, dismissPrompt } = useExperiencePreferences();
  const { measureTarget } = useWalkthroughRegistry();

  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeTargetLayout, setActiveTargetLayout] =
    useState<LayoutRect | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep: WalkthroughStep | undefined =
    SETTINGS_WALKTHROUGH_STEPS[activeStepIndex];

  const updateMeasurement = useCallback(
    (step: WalkthroughStep) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // 1. Scroll to bring element into viewing area
      onScrollToTarget?.(step.targetId);

      // 2. Wait 350ms for native animated scroll to completely stop before measuring
      timerRef.current = setTimeout(async () => {
        const layout = await measureTarget(step.targetId);
        setActiveTargetLayout(layout);
      }, 350);
    },
    [measureTarget, onScrollToTarget],
  );

  const startWalkthrough = useCallback(() => {
    setActiveStepIndex(0);
    setIsWalkthroughActive(true);
    if (SETTINGS_WALKTHROUGH_STEPS[0]) {
      updateMeasurement(SETTINGS_WALKTHROUGH_STEPS[0]);
    }
  }, [updateMeasurement]);

  const skipWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("settingsWalkthroughDismissed");
  }, [dismissPrompt]);

  const completeWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("settingsWalkthroughDismissed");
  }, [dismissPrompt]);

  const nextStep = useCallback(() => {
    if (activeStepIndex >= SETTINGS_WALKTHROUGH_STEPS.length - 1) {
      completeWalkthrough();
      return;
    }
    const nextIdx = activeStepIndex + 1;
    setActiveStepIndex(nextIdx);
    const nextStepObj = SETTINGS_WALKTHROUGH_STEPS[nextIdx];
    if (nextStepObj) {
      updateMeasurement(nextStepObj);
    }
  }, [activeStepIndex, completeWalkthrough, updateMeasurement]);

  const prevStep = useCallback(() => {
    if (activeStepIndex <= 0) return;
    const prevIdx = activeStepIndex - 1;
    setActiveStepIndex(prevIdx);
    const prevStepObj = SETTINGS_WALKTHROUGH_STEPS[prevIdx];
    if (prevStepObj) {
      updateMeasurement(prevStepObj);
    }
  }, [activeStepIndex, updateMeasurement]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    isWalkthroughActive,
    activeStepIndex,
    totalSteps: SETTINGS_WALKTHROUGH_STEPS.length,
    currentStep,
    activeTargetLayout,
    isCompleted: isPromptDismissed("settingsWalkthroughDismissed"),
    startWalkthrough,
    skipWalkthrough,
    completeWalkthrough,
    nextStep,
    prevStep,
  };
}
