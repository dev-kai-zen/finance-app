import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { CalendarMonth } from "../types/calendar.types";
import { MONTH_NAMES, getTodayParts } from "../utils/calendar-dates";

export interface CalendarMonthHeaderProps {
  activeMonth: CalendarMonth;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export function CalendarMonthHeader({
  activeMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
}: CalendarMonthHeaderProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const todayParts = getTodayParts();

  const isCurrentMonthNow =
    activeMonth.year === todayParts.year &&
    activeMonth.month === todayParts.month;

  const monthLabel = `${MONTH_NAMES[activeMonth.month]} ${activeMonth.year}`;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.monthTitle}>{monthLabel}</Text>

        {!isCurrentMonthNow && (
          <Pressable
            accessibilityLabel="Jump to today"
            accessibilityRole="button"
            onPress={onToday}
            style={({ pressed }) => [
              styles.todayButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <RotateCcw color={theme.colors.primary} size={13} />
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.navControls}>
        <Pressable
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          onPress={onPrevMonth}
          style={({ pressed }) => [
            styles.navButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <ChevronLeft color={theme.colors.textPrimary} size={20} />
        </Pressable>

        <Pressable
          accessibilityLabel="Next month"
          accessibilityRole="button"
          onPress={onNextMonth}
          style={({ pressed }) => [
            styles.navButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <ChevronRight color={theme.colors.textPrimary} size={20} />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    monthTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
    },
    todayButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.small,
      backgroundColor: theme.colors.primary + "18",
    },
    todayButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    navControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    navButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.95 }],
    },
  });
}
