import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Calendar,
  Check,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react-native";
import { DatePickerModal } from "@/components/date-picker-modal";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type {
  IncomeExpenseDateRange,
  IncomeExpenseMode,
  IncomeExpensePeriodPreset,
} from "../../types/income-expense.types";
import { formatShortDate, parseDateKeyToDate } from "../../utils/reports-dates";

interface IncomeExpenseFilterBarProps {
  mode: IncomeExpenseMode;
  onSelectMode: (mode: IncomeExpenseMode) => void;
  preset: IncomeExpensePeriodPreset;
  onSelectPreset: (preset: IncomeExpensePeriodPreset) => void;
  range: IncomeExpenseDateRange;
  customDateA: string;
  customDateB: string;
  onChangeCustomDateA: (dateKey: string) => void;
  onChangeCustomDateB: (dateKey: string) => void;
}

const PERIOD_OPTIONS: Array<{ key: IncomeExpensePeriodPreset; label: string; desc: string }> = [
  { key: "this-month", label: "This Month", desc: "Current calendar month to date" },
  { key: "last-month", label: "Last Month", desc: "Full previous calendar month" },
  { key: "this-quarter", label: "This Quarter", desc: "Current 3-month quarter" },
  { key: "this-year", label: "This Year", desc: "Full current calendar year" },
  { key: "custom", label: "Custom Date Range", desc: "Pick start and end dates" },
];

export function IncomeExpenseFilterBar({
  mode,
  onSelectMode,
  preset,
  onSelectPreset,
  range,
  customDateA,
  customDateB,
  onChangeCustomDateA,
  onChangeCustomDateB,
}: IncomeExpenseFilterBarProps) {
  const styles = useThemeStyles(createStyles);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<"A" | "B" | null>(null);

  const activePeriodConfig = PERIOD_OPTIONS.find((p) => p.key === preset);

  return (
    <View style={styles.container}>
      {/* Top Segmented Mode Toggle: Expenses vs Income */}
      <View style={styles.modeToggleRow}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "expense" }}
          onPress={() => onSelectMode("expense")}
          style={[
            styles.modeButton,
            mode === "expense" && styles.activeExpenseButton,
          ]}
        >
          <TrendingDown
            size={16}
            color={mode === "expense" ? "#FFFFFF" : styles.modeIcon.color}
          />
          <Text
            style={[
              styles.modeButtonText,
              mode === "expense" && styles.activeModeButtonText,
            ]}
          >
            Expenses
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "income" }}
          onPress={() => onSelectMode("income")}
          style={[
            styles.modeButton,
            mode === "income" && styles.activeIncomeButton,
          ]}
        >
          <TrendingUp
            size={16}
            color={mode === "income" ? "#FFFFFF" : styles.modeIcon.color}
          />
          <Text
            style={[
              styles.modeButtonText,
              mode === "income" && styles.activeModeButtonText,
            ]}
          >
            Income
          </Text>
        </Pressable>
      </View>

      {/* Period Selector Bar */}
      <View style={styles.periodRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Period: ${range.label}. Tap to change period.`}
          onPress={() => setPeriodModalVisible(true)}
          style={({ pressed }) => [
            styles.periodPill,
            pressed && styles.pressedPill,
          ]}
        >
          <Calendar size={14} color={styles.accentIcon.color} />
          <Text numberOfLines={1} style={styles.periodText}>
            {range.label}
          </Text>
          <ChevronDown size={14} color={styles.accentIcon.color} />
        </Pressable>
      </View>

      {/* Period Picker Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={periodModalVisible}
        onRequestClose={() => setPeriodModalVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setPeriodModalVisible(false)}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Period</Text>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                onPress={() => setPeriodModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color={styles.closeIcon.color} />
              </Pressable>
            </View>

            <View style={styles.optionList}>
              {PERIOD_OPTIONS.map((opt) => {
                const isSelected = opt.key === preset;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => onSelectPreset(opt.key)}
                    style={[
                      styles.optionItem,
                      isSelected && styles.selectedOptionItem,
                    ]}
                  >
                    <View style={styles.radio}>
                      {isSelected ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : null}
                    </View>
                    <View style={styles.optionTextWrap}>
                      <Text
                        style={[
                          styles.optionTitle,
                          isSelected && styles.selectedOptionTitle,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom Dates Controls */}
            {preset === "custom" ? (
              <View style={styles.customBox}>
                <Text style={styles.customBoxLabel}>Custom Date Range:</Text>
                <View style={styles.customRow}>
                  <Pressable
                    style={styles.dateChip}
                    onPress={() => setDatePickerTarget("A")}
                  >
                    <Calendar size={13} color={styles.accentIcon.color} />
                    <Text style={styles.dateChipText}>
                      From: {formatShortDate(parseDateKeyToDate(customDateA))}
                    </Text>
                  </Pressable>
                  <Text style={styles.vsText}>to</Text>
                  <Pressable
                    style={styles.dateChip}
                    onPress={() => setDatePickerTarget("B")}
                  >
                    <Calendar size={13} color={styles.accentIcon.color} />
                    <Text style={styles.dateChipText}>
                      To: {formatShortDate(parseDateKeyToDate(customDateB))}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Pressable
              style={styles.applyButton}
              onPress={() => setPeriodModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply Period</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Custom Date Pickers */}
      <DatePickerModal
        visible={datePickerTarget === "A"}
        onClose={() => setDatePickerTarget(null)}
        selectedDate={customDateA}
        title="Select Start Date"
        onSelectDate={(date) => {
          onChangeCustomDateA(date);
          setDatePickerTarget(null);
        }}
      />
      <DatePickerModal
        visible={datePickerTarget === "B"}
        onClose={() => setDatePickerTarget(null)}
        selectedDate={customDateB}
        title="Select End Date"
        onSelectDate={(date) => {
          onChangeCustomDateB(date);
          setDatePickerTarget(null);
        }}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    modeToggleRow: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 10,
      padding: 4,
      marginBottom: 10,
      gap: 4,
    },
    modeButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      borderRadius: 8,
    },
    activeExpenseButton: {
      backgroundColor: theme.colors.danger,
    },
    activeIncomeButton: {
      backgroundColor: theme.colors.success,
    },
    modeIcon: {
      color: theme.colors.textSecondary,
    },
    modeButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    activeModeButtonText: {
      color: "#FFFFFF",
      fontWeight: "700",
    },
    periodRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    periodPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: `${theme.colors.primary}0D`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}50`,
    },
    pressedPill: {
      opacity: 0.8,
    },
    periodText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    accentIcon: {
      color: theme.colors.primary,
    },
    // Modal
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    sheet: {
      width: "100%",
      maxWidth: 440,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    closeIcon: {
      color: theme.colors.textMuted,
    },
    optionList: {
      gap: 8,
      marginBottom: 16,
    },
    optionItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: 12,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: "transparent",
    },
    selectedOptionItem: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}12`,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 2,
      backgroundColor: theme.colors.surface,
    },
    optionTextWrap: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    selectedOptionTitle: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    optionDesc: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    customBox: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    customBoxLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    customRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dateChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dateChipText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    vsText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontWeight: "600",
    },
    applyButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
    },
    applyButtonText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 14,
    },
  });
}
