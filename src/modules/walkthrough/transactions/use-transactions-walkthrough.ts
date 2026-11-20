import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useExperiencePreferences } from "@/modules/settings";
import {
  getTransactionsWalkthroughSteps,
  type GetTransactionsWalkthroughStepsOptions,
} from "./transactions-walkthrough-steps";
import type {
  LayoutRect,
  WalkthroughStep,
  WalkthroughTargetId,
} from "../types/walkthrough.types";
import { useWalkthroughRegistry } from "../components/walkthrough-target";
import { isWalkthroughTargetVisible } from "../utils/walkthrough-viewport";

export interface UseTransactionsWalkthroughOptions
  extends GetTransactionsWalkthroughStepsOptions {
  onScrollToTarget?: (targetId: WalkthroughTargetId) => void;
}

export function useTransactionsWalkthrough(
  options: UseTransactionsWalkthroughOptions = {},
) {
  const { hasTransactionInList = false, onScrollToTarget } = options;
  const { isPromptDismissed, dismissPrompt } = useExperiencePreferences();
  const { measureTarget } = useWalkthroughRegistry();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const steps = useMemo(
    () => getTransactionsWalkthroughSteps({ hasTransactionInList }),
    [hasTransactionInList],
  );

  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeTargetLayout, setActiveTargetLayout] =
    useState<LayoutRect | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measurementGenerationRef = useRef(0);

  const safeStepIndex = Math.min(activeStepIndex, Math.max(0, steps.length - 1));
  const currentStep: WalkthroughStep | undefined = steps[safeStepIndex];

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

        // Fixed floating action button is always visible on-screen; apply immediately
        if (step.targetId === "txFab" && initialLayout) {
          setActiveTargetLayout(initialLayout);
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
    dismissPrompt("transactionsWalkthroughDismissed");
  }, [dismissPrompt]);

  const completeWalkthrough = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsWalkthroughActive(false);
    setActiveTargetLayout(null);
    dismissPrompt("transactionsWalkthroughDismissed");
  }, [dismissPrompt]);

  const nextStep = useCallback(() => {
    if (safeStepIndex >= steps.length - 1) {
      completeWalkthrough();
      return;
    }
    setActiveStepIndex(safeStepIndex + 1);
  }, [completeWalkthrough, safeStepIndex, steps.length]);

  const prevStep = useCallback(() => {
    if (safeStepIndex <= 0) return;
    setActiveStepIndex(safeStepIndex - 1);
  }, [safeStepIndex]);

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
    activeStepIndex: safeStepIndex,
    totalSteps: steps.length,
    currentStep,
    activeTargetLayout,
    isCompleted: isPromptDismissed("transactionsWalkthroughDismissed"),
    startWalkthrough,
    skipWalkthrough,
    completeWalkthrough,
    nextStep,
    prevStep,
  };
}
