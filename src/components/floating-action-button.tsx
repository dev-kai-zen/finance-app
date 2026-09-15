import React, { type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export interface FloatingActionButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  icon?: ReactNode;
  style?: ViewStyle;
}

export function FloatingActionButton({
  onPress,
  accessibilityLabel = "Quick action",
  icon,
  style,
}: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemeStyles(createStyles);

  const bottomPosition = Math.max(24, insets.bottom + 20);
  const rightPosition = Math.max(20, insets.right + 20);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        { bottom: bottomPosition, right: rightPosition },
        style,
      ]}
    >
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
      >
        {icon ?? (
          <View style={styles.plusIconContainer}>
            <View style={styles.plusVertical} />
            <View style={styles.plusHorizontal} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  const size = LAYOUT_DIMENSIONS.fabSize;

  return StyleSheet.create({
    container: {
      alignItems: "flex-end",
      position: "absolute",
      zIndex: 999,
      elevation: 10,
    },
    fab: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: size / 2,
      height: size,
      justifyContent: "center",
      width: size,
      ...theme.shadows.modal,
      elevation: 8,
    },
    fabPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.96 }],
    },
    plusIconContainer: {
      alignItems: "center",
      height: 24,
      justifyContent: "center",
      width: 24,
    },
    plusVertical: {
      backgroundColor: theme.colors.onPrimary,
      borderRadius: 1.5,
      height: 20,
      position: "absolute",
      width: 3,
    },
    plusHorizontal: {
      backgroundColor: theme.colors.onPrimary,
      borderRadius: 1.5,
      height: 3,
      position: "absolute",
      width: 20,
    },
  });
}
