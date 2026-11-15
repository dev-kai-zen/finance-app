import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export function GoogleDriveSkeleton() {
  const styles = useThemeStyles(createStyles);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container} accessibilityLabel="Loading Google Drive">
      {/* 1. Main Google Drive Card Skeleton */}
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Animated.View
            style={[styles.skeletonCircle, { opacity: pulseAnim }]}
          />
          <View style={styles.copy}>
            <Animated.View
              style={[styles.skeletonTitle, { opacity: pulseAnim }]}
            />
            <Animated.View
              style={[styles.skeletonSubtitle, { opacity: pulseAnim }]}
            />
          </View>
          <Animated.View
            style={[styles.skeletonChip, { opacity: pulseAnim }]}
          />
        </View>

        <View style={styles.divider} />

        {/* Action Row 1: Create backup */}
        <View style={styles.actionRow}>
          <Animated.View
            style={[styles.skeletonActionIcon, { opacity: pulseAnim }]}
          />
          <View style={styles.copy}>
            <Animated.View
              style={[styles.skeletonActionTitle, { width: 130, opacity: pulseAnim }]}
            />
          </View>
          <Animated.View
            style={[styles.skeletonChevron, { opacity: pulseAnim }]}
          />
        </View>

        <View style={styles.insetDivider} />

        {/* Action Row 2: Restore from Google Drive */}
        <View style={styles.actionRow}>
          <Animated.View
            style={[styles.skeletonActionIcon, { opacity: pulseAnim }]}
          />
          <View style={styles.copy}>
            <Animated.View
              style={[styles.skeletonActionTitle, { width: 165, opacity: pulseAnim }]}
            />
          </View>
          <Animated.View
            style={[styles.skeletonChevron, { opacity: pulseAnim }]}
          />
        </View>

        <View style={styles.insetDivider} />

        {/* Action Row 3: Open in Google Drive */}
        <View style={styles.actionRow}>
          <Animated.View
            style={[styles.skeletonActionIcon, { opacity: pulseAnim }]}
          />
          <View style={styles.copy}>
            <Animated.View
              style={[styles.skeletonActionTitle, { width: 145, opacity: pulseAnim }]}
            />
          </View>
          <Animated.View
            style={[styles.skeletonChevron, { opacity: pulseAnim }]}
          />
        </View>
      </View>

      {/* 2. Scheduled Backup Card Skeleton */}
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Animated.View
            style={[styles.skeletonCircle, { opacity: pulseAnim }]}
          />
          <View style={styles.copy}>
            <Animated.View
              style={[styles.skeletonTitle, { width: 135, opacity: pulseAnim }]}
            />
            <Animated.View
              style={[styles.skeletonSubtitle, { width: 190, opacity: pulseAnim }]}
            />
          </View>
          <Animated.View
            style={[styles.skeletonSwitch, { opacity: pulseAnim }]}
          />
        </View>
      </View>

      {/* 3. Quick Sync Card Skeleton */}
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Animated.View
            style={[styles.skeletonCircle, { opacity: pulseAnim }]}
          />
          <View style={styles.copy}>
            <Animated.View
              style={[styles.skeletonTitle, { width: 110, opacity: pulseAnim }]}
            />
            <Animated.View
              style={[styles.skeletonSubtitle, { width: 175, opacity: pulseAnim }]}
            />
          </View>
          <Animated.View
            style={[styles.skeletonSwitch, { opacity: pulseAnim }]}
          />
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  const boneColor = theme.colors.surfaceMuted;
  return StyleSheet.create({
    container: {
      gap: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    statusRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 72,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    copy: {
      flex: 1,
      gap: 6,
    },
    skeletonCircle: {
      backgroundColor: boneColor,
      borderRadius: theme.borderRadius.round,
      height: 42,
      width: 42,
    },
    skeletonTitle: {
      backgroundColor: boneColor,
      borderRadius: 4,
      height: 14,
      width: 115,
    },
    skeletonSubtitle: {
      backgroundColor: boneColor,
      borderRadius: 4,
      height: 12,
      width: 160,
    },
    skeletonChip: {
      backgroundColor: boneColor,
      borderRadius: theme.borderRadius.round,
      height: 24,
      width: 68,
    },
    skeletonSwitch: {
      backgroundColor: boneColor,
      borderRadius: 14,
      height: 28,
      width: 48,
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
    },
    insetDivider: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginLeft: 54,
    },
    actionRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 52,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    skeletonActionIcon: {
      backgroundColor: boneColor,
      borderRadius: 4,
      height: 20,
      width: 20,
    },
    skeletonActionTitle: {
      backgroundColor: boneColor,
      borderRadius: 4,
      height: 14,
    },
    skeletonChevron: {
      backgroundColor: boneColor,
      borderRadius: 2,
      height: 14,
      width: 8,
    },
  });
}

