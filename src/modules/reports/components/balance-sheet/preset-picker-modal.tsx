import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react-native";
import { DatePickerModal } from "@/components/date-picker-modal";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { COMPARISON_PRESETS } from "../../constants/reports.constants";
import type { ComparisonPreset } from "../../types/reports.types";
import {
  formatMonthYear,
  formatShortDate,
  parseDateKeyToDate,
} from "../../utils/reports-dates";

interface PresetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  preset: ComparisonPreset;
  onSelectPreset: (preset: ComparisonPreset) => void;
  momYear: number;
  momMonth: number;
  onChangeMomPeriod: (year: number, month: number) => void;
  customDateA: string;
  customDateB: string;
  onChangeCustomDateA: (dateKey: string) => void;
  onChangeCustomDateB: (dateKey: string) => void;
}

export function PresetPickerModal({
  visible,
  onClose,
  preset,
  onSelectPreset,
  momYear,
  momMonth,
  onChangeMomPeriod,
  customDateA,
  customDateB,
  onChangeCustomDateA,
  onChangeCustomDateB,
}: PresetPickerModalProps) {
  const styles = useThemeStyles(createStyles);

  const [datePickerTarget, setDatePickerTarget] = useState<"A" | "B" | null>(null);

  const handlePrevMonth = () => {
    if (momMonth === 0) {
      onChangeMomPeriod(momYear - 1, 11);
    } else {
      onChangeMomPeriod(momYear, momMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (momMonth === 11) {
      onChangeMomPeriod(momYear + 1, 0);
    } else {
      onChangeMomPeriod(momYear, momMonth + 1);
    }
  };

  return (
    <>
      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={onClose}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>Comparison Period</Text>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.closeButton}
              >
                <X size={20} color={styles.closeIcon.color} />
              </Pressable>
            </View>

            <View style={styles.presetList}>
              {COMPARISON_PRESETS.map((item) => {
                const isSelected = item.key === preset;
                return (
                  <Pressable
                    key={item.key}
                    style={[
                      styles.presetItem,
                      isSelected && styles.selectedPresetItem,
                    ]}
                    onPress={() => {
                      onSelectPreset(item.key);
                    }}
                  >
                    <View style={styles.radio}>
                      {isSelected ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : null}
                    </View>
                    <View style={styles.presetTextWrap}>
                      <Text
                        style={[
                          styles.presetLabel,
                          isSelected && styles.selectedPresetLabel,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.presetDescription}>
                        {item.description}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Extra Controls based on selected preset */}
            {preset === "mom" ? (
              <View style={styles.subConfigBox}>
                <Text style={styles.subConfigLabel}>Selected Month:</Text>
                <View style={styles.monthNavigator}>
                  <Pressable
                    accessibilityLabel="Previous month"
                    onPress={handlePrevMonth}
                    style={styles.navArrow}
                  >
                    <ChevronLeft size={18} color={styles.accentColor.color} />
                  </Pressable>
                  <Text style={styles.monthDisplay}>
                    {formatMonthYear(momYear, momMonth)}
                  </Text>
                  <Pressable
                    accessibilityLabel="Next month"
                    onPress={handleNextMonth}
                    style={styles.navArrow}
                  >
                    <ChevronRight size={18} color={styles.accentColor.color} />
                  </Pressable>
                </View>
              </View>
            ) : null}

            {preset === "custom" ? (
              <View style={styles.subConfigBox}>
                <Text style={styles.subConfigLabel}>Custom Dates:</Text>
                <View style={styles.customDateRow}>
                  <Pressable
                    style={styles.dateChip}
                    onPress={() => setDatePickerTarget("A")}
                  >
                    <Calendar size={14} color={styles.accentColor.color} />
                    <Text style={styles.dateChipText}>
                      Date A: {formatShortDate(parseDateKeyToDate(customDateA))}
                    </Text>
                  </Pressable>
                  <Text style={styles.vsText}>vs</Text>
                  <Pressable
                    style={styles.dateChip}
                    onPress={() => setDatePickerTarget("B")}
                  >
                    <Calendar size={14} color={styles.accentColor.color} />
                    <Text style={styles.dateChipText}>
                      Date B: {formatShortDate(parseDateKeyToDate(customDateB))}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Pressable
              style={styles.applyButton}
              onPress={onClose}
            >
              <Text style={styles.applyButtonText}>Apply Comparison</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date Pickers for Custom Mode */}
      <DatePickerModal
        visible={datePickerTarget === "A"}
        onClose={() => setDatePickerTarget(null)}
        selectedDate={customDateA}
        title="Select Previous / Baseline Date (Date A)"
        onSelectDate={(date) => {
          onChangeCustomDateA(date);
          setDatePickerTarget(null);
        }}
      />
      <DatePickerModal
        visible={datePickerTarget === "B"}
        onClose={() => setDatePickerTarget(null)}
        selectedDate={customDateB}
        title="Select Comparison Date (Date B)"
        onSelectDate={(date) => {
          onChangeCustomDateB(date);
          setDatePickerTarget(null);
        }}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    sheet: {
      width: "100%",
      maxWidth: 480,
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
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
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
    accentColor: {
      color: theme.colors.primary,
    },
    presetList: {
      gap: 8,
      marginBottom: 16,
    },
    presetItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: 12,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: "transparent",
    },
    selectedPresetItem: {
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
    presetTextWrap: {
      flex: 1,
    },
    presetLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    selectedPresetLabel: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    presetDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    subConfigBox: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    subConfigLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    monthNavigator: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    navArrow: {
      padding: 6,
    },
    monthDisplay: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    customDateRow: {
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
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dateChipText: {
      fontSize: 12,
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
