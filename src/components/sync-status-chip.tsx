import React, { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { LAYOUT_DIMENSIONS } from "@/constants/layout";
import { useLocalization } from "@/infrastructure/localization";
import { useQuickSyncStatus } from "@/infrastructure/sync";

export interface SyncStatusChipProps {
  onPress?: () => void;
  label?: string;
  isOnline?: boolean;
}

export function SyncStatusChip({
  onPress,
  label,
  isOnline,
}: SyncStatusChipProps) {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const quickSync = useQuickSyncStatus();

  const isQuickSyncActive = quickSync.enabled;
  const isSyncing = isQuickSyncActive && quickSync.status === "syncing";
  const isSynced =
    isQuickSyncActive &&
    (quickSync.status === "synced" || quickSync.status === "idle");
  const isWaitingNetwork =
    isQuickSyncActive && quickSync.status === "waiting_network";
  const isError = isQuickSyncActive && quickSync.status === "error";

  // Reanimated pulse animation for the syncing status dot
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isSyncing) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 500 }),
          withTiming(0.7, { duration: 500 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isSyncing, pulseScale]);

  const animatedDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: isSyncing ? Math.max(0.6, pulseScale.value) : 1,
  }));

  // Determine display label
  let displayLabel: string;
  if (label !== undefined) {
    displayLabel = label;
  } else if (!isQuickSyncActive) {
    displayLabel = t("sync.localOnly");
  } else if (isSyncing) {
    displayLabel = t("sync.syncing");
  } else if (isSynced) {
    displayLabel = t("sync.synced");
  } else if (isWaitingNetwork) {
    displayLabel = t("sync.waitingNetwork");
  } else if (isError) {
    displayLabel = t("sync.failed");
  } else {
    displayLabel = t("sync.localOnly");
  }

  // Determine dot color style
  let dotColorStyle = styles.dotOffline;
  if (isOnline !== undefined) {
    dotColorStyle = isOnline ? styles.dotOnline : styles.dotOffline;
  } else if (!isQuickSyncActive) {
    dotColorStyle = styles.dotOffline;
  } else if (isSyncing) {
    dotColorStyle = styles.dotSyncing;
  } else if (isSynced) {
    dotColorStyle = styles.dotOnline;
  } else if (isWaitingNetwork) {
    dotColorStyle = styles.dotWaiting;
  } else if (isError) {
    dotColorStyle = styles.dotError;
  }

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.navigate("/google-drive-backup" as any);
    }
  };

  return (
    <Pressable
      accessibilityLabel={t("sync.accessibility", { label: displayLabel })}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.chip,
        pressed && styles.chipPressed,
      ]}
    >
      <Animated.View
        style={[styles.statusDot, dotColorStyle, animatedDotStyle]}
      />
      <Animated.Text
        key={displayLabel}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.chipText}
      >
        {displayLabel}
      </Animated.Text>
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
    dotSyncing: {
      backgroundColor: theme.colors.primary,
    },
    dotWaiting: {
      backgroundColor: theme.colors.warning,
    },
    dotOffline: {
      backgroundColor: theme.colors.textMuted,
    },
    dotError: {
      backgroundColor: theme.colors.danger,
    },
    chipText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.2,
    },
  });
}
