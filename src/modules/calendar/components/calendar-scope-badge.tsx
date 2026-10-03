import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar as CalendarIcon, X } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { CalendarMonth, CalendarTab } from "../types/calendar.types";
import { MONTH_NAMES, formatFriendlyDate } from "../utils/calendar-dates";

export interface CalendarScopeBadgeProps {
  selectedDay: string | null;
  activeMonth: CalendarMonth;
  activeTab: CalendarTab;
  itemCount: number;
  onClearDay: () => void;
}

export function CalendarScopeBadge({
  selectedDay,
  activeMonth,
  activeTab,
  itemCount,
  onClearDay,
}: CalendarScopeBadgeProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const noun =
    activeTab === "transactions"
      ? itemCount === 1
        ? "transaction"
        : "transactions"
      : activeTab === "schedules"
        ? itemCount === 1
          ? "schedule"
          : "schedules"
        : "records";

  if (selectedDay) {
    const formatted = formatFriendlyDate(selectedDay);

    return (
      <View style={styles.containerSelected}>
        <View style={styles.left}>
          <View style={styles.iconCircle}>
            <CalendarIcon color={theme.colors.primary} size={14} />
          </View>
          <View>
            <Text style={styles.title}>{formatted}</Text>
            <Text style={styles.subtitle}>
              {itemCount} {noun} on this day
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel="View entire month"
          accessibilityRole="button"
          onPress={onClearDay}
          style={({ pressed }) => [
            styles.clearButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.clearButtonText}>View Month</Text>
          <X color={theme.colors.primary} size={14} />
        </Pressable>
      </View>
    );
  }

  const monthLabel = `${MONTH_NAMES[activeMonth.month]} ${activeMonth.year}`;

  return (
    <View style={styles.containerAll}>
      <View style={styles.left}>
        <View style={styles.iconCircleMuted}>
          <CalendarIcon color={theme.colors.textSecondary} size={14} />
        </View>
        <View>
          <Text style={styles.titleMuted}>{monthLabel} (Whole Month)</Text>
          <Text style={styles.subtitle}>
            {itemCount} {noun} · Tap a day to inspect
          </Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    containerSelected: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.primary + "12",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.primary + "30",
    },
    containerAll: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
    },
    iconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
    },
    iconCircleMuted: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    titleMuted: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    clearButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: theme.borderRadius.small,
      backgroundColor: theme.colors.primary + "20",
    },
    clearButtonText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    buttonPressed: {
      opacity: 0.7,
    },
  });
}
