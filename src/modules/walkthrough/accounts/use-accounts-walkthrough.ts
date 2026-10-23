import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useExperiencePreferences } from "@/modules/settings";
import { ACCOUNTS_WALKTHROUGH_STEPS } from "./accounts-walkthrough-steps";
import type {
  LayoutRect,
  WalkthroughStep,
  WalkthroughTargetId,
} from "../types/walkthrough.types";
import { useWalkthroughRegistry } from "../components/walkthrough-target";
import { isWalkthroughTargetVisible } from "../utils/walkthrough-viewport";

export function useAccountsWalkthrough({
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
    ACCOUNTS_WALKTHROUGH_STEPS[activeStepIndex];

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
    if (ACCOUNTS_WALKTHROUGH_STEPS[0]) {
      updateMeasurement(ACCOUNTS_WALKTHROUGH_STEPS[0]);
    }
  }, [updateMeasurement]);

  const skipWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("accountsWalkthroughDismissed");
  }, [dismissPrompt]);

  const completeWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("accountsWalkthroughDismissed");
  }, [dismissPrompt]);

  const nextStep = useCallback(() => {
    if (activeStepIndex >= ACCOUNTS_WALKTHROUGH_STEPS.length - 1) {
      completeWalkthrough();
      return;
    }
    const nextIdx = activeStepIndex + 1;
    setActiveStepIndex(nextIdx);
    const nextStepObj = ACCOUNTS_WALKTHROUGH_STEPS[nextIdx];
    if (nextStepObj) {
      updateMeasurement(nextStepObj);
    }
  }, [activeStepIndex, completeWalkthrough, updateMeasurement]);

  const prevStep = useCallback(() => {
    if (activeStepIndex <= 0) return;
    const prevIdx = activeStepIndex - 1;
    setActiveStepIndex(prevIdx);
    const prevStepObj = ACCOUNTS_WALKTHROUGH_STEPS[prevIdx];
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
    totalSteps: ACCOUNTS_WALKTHROUGH_STEPS.length,
    currentStep,
    activeTargetLayout,
    isCompleted: isPromptDismissed("accountsWalkthroughDismissed"),
    startWalkthrough,
    skipWalkthrough,
    completeWalkthrough,
    nextStep,
    prevStep,
  };
}
