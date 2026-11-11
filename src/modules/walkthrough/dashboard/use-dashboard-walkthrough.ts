import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useExperiencePreferences,
  type DashboardLayoutPreferences,
} from "@/modules/settings";
import { getDashboardWalkthroughSteps } from "./dashboard-walkthrough-steps";
import type {
  LayoutRect,
  WalkthroughStep,
  WalkthroughTargetId,
} from "../types/walkthrough.types";
import { useWalkthroughRegistry } from "../components/walkthrough-target";
import { isWalkthroughTargetVisible } from "../utils/walkthrough-viewport";

export function useDashboardWalkthrough({
  layout,
  onScrollToTarget,
}: {
  layout?: DashboardLayoutPreferences;
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

  const steps = useMemo(() => {
    return getDashboardWalkthroughSteps(layout);
  }, [layout]);

  const currentStep: WalkthroughStep | undefined =
    steps[activeStepIndex] ?? steps[0];

  const updateMeasurement = useCallback(
    (step: WalkthroughStep) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (step.isSimulatedModal) {
        setActiveTargetLayout(null);
        return;
      }

      const generation = ++measurementGenerationRef.current;

      const applyLayout = async () => {
        const layoutResult = await measureTarget(step.targetId);
        if (generation !== measurementGenerationRef.current) {
          return;
        }
        setActiveTargetLayout(layoutResult);
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
    if (steps[0]) {
      updateMeasurement(steps[0]);
    }
  }, [steps, updateMeasurement]);

  const skipWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("dashboardWalkthroughDismissed");
  }, [dismissPrompt]);

  const completeWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("dashboardWalkthroughDismissed");
  }, [dismissPrompt]);

  const nextStep = useCallback(() => {
    if (activeStepIndex >= steps.length - 1) {
      completeWalkthrough();
      return;
    }
    const nextIdx = activeStepIndex + 1;
    setActiveStepIndex(nextIdx);
    const nextStepObj = steps[nextIdx];
    if (nextStepObj) {
      updateMeasurement(nextStepObj);
    }
  }, [activeStepIndex, completeWalkthrough, steps, updateMeasurement]);

  const prevStep = useCallback(() => {
    if (activeStepIndex <= 0) return;
    const prevIdx = activeStepIndex - 1;
    setActiveStepIndex(prevIdx);
    const prevStepObj = steps[prevIdx];
    if (prevStepObj) {
      updateMeasurement(prevStepObj);
    }
  }, [activeStepIndex, steps, updateMeasurement]);

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
    isCompleted: isPromptDismissed("dashboardWalkthroughDismissed"),
    startWalkthrough,
    skipWalkthrough,
    completeWalkthrough,
    nextStep,
    prevStep,
  };
}
