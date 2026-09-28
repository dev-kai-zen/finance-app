import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export type AppButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive";
export type AppButtonSize = "small" | "medium" | "large";

export interface AppButtonProps
  extends Omit<PressableProps, "children" | "style"> {
  label: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function AppButton({
  label,
  variant = "primary",
  size = "medium",
  loading = false,
  leading,
  disabled,
  style,
  textStyle,
  ...props
}: AppButtonProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const isDisabled = disabled || loading;
  const indicatorColor =
    variant === "primary"
      ? theme.colors.onPrimary
      : variant === "destructive"
        ? theme.colors.onDanger
        : variant === "secondary"
          ? theme.colors.onControlSecondary
          : theme.colors.primary;

  return (
    <Pressable
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{
        ...props.accessibilityState,
        busy: loading,
        disabled: isDisabled,
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : (
        <>
          {leading}
          <Text style={[styles.label, styles[`${variant}Label`], textStyle]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    base: {
      alignItems: "center",
      borderCurve: "continuous",
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "center",
      minHeight: LAYOUT_DIMENSIONS.minTouchTarget,
    },
    small: {
      minHeight: LAYOUT_DIMENSIONS.minTouchTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    medium: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    large: {
      minHeight: 52,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
    },
    primary: {
      backgroundColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.controlSecondary,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    ghost: {
      backgroundColor: "transparent",
    },
    destructive: {
      backgroundColor: theme.colors.danger,
    },
    pressed: {
      opacity: 0.76,
      transform: [{ scale: 0.98 }],
    },
    disabled: {
      opacity: 0.42,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
    },
    primaryLabel: {
      color: theme.colors.onPrimary,
    },
    secondaryLabel: {
      color: theme.colors.onControlSecondary,
    },
    ghostLabel: {
      color: theme.colors.primary,
    },
    destructiveLabel: {
      color: theme.colors.onDanger,
    },
  });
}
