import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { formatCurrency } from "@/utils/currency";
import type { CategoryExpenseBreakdown } from "../hooks/use-calendar-data";
import type { CalendarSummaryMetrics } from "../types/calendar.types";

export interface CalendarNetTabProps {
  metrics: CalendarSummaryMetrics;
  categoryBreakdown: CategoryExpenseBreakdown[];
  isMonthScope: boolean;
}

export function CalendarNetTab({
  metrics,
  categoryBreakdown,
  isMonthScope,
}: CalendarNetTabProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { preferences } = useCurrencyPreferences();
  const currencyCode = preferences.defaultCurrency;

  const isInflowPositive = metrics.totalInflowMinorUnits >= 0;
  const isOutflowPositive = metrics.totalOutflowMinorUnits >= 0;
  const isNetPositive = metrics.netCashflowMinorUnits >= 0;
  const isProjectedPositive = metrics.projectedMonthEndNetMinorUnits >= 0;

  const totalInflow = Math.max(0, metrics.totalInflowMinorUnits);
  const totalOutflow = Math.abs(metrics.totalOutflowMinorUnits);
  const totalFlow = totalInflow + totalOutflow;

  const inflowPercent =
    totalFlow > 0 ? Math.round((totalInflow / totalFlow) * 100) : 50;
  const outflowPercent = totalFlow > 0 ? 100 - inflowPercent : 50;

  return (
    <View style={styles.container}>
      {/* 1. Cashflow Overview Cards */}
      <View style={styles.overviewRow}>
        {/* Inflow Card */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor:
                    (isInflowPositive
                      ? theme.colors.success
                      : theme.colors.danger) + "18",
                },
              ]}
            >
              <ArrowDownLeft
                color={
                  isInflowPositive ? theme.colors.success : theme.colors.danger
                }
                size={15}
              />
            </View>
            <Text style={styles.statCardLabel}>Inflow</Text>
          </View>
          <Text
            style={[
              styles.statCardValue,
              {
                color: isInflowPositive
                  ? theme.colors.success
                  : theme.colors.danger,
              },
            ]}
          >
            {formatCurrency(metrics.totalInflowMinorUnits, currencyCode, false)}
          </Text>
        </View>

        {/* Outflow Card */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor:
                    (isOutflowPositive
                      ? theme.colors.success
                      : theme.colors.danger) + "18",
                },
              ]}
            >
              <ArrowUpRight
                color={
                  isOutflowPositive ? theme.colors.success : theme.colors.danger
                }
                size={15}
              />
            </View>
            <Text style={styles.statCardLabel}>Outflow</Text>
          </View>
          <Text
            style={[
              styles.statCardValue,
              {
                color: isOutflowPositive
                  ? theme.colors.success
                  : theme.colors.danger,
              },
            ]}
          >
            {formatCurrency(metrics.totalOutflowMinorUnits, currencyCode, false)}
          </Text>
        </View>
      </View>

      {/* 2. Net Cashflow Statement Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Scale
              color={isNetPositive ? theme.colors.success : theme.colors.danger}
              size={18}
            />
            <Text style={styles.cardTitle}>Net Cashflow</Text>
          </View>
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: isNetPositive
                  ? theme.colors.success + "18"
                  : theme.colors.danger + "18",
              },
            ]}
          >
            {isNetPositive ? (
              <TrendingUp color={theme.colors.success} size={12} />
            ) : (
              <TrendingDown color={theme.colors.danger} size={12} />
            )}
            <Text
              style={[
                styles.statusChipText,
                {
                  color: isNetPositive
                    ? theme.colors.success
                    : theme.colors.danger,
                },
              ]}
            >
              {isNetPositive ? "Surplus" : "Deficit"}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.netTotalAmount,
            { color: isNetPositive ? theme.colors.success : theme.colors.danger },
          ]}
        >
          {formatCurrency(metrics.netCashflowMinorUnits, currencyCode, false)}
        </Text>

        {/* Inflow vs Outflow Visual Bar */}
        {totalFlow > 0 && (
          <View style={styles.ratioSection}>
            <View style={styles.ratioBarContainer}>
              <View
                style={[
                  styles.ratioSegment,
                  {
                    flex: inflowPercent,
                    backgroundColor: theme.colors.success,
                  },
                ]}
              />
              <View
                style={[
                  styles.ratioSegment,
                  {
                    flex: outflowPercent,
                    backgroundColor: theme.colors.danger,
                  },
                ]}
              />
            </View>
            <View style={styles.ratioLegend}>
              <Text style={styles.legendText}>
                Inflow: <Text style={{ fontWeight: "700" }}>{inflowPercent}%</Text>
              </Text>
              <Text style={styles.legendText}>
                Outflow: <Text style={{ fontWeight: "700" }}>{outflowPercent}%</Text>
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 3. Top Spending Categories */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <PieChart color={theme.colors.primary} size={18} />
            <Text style={styles.cardTitle}>Top Expense Categories</Text>
          </View>
          <Text style={styles.cardHeaderSub}>
            {categoryBreakdown.length}{" "}
            {categoryBreakdown.length === 1 ? "category" : "categories"}
          </Text>
        </View>

        {categoryBreakdown.length === 0 ? (
          <Text style={styles.emptyCategoriesText}>
            No expenses recorded for this period.
          </Text>
        ) : (
          <View style={styles.categoriesList}>
            {categoryBreakdown.map((cat, index) => (
              <View key={cat.id} style={styles.categoryItem}>
                <View style={styles.categoryLeft}>
                  <View
                    style={[
                      styles.categoryIconCircle,
                      {
                        backgroundColor: cat.color
                          ? `${cat.color}20`
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <IconHelper
                      color={cat.color ?? theme.colors.textPrimary}
                      name={cat.icon || "tag"}
                      size={14}
                    />
                  </View>
                  <View style={styles.categoryNameCol}>
                    <Text numberOfLines={1} style={styles.categoryName}>
                      {index + 1}. {cat.name}
                    </Text>
                    <View style={styles.progressBackground}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(cat.percentage, 100)}%`,
                            backgroundColor: cat.color ?? theme.colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.categoryRight}>
                  <Text style={styles.categoryAmount}>
                    {formatCurrency(cat.totalMinorUnits, currencyCode)}
                  </Text>
                  <Text style={styles.categoryPercent}>{cat.percentage}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 4. Month-End Forecast (Visible when whole month is scoped) */}
      {isMonthScope && (
        <View style={[styles.card, styles.forecastCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Sparkles color={theme.colors.primary} size={18} />
              <Text style={styles.cardTitle}>Month-End Projection</Text>
            </View>
            <View
              style={[
                styles.statusChip,
                {
                  backgroundColor: isProjectedPositive
                    ? theme.colors.success + "18"
                    : theme.colors.danger + "18",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusChipText,
                  {
                    color: isProjectedPositive
                      ? theme.colors.success
                      : theme.colors.danger,
                  },
                ]}
              >
                {isProjectedPositive ? "Projected Surplus" : "Projected Deficit"}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.netTotalAmount,
              {
                color: isProjectedPositive
                  ? theme.colors.success
                  : theme.colors.danger,
              },
            ]}
          >
            {formatCurrency(
              metrics.projectedMonthEndNetMinorUnits,
              currencyCode,
              false,
            )}
          </Text>

          <Text style={styles.forecastDescription}>
            Estimated net cash position at the end of the month combining
            recorded transactions with remaining scheduled bills and expected
            income.
          </Text>
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
    },
    overviewRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
      gap: 4,
    },
    statCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    iconBubble: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    statCardLabel: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textSecondary,
    },
    statCardValue: {
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: -0.3,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    cardHeaderSub: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    statusChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    statusChipText: {
      fontSize: 10,
      fontWeight: "700",
    },
    netTotalAmount: {
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    ratioSection: {
      gap: 6,
      marginTop: 4,
    },
    ratioBarContainer: {
      height: 8,
      flexDirection: "row",
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: theme.colors.border,
    },
    ratioSegment: {
      height: "100%",
    },
    ratioLegend: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    legendText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    emptyCategoriesText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontStyle: "italic",
      paddingVertical: theme.spacing.xs,
    },
    categoriesList: {
      gap: theme.spacing.sm,
    },
    categoryItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    categoryLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      flex: 1,
    },
    categoryIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryNameCol: {
      flex: 1,
      gap: 3,
    },
    categoryName: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    progressBackground: {
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 2,
    },
    categoryRight: {
      alignItems: "flex-end",
    },
    categoryAmount: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.danger,
    },
    categoryPercent: {
      fontSize: 10,
      color: theme.colors.textSecondary,
    },
    forecastCard: {
      borderColor: theme.colors.primary + "30",
      backgroundColor: theme.colors.primary + "06",
    },
    forecastDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 17,
    },
  });
}
