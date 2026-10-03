import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Calendar,
  ChevronDown,
  Eye,
  EyeOff,
  Layers,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { COMPARISON_PRESETS } from "../../constants/reports.constants";
import type {
  CollapseLevel,
  ComparisonPreset,
  ExpandLevel,
} from "../../types/reports.types";
import { ExpandCollapseModal } from "./expand-collapse-modal";
import { PresetPickerModal } from "./preset-picker-modal";

interface BalanceSheetFilterBarProps {
  preset: ComparisonPreset;
  onSelectPreset: (preset: ComparisonPreset) => void;
  momYear: number;
  momMonth: number;
  onChangeMomPeriod: (year: number, month: number) => void;
  customDateA: string;
  customDateB: string;
  onChangeCustomDateA: (dateKey: string) => void;
  onChangeCustomDateB: (dateKey: string) => void;
  hideZeroBalances: boolean;
  onToggleHideZeroBalances: () => void;
  onExpandAll: (level: ExpandLevel) => void;
  onCollapseAll: (level: CollapseLevel) => void;
}

export function BalanceSheetFilterBar({
  preset,
  onSelectPreset,
  momYear,
  momMonth,
  onChangeMomPeriod,
  customDateA,
  customDateB,
  onChangeCustomDateA,
  onChangeCustomDateB,
  hideZeroBalances,
  onToggleHideZeroBalances,
  onExpandAll,
  onCollapseAll,
}: BalanceSheetFilterBarProps) {
  const styles = useThemeStyles(createStyles);

  const [presetModalVisible, setPresetModalVisible] = useState(false);
  const [expandModalVisible, setExpandModalVisible] = useState(false);

  const activePresetConfig = COMPARISON_PRESETS.find((p) => p.key === preset);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Preset Selector Chip */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Comparison preset: ${activePresetConfig?.label}. Change comparison.`}
          onPress={() => setPresetModalVisible(true)}
          style={({ pressed }) => [
            styles.filterPill,
            styles.presetPill,
            pressed && styles.pressedPill,
          ]}
        >
          <Calendar size={14} color={styles.accentIcon.color} />
          <Text numberOfLines={1} style={styles.presetText}>
            {activePresetConfig?.label ?? "Comparison"}
          </Text>
          <ChevronDown size={14} color={styles.accentIcon.color} />
        </Pressable>

        {/* Expand / Collapse Chip */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change expand/collapse hierarchy"
          onPress={() => setExpandModalVisible(true)}
          style={({ pressed }) => [
            styles.filterPill,
            pressed && styles.pressedPill,
          ]}
        >
          <Layers size={14} color={styles.secondaryIcon.color} />
          <Text style={styles.pillText}>Hierarchy</Text>
          <ChevronDown size={14} color={styles.secondaryIcon.color} />
        </Pressable>

        {/* Zero Balances Toggle Chip */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            hideZeroBalances ? "Show zero balance accounts" : "Hide zero balance accounts"
          }
          onPress={onToggleHideZeroBalances}
          style={({ pressed }) => [
            styles.filterPill,
            !hideZeroBalances && styles.activePill,
            pressed && styles.pressedPill,
          ]}
        >
          {hideZeroBalances ? (
            <EyeOff size={14} color={styles.secondaryIcon.color} />
          ) : (
            <Eye size={14} color={styles.activePillText.color} />
          )}
          <Text
            style={[
              styles.pillText,
              !hideZeroBalances && styles.activePillText,
            ]}
          >
            {hideZeroBalances ? "Zero Balances: Hidden" : "Zero Balances: Visible"}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Preset Picker Modal */}
      <PresetPickerModal
        visible={presetModalVisible}
        onClose={() => setPresetModalVisible(false)}
        preset={preset}
        onSelectPreset={onSelectPreset}
        momYear={momYear}
        momMonth={momMonth}
        onChangeMomPeriod={onChangeMomPeriod}
        customDateA={customDateA}
        customDateB={customDateB}
        onChangeCustomDateA={onChangeCustomDateA}
        onChangeCustomDateB={onChangeCustomDateB}
      />

      {/* Expand/Collapse Hierarchy Modal */}
      <ExpandCollapseModal
        visible={expandModalVisible}
        onClose={() => setExpandModalVisible(false)}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    scrollContent: {
      paddingHorizontal: 16,
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    filterPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    presetPill: {
      borderColor: `${theme.colors.primary}50`,
      backgroundColor: `${theme.colors.primary}0D`,
    },
    pressedPill: {
      opacity: 0.8,
    },
    presetText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.primary,
      maxWidth: 220,
    },
    pillText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    activePill: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    activePillText: {
      color: "#FFFFFF",
      fontWeight: "700",
    },
    accentIcon: {
      color: theme.colors.primary,
    },
    secondaryIcon: {
      color: theme.colors.textSecondary,
    },
  });
}
