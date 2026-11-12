import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { CheckCircle2, CircleX, Info, TriangleAlert } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export type ToastVariant = "success" | "error" | "warning" | "info";
export type ToastPosition = "top" | "bottom";

export interface AppToastProps {
  visible: boolean;
  message: string;
  description?: string;
  variant?: ToastVariant;
  position?: ToastPosition;
  duration?: number;
  onClose: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function AppToast({
  visible,
  message,
  description,
  variant = "success",
  position = "top",
  duration = 3000,
  onClose,
  icon,
  style,
}: AppToastProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [shouldRender, setShouldRender] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();

      if (duration > 0) {
        timeoutRef.current = setTimeout(() => {
          Animated.timing(anim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            setShouldRender(false);
            onClose();
          });
        }, duration);
      }
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, duration, onClose, anim]);

  if (!shouldRender) return null;

  const accentColor =
    variant === "success"
      ? theme.colors.success
      : variant === "error"
        ? theme.colors.danger
        : variant === "warning"
          ? theme.colors.warning
          : theme.colors.primary;

  const topOffset = Math.max(12, insets.top + 8);
  const bottomOffset = Math.max(16, insets.bottom + 12);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [position === "top" ? -24 : 24, 0],
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.overlay,
        position === "top" ? { top: topOffset } : { bottom: bottomOffset },
      ]}
    >
      <Animated.View
        style={[
          styles.toastContainer,
          {
            opacity: anim,
            transform: [{ translateY }],
          },
          style,
        ]}
      >
        <Pressable
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          onPress={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            Animated.timing(anim, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }).start(() => {
              setShouldRender(false);
              onClose();
            });
          }}
          style={styles.contentRow}
        >
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: `${accentColor}18` },
            ]}
          >
            {icon ? (
              icon
            ) : variant === "success" ? (
              <CheckCircle2 color={accentColor} size={18} />
            ) : variant === "error" ? (
              <CircleX color={accentColor} size={18} />
            ) : variant === "warning" ? (
              <TriangleAlert color={accentColor} size={18} />
            ) : (
              <Info color={accentColor} size={18} />
            )}
          </View>
          <View style={styles.textColumn}>
            <Text numberOfLines={2} style={styles.messageText}>
              {message}
            </Text>
            {description ? (
              <Text numberOfLines={2} style={styles.descriptionText}>
                {description}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      alignItems: "center",
      justifyContent: "center",
      left: 0,
      paddingHorizontal: 16,
      position: "absolute",
      right: 0,
      zIndex: 9999,
    },
    toastContainer: {
      backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      maxWidth: 440,
      width: "100%",
      ...theme.shadows.modal,
    },
    contentRow: {
      alignItems: "center",
      flexDirection: "row",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    iconWrapper: {
      alignItems: "center",
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    textColumn: {
      flex: 1,
      marginLeft: 12,
    },
    messageText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 18,
    },
    descriptionText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
    },
  });
}

