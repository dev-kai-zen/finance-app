import React, { forwardRef, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type SwitchProps,
  type View,
} from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "@/hooks/use-app-theme";

export type ThemedSwitchProps = Omit<SwitchProps, "onValueChange"> & {
  /** When true, shows a small spinner on the thumb. */
  pending?: boolean;
  onValueChange?: (val: boolean) => void | Promise<void>;
};

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 24;
const PADDING = 2;
const MAX_TRANSLATE_X = TRACK_WIDTH - THUMB_SIZE - PADDING * 2; // 20

export const ThemedSwitch = forwardRef<View, ThemedSwitchProps>(
  function ThemedSwitch(
    {
      accessibilityLabel,
      disabled,
      onValueChange,
      style,
      testID,
      thumbColor,
      trackColor,
      value,
      pending = false,
    },
    ref,
  ) {
    const theme = useAppTheme();
    const [localChecked, setLocalChecked] = useState(Boolean(value));
    const [isToggling, setIsToggling] = useState(false);

    useEffect(() => {
      setLocalChecked(Boolean(value));
    }, [value]);

    const offTrackColor = String(trackColor?.false ?? theme.colors.borderStrong);
    const onTrackColor = String(
      trackColor?.true ?? theme.colors.primary,
    );

    const resolvedThumbColor =
      thumbColor ??
      (disabled
        ? theme.mode === "dark"
          ? theme.colors.textMuted
          : theme.colors.surfaceElevated
        : "#FFFFFF");

    const progress = useSharedValue(Boolean(value) ? 1 : 0);

    useEffect(() => {
      progress.value = withTiming(localChecked ? 1 : 0, {
        duration: 180,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
      });
    }, [localChecked, progress]);

    const showSpinner = pending || isToggling;

    const resolvedSpinnerColor =
      localChecked
        ? theme.colors.primary
        : theme.colors.textSecondary;

    const animatedTrackStyle = useAnimatedStyle(() => {
      const backgroundColor = interpolateColor(
        progress.value,
        [0, 1],
        [offTrackColor, onTrackColor],
      );
      return { backgroundColor };
    });

    const animatedThumbStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: progress.value * MAX_TRANSLATE_X }],
      };
    });

    const handlePress = () => {
      if (disabled || isToggling) return;
      const nextChecked = !localChecked;
      setLocalChecked(nextChecked);
      setIsToggling(true);

      const result = onValueChange?.(nextChecked);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        (result as Promise<unknown>)
          .catch((err) => {
            console.error("[ThemedSwitch] onValueChange error:", err);
            setLocalChecked(!nextChecked);
          })
          .finally(() => {
            setIsToggling(false);
          });
      } else {
        setTimeout(() => {
          setIsToggling(false);
        }, 220);
      }
    };

    return (
      <Pressable
        ref={ref}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="switch"
        accessibilityState={{ checked: localChecked, disabled: Boolean(disabled) }}
        accessible={true}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={handlePress}
        style={[styles.container, disabled && styles.disabled, style]}
        testID={testID}
      >
        <Animated.View style={[styles.track, animatedTrackStyle]}>
          <Animated.View
            style={[
              styles.thumb,
              { backgroundColor: resolvedThumbColor },
              animatedThumbStyle,
            ]}
          >
            {showSpinner ? (
              <ActivityIndicator
                color={resolvedSpinnerColor}
                size="small"
                style={styles.thumbSpinner}
              />
            ) : null}
          </Animated.View>
        </Animated.View>
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  disabled: {
    opacity: 0.65,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: PADDING,
    justifyContent: "center",
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbSpinner: {
    transform: [{ scale: 0.62 }],
  },
});
