import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useExperiencePreferences } from "@/modules/settings";
import {
  getAccountGroupSetupWalkthroughSteps,
  type GetAccountGroupSetupWalkthroughStepsOptions,
} from "./account-group-setup-walkthrough-steps";
import type {
  LayoutRect,
  WalkthroughStep,
  WalkthroughTargetId,
} from "../types/walkthrough.types";
import { useWalkthroughRegistry } from "../components/walkthrough-target";
import { isWalkthroughTargetVisible } from "../utils/walkthrough-viewport";

export interface UseAccountGroupSetupWalkthroughOptions
  extends GetAccountGroupSetupWalkthroughStepsOptions {
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
}

export function useAccountGroupSetupWalkthrough({
  onScrollToTarget,
  showReorder,
}: UseAccountGroupSetupWalkthroughOptions) {
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

  const steps = useMemo(
    () => getAccountGroupSetupWalkthroughSteps({ showReorder }),
    [showReorder],
  );

  const currentStep: WalkthroughStep | undefined = steps[activeStepIndex];

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
    dismissPrompt("accountGroupSetupWalkthroughDismissed");
  }, [dismissPrompt]);

  const completeWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("accountGroupSetupWalkthroughDismissed");
  }, [dismissPrompt]);

  const nextStep = useCallback(() => {
    if (activeStepIndex >= steps.length - 1) {
      completeWalkthrough();
      return;
    }
    setActiveStepIndex(activeStepIndex + 1);
  }, [activeStepIndex, completeWalkthrough, steps.length]);

  const prevStep = useCallback(() => {
    if (activeStepIndex <= 0) return;
    setActiveStepIndex(activeStepIndex - 1);
  }, [activeStepIndex]);

  useEffect(() => {
    if (activeStepIndex <= steps.length - 1) {
      return;
    }
    setActiveStepIndex(Math.max(0, steps.length - 1));
  }, [activeStepIndex, steps.length]);

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
    totalSteps: steps.length,
    currentStep,
    activeTargetLayout,
    isCompleted: isPromptDismissed("accountGroupSetupWalkthroughDismissed"),
    startWalkthrough,
    skipWalkthrough,
    completeWalkthrough,
    nextStep,
    prevStep,
  };
}
