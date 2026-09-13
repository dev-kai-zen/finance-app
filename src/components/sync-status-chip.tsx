import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { LAYOUT_DIMENSIONS } from "@/constants/layout";

export interface SyncStatusChipProps {
  onPress?: () => void;
  label?: string;
  isOnline?: boolean;
}

export function SyncStatusChip({
  onPress,
  label = "Synced",
  isOnline = true,
}: SyncStatusChipProps) {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.navigate("/settings" as any);
    }
  };

  return (
    <Pressable
      accessibilityLabel={`Sync status: ${label}. Tap to open settings.`}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.chip,
        pressed && styles.chipPressed,
      ]}
    >
      <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    chip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      height: LAYOUT_DIMENSIONS.syncChipHeight,
      paddingHorizontal: 10,
    },
    chipPressed: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.borderStrong,
    },
    statusDot: {
      borderRadius: 4,
      height: 7,
      width: 7,
    },
    dotOnline: {
      backgroundColor: theme.colors.success,
    },
    dotOffline: {
      backgroundColor: theme.colors.warning,
    },
    chipText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.2,
    },
  });
}
