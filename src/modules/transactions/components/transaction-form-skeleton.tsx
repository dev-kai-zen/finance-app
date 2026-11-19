import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export function TransactionFormSkeleton() {
  const styles = useThemeStyles(createStyles);
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
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
    <View accessibilityLabel="Loading form..." style={styles.container}>
      {/* Quick presets row */}
      <View style={styles.topRow}>
        <Animated.View style={[styles.presetChip, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.presetChipSmall, { opacity: pulseAnim }]} />
      </View>

      {/* Type picker segmented tabs */}
      <Animated.View style={[styles.typePicker, { opacity: pulseAnim }]} />

      {/* Name input field */}
      <Animated.View style={[styles.fieldRow, { opacity: pulseAnim }]} />

      {/* Date & Time row */}
      <View style={styles.dateTimeRow}>
        <Animated.View style={[styles.halfField, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.halfField, { opacity: pulseAnim }]} />
      </View>

      {/* Big Amount Card */}
      <Animated.View style={[styles.amountCard, { opacity: pulseAnim }]} />

      {/* Account & Category picker rows */}
      <Animated.View style={[styles.fieldRow, { opacity: pulseAnim }]} />
      <Animated.View style={[styles.fieldRow, { opacity: pulseAnim }]} />

      {/* Action buttons row */}
      <View style={styles.actionsRow}>
        <Animated.View style={[styles.cancelBtn, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.saveBtn, { opacity: pulseAnim }]} />
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 12,
      gap: 14,
    },
    topRow: {
      flexDirection: "row",
      gap: 10,
    },
    presetChip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      height: 32,
      width: 120,
    },
    presetChipSmall: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      height: 32,
      width: 90,
    },
    typePicker: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      height: 44,
      width: "100%",
    },
    fieldRow: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      height: 48,
      width: "100%",
    },
    dateTimeRow: {
      flexDirection: "row",
      gap: 12,
    },
    halfField: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      flex: 1,
      height: 44,
    },
    amountCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      height: 72,
      width: "100%",
    },
    actionsRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: "auto",
      paddingBottom: 8,
      paddingTop: 16,
    },
    cancelBtn: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      flex: 1,
      height: 48,
    },
    saveBtn: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      flex: 2,
      height: 48,
    },
  });
}
