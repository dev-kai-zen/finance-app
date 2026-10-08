import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { formatCurrency } from "@/utils/currency";
import { REPORT_COLORS } from "../../constants/reports.constants";
import type { NetWorthPoint } from "../../types/net-worth-growth.types";

interface NetWorthHistoryTableProps {
  points: NetWorthPoint[];
  selectedPointIndex: number | null;
  onSelectPointIndex: (index: number | null) => void;
}

export function NetWorthHistoryTable({
  points,
  selectedPointIndex,
  onSelectPointIndex,
}: NetWorthHistoryTableProps) {
  const styles = useThemeStyles(createStyles);
  const { preferences } = useCurrencyPreferences();
  const currencyCode = preferences.defaultCurrency;
  const { width } = useWindowDimensions();
  const isNarrow = width < 560;

  // Display reversed (newest first)
  const displayRows = [...points].reverse();

  return (
    <View style={styles.container}>
      {isNarrow ? (
        <View style={styles.scrollHint}>
          <Text style={styles.scrollHintText}>
            ⇄ Scroll horizontally to view all history columns
          </Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        <View style={styles.tableWrapper}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={[styles.colDate, styles.headerCol]}>
              <Text style={styles.headerText}>DATE</Text>
            </View>
            <View style={[styles.colNumeric, styles.headerCol]}>
              <Text style={styles.headerText}>ASSETS</Text>
            </View>
            <View style={[styles.colNumeric, styles.headerCol]}>
              <Text style={styles.headerText}>DEBT</Text>
            </View>
            <View style={[styles.colNet, styles.headerCol]}>
              <Text style={styles.headerText}>NET WORTH</Text>
            </View>
            <View style={[styles.colChange, styles.headerCol]}>
              <Text style={styles.headerText}>CHANGE</Text>
            </View>
          </View>

          {/* Body Rows */}
          {displayRows.map((row) => {
            const originalIndex = points.findIndex(
              (p) => p.date.getTime() === row.date.getTime(),
            );
            const isSelected = originalIndex === selectedPointIndex;

            return (
              <Pressable
                key={row.date.getTime()}
                accessibilityRole="button"
                accessibilityLabel={`${row.label}: Net Worth ${row.formattedNetWorth}, Change ${row.formattedDiff}`}
                onPress={() => {
                  onSelectPointIndex(isSelected ? null : originalIndex);
                }}
                style={({ pressed }) => [
                  styles.dataRow,
                  isSelected && styles.selectedRow,
                  pressed && styles.pressedRow,
                ]}
              >
                <View style={styles.colDate}>
                  <Text numberOfLines={1} style={styles.dateNameText}>
                    {row.label}
                  </Text>
                </View>

                <View style={styles.colNumeric}>
                  <Text numberOfLines={1} style={styles.assetAmount}>
                    {formatCurrency(row.totalAssetsMinorUnits, currencyCode)}
                  </Text>
                </View>

                <View style={styles.colNumeric}>
                  <Text numberOfLines={1} style={styles.debtAmount}>
                    {formatCurrency(Math.abs(row.totalLiabilitiesMinorUnits), currencyCode)}
                  </Text>
                </View>

                <View style={styles.colNet}>
                  <Text numberOfLines={1} style={styles.netWorthAmount}>
                    {row.formattedNetWorth}
                  </Text>
                </View>

                <View style={styles.colChange}>
                  <Text
                    numberOfLines={1}
                    style={[styles.changeText, { color: row.color }]}
                  >
                    {row.formattedDiff} {row.symbol}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      paddingBottom: 24,
      backgroundColor: theme.colors.surface,
    },
    scrollHint: {
      backgroundColor: theme.colors.surfaceMuted,
      paddingVertical: 5,
      paddingHorizontal: 16,
      alignItems: "center",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    scrollHintText: {
      fontSize: 11,
      fontWeight: "500",
      color: theme.colors.textMuted,
    },
    horizontalScrollContent: {
      minWidth: "100%",
    },
    tableWrapper: {
      minWidth: 540,
      width: "100%",
      backgroundColor: theme.colors.surface,
    },
    colDate: {
      flex: 1.3,
      minWidth: 110,
      justifyContent: "center",
      paddingLeft: 16,
      paddingRight: 8,
    },
    colNumeric: {
      flex: 1,
      minWidth: 105,
      alignItems: "flex-end",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    colNet: {
      flex: 1.2,
      minWidth: 120,
      alignItems: "flex-end",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    colChange: {
      flex: 1.1,
      minWidth: 110,
      alignItems: "flex-end",
      justifyContent: "center",
      paddingRight: 16,
      paddingLeft: 8,
    },
    headerRow: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceMuted,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerCol: {
      justifyContent: "center",
    },
    headerText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.textMuted,
      letterSpacing: 0.5,
    },
    dataRow: {
      flexDirection: "row",
      paddingVertical: 9,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${theme.colors.border}70`,
      backgroundColor: theme.colors.surface,
    },
    selectedRow: {
      backgroundColor: `${theme.colors.primary}12`,
    },
    pressedRow: {
      opacity: 0.8,
    },
    dateNameText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    assetAmount: {
      fontSize: 12,
      fontWeight: "600",
      color: REPORT_COLORS.positiveGreen,
      fontVariant: ["tabular-nums"],
    },
    debtAmount: {
      fontSize: 12,
      fontWeight: "600",
      color: REPORT_COLORS.negativeRed,
      fontVariant: ["tabular-nums"],
    },
    netWorthAmount: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    changeText: {
      fontSize: 12,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
  });
}
