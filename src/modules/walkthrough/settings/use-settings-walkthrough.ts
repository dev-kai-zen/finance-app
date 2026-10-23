import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useExperiencePreferences } from "@/modules/settings";
import { SETTINGS_WALKTHROUGH_STEPS } from "./settings-walkthrough-steps";
import type {
  LayoutRect,
  WalkthroughStep,
  WalkthroughTargetId,
} from "../types/walkthrough.types";
import { useWalkthroughRegistry } from "../components/walkthrough-target";
import { isWalkthroughTargetVisible } from "../utils/walkthrough-viewport";

export function useSettingsWalkthrough({
  onScrollToTarget,
}: {
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
} = {}) {
  const { isPromptDismissed, dismissPrompt } = useExperiencePreferences();
  const { measureTarget } = useWalkthroughRegistry();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeTargetLayout, setActiveTargetLayout] =
    useState<LayoutRect | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measurementGenerationRef = useRef(0);

  const currentStep: WalkthroughStep | undefined =
    SETTINGS_WALKTHROUGH_STEPS[activeStepIndex];

  const updateMeasurement = useCallback(
    (step: WalkthroughStep) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const generation = ++measurementGenerationRef.current;

      const applyLayout = async () => {
        const layout = await measureTarget(step.targetId);
        if (generation !== measurementGenerationRef.current) {
          return;
        }
        setActiveTargetLayout(layout);
      };

      void (async () => {
        const initialLayout = await measureTarget(step.targetId);
        if (generation !== measurementGenerationRef.current) {
          return;
        }
        if (
          initialLayout &&
          isWalkthroughTargetVisible(initialLayout, windowHeight, insets)
        ) {
          setActiveTargetLayout(initialLayout);
          return;
        }

        onScrollToTarget?.(step.targetId);

        timerRef.current = setTimeout(() => {
          void applyLayout();
        }, 350);
      })();
    },
    [insets, measureTarget, onScrollToTarget, windowHeight],
  );

  const startWalkthrough = useCallback(() => {
    setActiveStepIndex(0);
    setIsWalkthroughActive(true);
  }, []);

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
    setActiveStepIndex(activeStepIndex + 1);
  }, [activeStepIndex, completeWalkthrough]);

  const prevStep = useCallback(() => {
    if (activeStepIndex <= 0) return;
    setActiveStepIndex(activeStepIndex - 1);
  }, [activeStepIndex]);

  useEffect(() => {
    if (!isWalkthroughActive || !currentStep) {
      return;
    }
    updateMeasurement(currentStep);
  }, [currentStep, isWalkthroughActive, updateMeasurement]);

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
