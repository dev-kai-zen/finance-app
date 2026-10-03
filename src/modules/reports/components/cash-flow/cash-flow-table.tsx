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
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import { REPORT_COLORS } from "../../constants/reports.constants";
import type { CashFlowRowItem } from "../../types/cash-flow.types";

interface CashFlowTableProps {
  periods: CashFlowRowItem[];
  totalInflowMinorUnits: number;
  totalOutflowMinorUnits: number;
  netCashFlowMinorUnits: number;
  overallSavingsRatePercentage: number;
  selectedPeriodKey: string | null;
  onSelectPeriod: (periodKey: string | null) => void;
}

export function CashFlowTable({
  periods,
  totalInflowMinorUnits,
  totalOutflowMinorUnits,
  netCashFlowMinorUnits,
  overallSavingsRatePercentage,
  selectedPeriodKey,
  onSelectPeriod,
}: CashFlowTableProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { width } = useWindowDimensions();
  const isNarrow = width < 560;

  const isNetPositive = netCashFlowMinorUnits >= 0;

  return (
    <View style={styles.container}>
      {isNarrow ? (
        <View style={styles.scrollHint}>
          <Text style={styles.scrollHintText}>
            ⇄ Scroll horizontally to view all cash flow columns
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
            <View style={[styles.colPeriod, styles.headerCol]}>
              <Text style={styles.headerText}>PERIOD</Text>
            </View>
            <View style={[styles.colNumeric, styles.headerCol]}>
              <Text style={styles.headerText}>INFLOW</Text>
            </View>
            <View style={[styles.colNumeric, styles.headerCol]}>
              <Text style={styles.headerText}>OUTFLOW</Text>
            </View>
            <View style={[styles.colNet, styles.headerCol]}>
              <Text style={styles.headerText}>NET CASH FLOW</Text>
            </View>
            <View style={[styles.colRate, styles.headerCol]}>
              <Text style={styles.headerText}>SAVINGS</Text>
            </View>
          </View>

          {/* Body Rows */}
          {periods.map((row) => {
            const isSelected = row.periodKey === selectedPeriodKey;

            return (
              <Pressable
                key={row.periodKey}
                accessibilityRole="button"
                accessibilityLabel={`${row.periodLabel}: Inflow ${formatCurrency(
                  row.inflowMinorUnits,
                  "PHP",
                )}, Outflow ${formatCurrency(
                  row.outflowMinorUnits,
                  "PHP",
                )}, Net ${row.formattedNet}`}
                onPress={() => {
                  onSelectPeriod(isSelected ? null : row.periodKey);
                }}
                style={({ pressed }) => [
                  styles.dataRow,
                  isSelected && styles.selectedRow,
                  pressed && styles.pressedRow,
                ]}
              >
                <View style={styles.colPeriod}>
                  <Text numberOfLines={1} style={styles.periodNameText}>
                    {row.periodLabel}
                  </Text>
                </View>

                <View style={styles.colNumeric}>
                  <Text numberOfLines={1} style={styles.inflowAmount}>
                    +{formatCurrency(row.inflowMinorUnits, "PHP")}
                  </Text>
                </View>

                <View style={styles.colNumeric}>
                  <Text numberOfLines={1} style={styles.outflowAmount}>
                    -{formatCurrency(row.outflowMinorUnits, "PHP")}
                  </Text>
                </View>

                <View style={styles.colNet}>
                  <Text
                    numberOfLines={1}
                    style={[styles.netAmount, { color: row.color }]}
                  >
                    {row.formattedNet} {row.symbol}
                  </Text>
                </View>

                <View style={styles.colRate}>
                  <View
                    style={[
                      styles.rateBadge,
                      {
                        backgroundColor:
                          row.savingsRatePercentage >= 20
                            ? `${REPORT_COLORS.positiveGreen}20`
                            : row.savingsRatePercentage > 0
                            ? `${theme.colors.accent}20`
                            : `${REPORT_COLORS.negativeRed}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rateBadgeText,
                        {
                          color:
                            row.savingsRatePercentage >= 20
                              ? REPORT_COLORS.positiveGreen
                              : row.savingsRatePercentage > 0
                              ? theme.colors.accent
                              : REPORT_COLORS.negativeRed,
                        },
                      ]}
                    >
                      {row.savingsRatePercentage}%
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {/* Summary Footer Row */}
          <View style={styles.footerRow}>
            <View style={[styles.colPeriod, styles.footerCol]}>
              <Text style={styles.footerTitle}>TOTAL</Text>
            </View>
            <View style={[styles.colNumeric, styles.footerCol]}>
              <Text numberOfLines={1} style={[styles.footerNumeric, styles.inflowAmount]}>
                +{formatCurrency(totalInflowMinorUnits, "PHP")}
              </Text>
            </View>
            <View style={[styles.colNumeric, styles.footerCol]}>
              <Text numberOfLines={1} style={[styles.footerNumeric, styles.outflowAmount]}>
                -{formatCurrency(totalOutflowMinorUnits, "PHP")}
              </Text>
            </View>
            <View style={[styles.colNet, styles.footerCol]}>
              <Text
                numberOfLines={1}
                style={[
                  styles.footerNumeric,
                  {
                    color: isNetPositive
                      ? REPORT_COLORS.positiveGreen
                      : REPORT_COLORS.negativeRed,
                  },
                ]}
              >
                {isNetPositive ? "+" : "-"}
                {formatCurrency(Math.abs(netCashFlowMinorUnits), "PHP")}{" "}
                {isNetPositive ? "▲" : "▼"}
              </Text>
            </View>
            <View style={[styles.colRate, styles.footerCol]}>
              <Text style={styles.footerRateText}>
                {overallSavingsRatePercentage}%
              </Text>
            </View>
          </View>
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
    // Columns
    colPeriod: {
      flex: 1.4,
      minWidth: 120,
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
      minWidth: 125,
      alignItems: "flex-end",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    colRate: {
      flex: 0.8,
      minWidth: 75,
      alignItems: "center",
      justifyContent: "center",
      paddingRight: 16,
      paddingLeft: 8,
    },
    // Header
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
    // Data Rows
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
    periodNameText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    inflowAmount: {
      fontSize: 12,
      fontWeight: "600",
      color: REPORT_COLORS.positiveGreen,
      fontVariant: ["tabular-nums"],
    },
    outflowAmount: {
      fontSize: 12,
      fontWeight: "600",
      color: REPORT_COLORS.negativeRed,
      fontVariant: ["tabular-nums"],
    },
    netAmount: {
      fontSize: 12,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    rateBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    rateBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    // Footer
    footerRow: {
      flexDirection: "row",
      paddingVertical: 14,
      backgroundColor: `${theme.colors.primary}12`,
      borderTopWidth: 2,
      borderTopColor: theme.colors.borderStrong,
    },
    footerCol: {
      justifyContent: "center",
    },
    footerTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      letterSpacing: 0.8,
    },
    footerNumeric: {
      fontSize: 13,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    footerRateText: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
  });
}
