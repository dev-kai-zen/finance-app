import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import { Accelerometer } from "expo-sensors";
import * as Haptics from "expo-haptics";
import {
  SHAKE_COOLDOWN_MS,
  SHAKE_DELTA_THRESHOLD,
  SHAKE_FORCE_THRESHOLD,
  SHAKE_PEAK_WINDOW_MS,
  SHAKE_UPDATE_INTERVAL_MS,
} from "../constants/gestures.constants";

export interface UseShakeGestureOptions {
  enabled: boolean;
  onShake: () => void;
}

export function useShakeGesture({ enabled, onShake }: UseShakeGestureOptions) {
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  const lastCoordsRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const lastPeakTimeRef = useRef<number>(0);
  const peakCountRef = useRef<number>(0);
  const lastTriggerTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") {
      return;
    }

    let isMounted = true;
    let subscription: { remove: () => void } | null = null;

    const startListening = async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!available || !isMounted || AppState.currentState !== "active") {
          return;
        }

        subscription?.remove();
        subscription = null;
        Accelerometer.setUpdateInterval(SHAKE_UPDATE_INTERVAL_MS);

        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const now = Date.now();
          const last = lastCoordsRef.current;
          lastCoordsRef.current = { x, y, z };

          if (!last) {
            return;
          }

          // Calculate acceleration magnitude in G's
          const gForce = Math.sqrt(x * x + y * y + z * z);
          const deltaX = Math.abs(x - last.x);
          const deltaY = Math.abs(y - last.y);
          const deltaZ = Math.abs(z - last.z);
          const delta = deltaX + deltaY + deltaZ;

          // Check if sudden movement exceeds force & delta thresholds
          if (gForce > SHAKE_FORCE_THRESHOLD && delta > SHAKE_DELTA_THRESHOLD) {
            if (now - lastPeakTimeRef.current < SHAKE_PEAK_WINDOW_MS) {
              peakCountRef.current += 1;

              // Two consecutive directional reversals/peaks indicate an intentional shake
              if (
                peakCountRef.current >= 2 &&
                now - lastTriggerTimeRef.current > SHAKE_COOLDOWN_MS
              ) {
                lastTriggerTimeRef.current = now;
                peakCountRef.current = 0;

                try {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {
                  // Ignore haptic errors if device does not support it
                }

                onShakeRef.current();
              }
            } else {
              peakCountRef.current = 1;
              lastPeakTimeRef.current = now;
            }
          }
        });
      } catch {
        // Fallback gracefully if sensor fails to initialize
      }
    };

    const stopListening = () => {
      subscription?.remove();
      subscription = null;
    };

    void startListening();

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        void startListening();
      } else {
        stopListening();
      }
    };

    const appStateSub = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      isMounted = false;
      stopListening();
      appStateSub.remove();
    };
  }, [enabled]);
}
