import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, DeviceEventEmitter } from "react-native";
import { useFocusEffect } from "expo-router";
import { subscribeToDatabaseReplacement } from "@/infrastructure/database";
import { useCurrencyPreferences } from "@/modules/currencies";
import { getCreditCardMonitoring } from "../services/get-credit-card-monitoring.service";
import type { CreditCardMonitoringSummary } from "../types/credit-card.types";
import { toCalendarDate } from "../utils/billing-dates";

export const CREDIT_CARD_MONITORING_LOAD_FAILED =
  "creditCardMonitoring.errors.loadFailed";

const EMPTY_SUMMARY: CreditCardMonitoringSummary = {
  cards: [],
  dueThisMonthMinorUnits: 0,
  overdueMinorUnits: 0,
  evaluatedCalendarDate: toCalendarDate(new Date()),
};

export function useCreditCardMonitoring() {
  const { preferences } = useCurrencyPreferences();
  const [data, setData] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const isFocusedRef = useRef(false);
  const frameIdRef = useRef<number | null>(null);
  const lastEvaluatedDateRef = useRef(toCalendarDate(new Date()));

  const cancelScheduledRefresh = useCallback(() => {
    if (frameIdRef.current !== null) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }
  }, []);

  const refresh = useCallback(() => {
    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }
    try {
      setData(getCreditCardMonitoring());
      lastEvaluatedDateRef.current = toCalendarDate(new Date());
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : CREDIT_CARD_MONITORING_LOAD_FAILED,
      );
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
    }
  }, [preferences.defaultCurrency]);

  const scheduleRefresh = useCallback(() => {
    cancelScheduledRefresh();
    frameIdRef.current = requestAnimationFrame(() => {
      frameIdRef.current = null;
      refresh();
    });
  }, [cancelScheduledRefresh, refresh]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      scheduleRefresh();

      const mutationSub = DeviceEventEmitter.addListener(
        "FINANCE_APP_TRANSACTION_MUTATED",
        () => {
          if (isFocusedRef.current) {
            scheduleRefresh();
          }
        },
      );

      const appStateSub = AppState.addEventListener("change", (state) => {
        if (state === "active" && isFocusedRef.current) {
          const todayOn = toCalendarDate(new Date());
          if (todayOn !== lastEvaluatedDateRef.current) {
            scheduleRefresh();
          }
        }
      });

      return () => {
        isFocusedRef.current = false;
        mutationSub.remove();
        appStateSub.remove();
        cancelScheduledRefresh();
      };
    }, [cancelScheduledRefresh, scheduleRefresh]),
  );

  useEffect(() => {
    return subscribeToDatabaseReplacement(() => {
      if (isFocusedRef.current) {
        scheduleRefresh();
      }
    });
  }, [scheduleRefresh]);

  return { ...data, loading, error, refresh };
}
