import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Calendar, Check, ChevronDown, X } from "lucide-react-native";
import { DatePickerModal } from "@/components/date-picker-modal";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type {
  CashFlowDateRange,
  CashFlowPeriodPreset,
} from "../../types/cash-flow.types";
import { formatShortDate, parseDateKeyToDate } from "../../utils/reports-dates";

interface CashFlowFilterBarProps {
  preset: CashFlowPeriodPreset;
  onSelectPreset: (preset: CashFlowPeriodPreset) => void;
  range: CashFlowDateRange;
  customDateA: string;
  customDateB: string;
  onChangeCustomDateA: (dateKey: string) => void;
  onChangeCustomDateB: (dateKey: string) => void;
}

const CASH_FLOW_PRESETS: Array<{
  key: CashFlowPeriodPreset;
  label: string;
  desc: string;
}> = [
  { key: "6m", label: "Last 6 Months", desc: "Past 6 calendar months" },
  { key: "12m", label: "Last 12 Months", desc: "Full past 12 calendar months" },
  { key: "ytd", label: "Year-to-Date (YTD)", desc: "From January 1st to today" },
  { key: "custom", label: "Custom Date Range", desc: "Select custom start and end dates" },
];

export function CashFlowFilterBar({
  preset,
  onSelectPreset,
  range,
  customDateA,
  customDateB,
  onChangeCustomDateA,
  onChangeCustomDateB,
}: CashFlowFilterBarProps) {
  const styles = useThemeStyles(createStyles);
  const [modalVisible, setModalVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<"A" | "B" | null>(null);

  const activePreset = CASH_FLOW_PRESETS.find((p) => p.key === preset);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Period: ${range.label}. Tap to change period.`}
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [
            styles.periodPill,
            pressed && styles.pressedPill,
          ]}
        >
          <Calendar size={14} color={styles.accentIcon.color} />
          <Text numberOfLines={1} style={styles.periodText}>
            {activePreset?.label ?? range.label}
          </Text>
          <ChevronDown size={14} color={styles.accentIcon.color} />
        </Pressable>
      </ScrollView>

      {/* Preset Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cash Flow Period</Text>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color={styles.closeIcon.color} />
              </Pressable>
            </View>

            <View style={styles.optionList}>
              {CASH_FLOW_PRESETS.map((opt) => {
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
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply Period</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date Pickers */}
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
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    scrollContent: {
      paddingHorizontal: 16,
      flexDirection: "row",
      gap: 8,
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
