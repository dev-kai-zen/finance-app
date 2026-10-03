import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { CalendarDayCellData, CalendarTab } from "../types/calendar.types";
import { WEEKDAY_SHORT_NAMES } from "../utils/calendar-dates";

export interface CalendarGridProps {
  cells: CalendarDayCellData[];
  selectedDay: string | null;
  activeTab: CalendarTab;
  onToggleDay: (dateKey: string) => void;
}

export function CalendarGrid({
  cells,
  selectedDay,
  activeTab,
  onToggleDay,
}: CalendarGridProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <View style={styles.card}>
      {/* Weekday Header Row */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_SHORT_NAMES.map((name, index) => {
          const isWeekend = index === 0 || index === 6;
          return (
            <View key={name} style={styles.weekdayCell}>
              <Text
                style={[
                  styles.weekdayText,
                  isWeekend && styles.weekendText,
                ]}
              >
                {name}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {cells.map((cell) => {
          const isSelected = cell.dateKey === selectedDay;

          return (
            <Pressable
              key={cell.dateKey}
              accessibilityLabel={`Day ${cell.dayNumber}, ${cell.dateKey}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onToggleDay(cell.dateKey)}
              style={({ pressed }) => [
                styles.dayCell,
                pressed && styles.cellPressed,
              ]}
            >
              <View
                style={[
                  styles.dayBadge,
                  cell.isToday && !isSelected && styles.todayBadge,
                  isSelected && styles.selectedBadge,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !cell.isCurrentMonth && styles.otherMonthText,
                    cell.isToday && !isSelected && styles.todayText,
                    isSelected && styles.selectedDayText,
                  ]}
                >
                  {cell.dayNumber}
                </Text>
              </View>

              {/* Activity Indicators (Dots) */}
              <View style={styles.dotContainer}>
                {renderDots(cell, activeTab, isSelected, theme, styles)}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function renderDots(
  cell: CalendarDayCellData,
  activeTab: CalendarTab,
  isSelected: boolean,
  theme: AppTheme,
  styles: ReturnType<typeof createStyles>,
) {
  if (activeTab === "transactions") {
    if (cell.transactionCount === 0) return null;
    return (
      <View style={styles.dotRow}>
        {cell.hasIncome && (
          <View
            style={[
              styles.dot,
              { backgroundColor: isSelected ? "#fff" : theme.colors.success },
            ]}
          />
        )}
        {cell.hasExpense && (
          <View
            style={[
              styles.dot,
              {
                backgroundColor: isSelected
                  ? "rgba(255,255,255,0.7)"
                  : theme.colors.danger,
              },
            ]}
          />
        )}
      </View>
    );
  }

  if (activeTab === "schedules") {
    if (cell.scheduleCount === 0) return null;
    const dotColor = cell.hasDueSchedule
      ? theme.colors.warning ?? "#f59e0b"
      : theme.colors.primary;
    return (
      <View style={styles.dotRow}>
        <View
          style={[
            styles.dot,
            styles.scheduleDot,
            { backgroundColor: isSelected ? "#fff" : dotColor },
          ]}
        />
      </View>
    );
  }

  // Net tab:
  if (cell.transactionCount === 0) return null;
  const isSurplus = cell.netMinorUnits > 0;
  const isDeficit = cell.netMinorUnits < 0;
  const dotColor = isSurplus
    ? theme.colors.success
    : isDeficit
      ? theme.colors.danger
      : theme.colors.textMuted;

  return (
    <View style={styles.dotRow}>
      <View
        style={[
          styles.dot,
          { backgroundColor: isSelected ? "#fff" : dotColor },
        ]}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    weekdayRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingBottom: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    weekdayCell: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
    },
    weekdayText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    weekendText: {
      color: theme.colors.textMuted,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    dayCell: {
      width: "14.28%", // 7 columns
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 2,
    },
    cellPressed: {
      opacity: 0.7,
    },
    dayBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    todayBadge: {
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
    },
    selectedBadge: {
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    dayText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.textPrimary,
    },
    otherMonthText: {
      color: theme.colors.textMuted,
      opacity: 0.45,
    },
    todayText: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    selectedDayText: {
      color: "#ffffff",
      fontWeight: "700",
    },
    dotContainer: {
      height: 6,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    dotRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    scheduleDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
  });
}
