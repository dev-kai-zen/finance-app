import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type { IncomeExpenseMode } from "../../types/income-expense.types";
import type { LabelsSummaryItem } from "../../types/labels-summary.types";

interface LabelsSummaryTableProps {
  labels: LabelsSummaryItem[];
  totalMinorUnits: number;
  labeledMinorUnits: number;
  unlabeledMinorUnits: number;
  transactionCount: number;
  labeledTransactionCount: number;
  unlabeledTransactionCount: number;
  mode: IncomeExpenseMode;
  selectedLabelId: string | null;
  onSelectLabel: (labelId: string | null) => void;
}

export function LabelsSummaryTable({
  labels,
  totalMinorUnits,
  labeledMinorUnits,
  unlabeledMinorUnits,
  transactionCount,
  labeledTransactionCount,
  unlabeledTransactionCount,
  mode,
  selectedLabelId,
  onSelectLabel,
}: LabelsSummaryTableProps) {
  const styles = useThemeStyles(createStyles);
  const { preferences } = useCurrencyPreferences();
  const currencyCode = preferences.defaultCurrency;
  const resolveEntityColor = useResolveEntityColor();

  if (labels.length === 0) {
    return null;
  }

  const labeledPct =
    totalMinorUnits > 0
      ? Number(((labeledMinorUnits / totalMinorUnits) * 100).toFixed(1))
      : 0;
  const unlabeledPct =
    totalMinorUnits > 0
      ? Number(((unlabeledMinorUnits / totalMinorUnits) * 100).toFixed(1))
      : 0;

  return (
    <View style={styles.container}>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.headerTitle}>
          {mode === "expense" ? "SPENDING" : "EARNINGS"} BY LABEL
        </Text>
        <Text style={styles.headerSubtitle}>
          {labels.length} {labels.length === 1 ? "label" : "labels"}
        </Text>
      </View>

      {/* Labeled vs Unlabeled Overview Pill */}
      {totalMinorUnits > 0 && (
        <View style={styles.coverageCard}>
          <View style={styles.coverageRow}>
            <View style={styles.coverageCol}>
              <Text style={styles.coverageLabel}>TAGGED / LABELED</Text>
              <Text style={styles.coverageAmount}>
                {formatCurrency(labeledMinorUnits, currencyCode)}
              </Text>
              <Text style={styles.coverageMeta}>
                {labeledPct}% ({labeledTransactionCount}{" "}
                {labeledTransactionCount === 1 ? "tx" : "txs"})
              </Text>
            </View>

            <View style={styles.coverageDivider} />

            <View style={styles.coverageCol}>
              <Text style={styles.coverageLabel}>UNLABELED</Text>
              <Text style={styles.coverageAmount}>
                {formatCurrency(unlabeledMinorUnits, currencyCode)}
              </Text>
              <Text style={styles.coverageMeta}>
                {unlabeledPct}% ({unlabeledTransactionCount}{" "}
                {unlabeledTransactionCount === 1 ? "tx" : "txs"})
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Label List */}
      <View style={styles.list}>
        {labels.map((item, index) => {
          const isSelected = item.labelId === selectedLabelId;
          const isUnlabeled = item.labelId === "unlabeled";
          const color = isUnlabeled
            ? "#94A3B8"
            : resolveEntityColor(item.labelColor) ||
              item.labelColor ||
              styles.defaultBadgeColor.color;

          const displayName = isUnlabeled ? "Unlabeled" : `#${item.labelName}`;

          return (
            <Pressable
              key={item.labelId}
              accessibilityRole="button"
              accessibilityLabel={`${displayName}, ${formatCurrency(
                item.totalMinorUnits,
                currencyCode,
              )}, ${item.percentage}% of total`}
              onPress={() => {
                if (isSelected) {
                  onSelectLabel(null);
                } else {
                  onSelectLabel(item.labelId);
                }
              }}
              style={({ pressed }) => [
                styles.row,
                isSelected && styles.selectedRow,
                pressed && styles.pressedRow,
              ]}
            >
              {/* Rank */}
              <Text style={styles.rankText}>#{index + 1}</Text>

              {/* Label Icon Badge */}
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: `${color}20`,
                    borderColor: `${color}40`,
                  },
                ]}
              >
                <IconHelper
                  color={color}
                  name={isUnlabeled ? "tag-off" : "tag"}
                  size={15}
                />
              </View>

              {/* Label Info & Progress Bar */}
              <View style={styles.infoCol}>
                <View style={styles.nameRow}>
                  <Text numberOfLines={1} style={styles.labelName}>
                    {displayName}
                  </Text>
                  <Text style={styles.amountText}>
                    {formatCurrency(item.totalMinorUnits, currencyCode)}
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(1, item.percentage))}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.percentageText}>
                    {item.percentage}% of total
                  </Text>
                  <Text style={styles.countText}>
                    {item.transactionCount}{" "}
                    {item.transactionCount === 1 ? "transaction" : "transactions"}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Summary Footer */}
      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerTotalLabel}>
            TOTAL {mode.toUpperCase()}
          </Text>
          <Text style={styles.footerCountText}>
            {transactionCount}{" "}
            {transactionCount === 1 ? "transaction" : "transactions"}
          </Text>
        </View>
        <Text style={styles.footerTotalAmount}>
          {formatCurrency(totalMinorUnits, currencyCode)}
        </Text>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 24,
    },
    tableHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      paddingBottom: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: theme.colors.textMuted,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    coverageCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    coverageRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    coverageCol: {
      flex: 1,
      alignItems: "center",
    },
    coverageLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.6,
      color: theme.colors.textMuted,
      marginBottom: 2,
    },
    coverageAmount: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    coverageMeta: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    coverageDivider: {
      width: 1,
      height: 32,
      backgroundColor: theme.colors.border,
      marginHorizontal: 8,
    },
    list: {
      gap: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: "transparent",
      gap: 10,
    },
    selectedRow: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}12`,
    },
    pressedRow: {
      opacity: 0.8,
    },
    rankText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.textMuted,
      width: 22,
    },
    iconBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
    },
    defaultBadgeColor: {
      color: theme.colors.primary,
    },
    infoCol: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    labelName: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    amountText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    progressBarTrack: {
      height: 5,
      backgroundColor: `${theme.colors.border}80`,
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: 4,
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 3,
    },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    percentageText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    countText: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 2,
      borderTopColor: theme.colors.border,
    },
    footerLeft: {
      gap: 2,
    },
    footerTotalLabel: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: theme.colors.textPrimary,
    },
    footerCountText: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    footerTotalAmount: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
  });
}
