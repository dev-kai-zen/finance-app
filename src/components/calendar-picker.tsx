import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export interface CalendarPickerProps {
  value: Date;
  onChange: (value: Date) => void;
  style?: StyleProp<ViewStyle>;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarPicker({ value, onChange, style }: CalendarPickerProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [activeYear, setActiveYear] = useState<number>(() => value.getFullYear());
  const [activeMonth, setActiveMonth] = useState<number>(() => value.getMonth());

  useEffect(() => {
    setActiveYear(value.getFullYear());
    setActiveMonth(value.getMonth());
  }, [value]);

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(activeYear, activeMonth, 1).getDay();

  const isCurrentMonthNow = activeYear === todayYear && activeMonth === todayMonth;

  const isValueInActiveMonth =
    value.getFullYear() === activeYear && value.getMonth() === activeMonth;

  const selectedDay = isValueInActiveMonth ? value.getDate() : null;

  const isTodayActive =
    value.getFullYear() === todayYear &&
    value.getMonth() === todayMonth &&
    value.getDate() === todayDay &&
    isCurrentMonthNow;

  const isStartOfMonthActive = isValueInActiveMonth && selectedDay === 1;
  const isEndOfMonthActive = isValueInActiveMonth && selectedDay === daysInMonth;

  const handlePrevMonth = () => {
    if (activeMonth === 0) {
      setActiveMonth(11);
      setActiveYear((y) => y - 1);
    } else {
      setActiveMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonth === 11) {
      setActiveMonth(0);
      setActiveYear((y) => y + 1);
    } else {
      setActiveMonth((m) => m + 1);
    }
  };

  const createDateWithDay = (year: number, month: number, day: number): Date => {
    const next = new Date(value);
    next.setFullYear(year, month, day);
    return next;
  };

  const handleSelectDay = (day: number) => {
    const next = createDateWithDay(activeYear, activeMonth, day);
    onChange(next);
  };

  const handleSelectToday = () => {
    setActiveYear(todayYear);
    setActiveMonth(todayMonth);
    const next = createDateWithDay(todayYear, todayMonth, todayDay);
    onChange(next);
  };

  const handleSelectStartOfMonth = () => {
    const next = createDateWithDay(activeYear, activeMonth, 1);
    onChange(next);
  };

  const handleSelectEndOfMonth = () => {
    const next = createDateWithDay(activeYear, activeMonth, daysInMonth);
    onChange(next);
  };

  // Generate grid calendar cells
  const calendarCells: ({ day: number; currentMonth: boolean } | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ day: d, currentMonth: true });
  }

  return (
    <View style={[styles.container, style]}>
      {/* Month & Navigation Bar */}
      <View style={styles.navRow}>
        <Pressable
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={handlePrevMonth}
          style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
        >
          <View pointerEvents="none">
            <ChevronLeft color={theme.colors.textPrimary} size={20} />
          </View>
        </Pressable>

        <View style={styles.monthYearContainer}>
          <Text style={styles.monthYearText}>
            {MONTH_NAMES[activeMonth]} {activeYear}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Next month"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={handleNextMonth}
          style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
        >
          <View pointerEvents="none">
            <ChevronRight color={theme.colors.textPrimary} size={20} />
          </View>
        </Pressable>
      </View>

      {/* Quick Shortcuts Bar: Today, 1st of Month, End of Month */}
      <View style={styles.quickBar}>
        <Pressable
          accessibilityLabel="Select today"
          accessibilityRole="button"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={handleSelectToday}
          style={({ pressed }) => [
            styles.chip,
            isTodayActive && styles.chipActive,
            pressed && styles.chipPressed,
          ]}
        >
          <View pointerEvents="none" style={styles.chipIconWrap}>
            <RotateCcw
              color={isTodayActive ? "#FFFFFF" : theme.colors.primary}
              size={12}
            />
          </View>
          <Text
            style={[
              styles.chipText,
              isTodayActive && styles.chipTextActive,
            ]}
          >
            Today
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Select first day of month"
          accessibilityRole="button"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={handleSelectStartOfMonth}
          style={({ pressed }) => [
            styles.chip,
            isStartOfMonthActive && styles.chipActive,
            pressed && styles.chipPressed,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              isStartOfMonthActive && styles.chipTextActive,
            ]}
          >
            1st of Month
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Select end of month"
          accessibilityRole="button"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={handleSelectEndOfMonth}
          style={({ pressed }) => [
            styles.chip,
            isEndOfMonthActive && styles.chipActive,
            pressed && styles.chipPressed,
          ]}
        >
          <Text
            style={[
              styles.chipText,
              isEndOfMonthActive && styles.chipTextActive,
            ]}
          >
            End of Month
          </Text>
        </Pressable>
      </View>

      {/* Weekday Header Row */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {calendarCells.map((cell, idx) => {
          if (!cell) {
            return <View key={`empty-${idx}`} style={styles.dayCell} />;
          }

          const isSelected = selectedDay === cell.day;
          const isTodayCell = isCurrentMonthNow && todayDay === cell.day;

          return (
            <Pressable
              key={`day-${cell.day}`}
              accessibilityLabel={`Select ${MONTH_NAMES[activeMonth]} ${cell.day}`}
              accessibilityRole="button"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              onPress={() => handleSelectDay(cell.day)}
              style={({ pressed }) => [
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isTodayCell && !isSelected && styles.dayCellToday,
                pressed && !isSelected && styles.dayCellPressed,
              ]}
            >
              <Text
                style={[
                  styles.dayCellText,
                  isSelected && styles.dayCellTextSelected,
                  isTodayCell && !isSelected && styles.dayCellTextToday,
                ]}
              >
                {cell.day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      width: "100%",
      paddingVertical: theme.spacing.xs,
    },
    navRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
      paddingHorizontal: theme.spacing.xs,
    },
    navBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 18,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36,
      // @ts-ignore
      cursor: "pointer",
    },
    navBtnPressed: {
      backgroundColor: theme.colors.border,
      opacity: 0.75,
    },
    monthYearContainer: {
      alignItems: "center",
    },
    monthYearText: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    quickBar: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
      paddingHorizontal: theme.spacing.xs,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 5,
      // @ts-ignore
      cursor: "pointer",
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    chipPressed: {
      opacity: 0.75,
    },
    chipIconWrap: {
      alignItems: "center",
      justifyContent: "center",
    },
    chipText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    chipTextActive: {
      color: "#FFFFFF",
      fontWeight: "700",
    },
    weekdayRow: {
      flexDirection: "row",
      marginBottom: 6,
    },
    weekdayCell: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
    },
    weekdayText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    daysGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    dayCell: {
      alignItems: "center",
      borderRadius: 20,
      height: 40,
      justifyContent: "center",
      marginVertical: 2,
      width: "14.28%",
      // @ts-ignore
      cursor: "pointer",
    },
    dayCellPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    dayCellSelected: {
      backgroundColor: theme.colors.primary,
      ...theme.shadows.card,
    },
    dayCellToday: {
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
    },
    dayCellText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "500",
      fontVariant: ["tabular-nums"],
    },
    dayCellTextSelected: {
      color: theme.colors.onPrimary,
      fontWeight: "700",
    },
    dayCellTextToday: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
  });
}
