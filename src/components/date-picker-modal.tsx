import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";

export interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (isoDateString: string) => void;
  selectedDate?: string; // YYYY-MM-DD
  title?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseYearMonthDay(dateStr?: string): { year: number; month: number; day: number } {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

export function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
  title = "Select Date",
}: DatePickerModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const styles = useThemeStyles(createStyles);

  const initial = useMemo(() => parseYearMonthDay(selectedDate), [selectedDate]);
  const [activeYear, setActiveYear] = useState<number>(initial.year);
  const [activeMonth, setActiveMonth] = useState<number>(initial.month);
  const [pickedDate, setPickedDate] = useState<string>(selectedDate || getTodayString());

  const todayStr = useMemo(() => getTodayString(), []);

  useEffect(() => {
    if (visible) {
      const parts = parseYearMonthDay(selectedDate);
      setActiveYear(parts.year);
      setActiveMonth(parts.month);
      setPickedDate(selectedDate || getTodayString());
    }
  }, [visible, selectedDate]);

  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(activeYear, activeMonth, 1).getDay();

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

  const handleSelectDay = (day: number) => {
    const mStr = String(activeMonth + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const formatted = `${activeYear}-${mStr}-${dStr}`;
    setPickedDate(formatted);
    onSelectDate(formatted);
    onClose();
  };

  const handleSelectToday = () => {
    const today = new Date();
    setActiveYear(today.getFullYear());
    setActiveMonth(today.getMonth());
    setPickedDate(todayStr);
    onSelectDate(todayStr);
    onClose();
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
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Dismiss date picker modal"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheetContainer,
            isDesktop && styles.sheetContainerDesktop,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable
              accessibilityLabel="Close date picker"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Month & Navigation Bar */}
          <View style={styles.navRow}>
            <Pressable
              accessibilityLabel="Previous month"
              accessibilityRole="button"
              onPress={handlePrevMonth}
              style={styles.navBtn}
            >
              <Text style={styles.navArrow}>‹</Text>
            </Pressable>

            <View style={styles.monthYearContainer}>
              <Text style={styles.monthYearText}>
                {MONTH_NAMES[activeMonth]} {activeYear}
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Next month"
              accessibilityRole="button"
              onPress={handleNextMonth}
              style={styles.navBtn}
            >
              <Text style={styles.navArrow}>›</Text>
            </Pressable>
          </View>

          {/* Quick "Today" Action */}
          <View style={styles.quickBar}>
            <Pressable
              accessibilityLabel="Select today"
              accessibilityRole="button"
              onPress={handleSelectToday}
              style={styles.todayChip}
            >
              <Text style={styles.todayChipText}>Today</Text>
            </Pressable>
          </View>

          {/* Weekday Row */}
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

              const mStr = String(activeMonth + 1).padStart(2, "0");
              const dStr = String(cell.day).padStart(2, "0");
              const cellDate = `${activeYear}-${mStr}-${dStr}`;
              const isSelected = cellDate === pickedDate;
              const isToday = cellDate === todayStr;

              return (
                <Pressable
                  key={`day-${cell.day}`}
                  accessibilityLabel={`Select ${MONTH_NAMES[activeMonth]} ${cell.day}`}
                  accessibilityRole="button"
                  onPress={() => handleSelectDay(cell.day)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayCellText,
                      isSelected && styles.dayCellTextSelected,
                      isToday && !isSelected && styles.dayCellTextToday,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
      width: "100%",
      ...theme.shadows.modal,
    },
    sheetContainerDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 380,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    modalTitle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    closeBtn: {
      alignItems: "center",
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    closeBtnText: {
      color: theme.colors.textMuted,
      fontSize: 16,
      fontWeight: "bold",
    },
    navRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    navBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 10,
      borderWidth: 1,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    navArrow: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: "bold",
      lineHeight: 24,
    },
    monthYearContainer: {
      alignItems: "center",
    },
    monthYearText: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    quickBar: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 14,
    },
    todayChip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    todayChipText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "600",
    },
    weekdayRow: {
      flexDirection: "row",
      marginBottom: 8,
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
    },
    dayCellSelected: {
      backgroundColor: theme.colors.primary,
      ...theme.shadows.card,
    },
    dayCellToday: {
      borderColor: theme.colors.primary,
      borderWidth: 1,
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
