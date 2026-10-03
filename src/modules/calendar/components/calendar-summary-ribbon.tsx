import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ArrowDownLeft, ArrowUpRight, Clock, Scale } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import type {
  CalendarSummaryMetrics,
  CalendarTab,
} from "../types/calendar.types";

export interface CalendarSummaryRibbonProps {
  metrics: CalendarSummaryMetrics;
  activeTab: CalendarTab;
  isMonthScope: boolean;
}

export function CalendarSummaryRibbon({
  metrics,
  activeTab,
  isMonthScope,
}: CalendarSummaryRibbonProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  if (activeTab === "transactions") {
    const isNetPositive = metrics.netCashflowMinorUnits >= 0;

    return (
      <View style={styles.ribbon}>
        <View style={styles.metricItem}>
          <View style={styles.metricLabelRow}>
            <ArrowDownLeft color={theme.colors.success} size={13} />
            <Text style={styles.metricLabel}>Inflow</Text>
          </View>
          <Text style={[styles.metricValue, { color: theme.colors.success }]}>
            {formatCurrency(metrics.totalInflowMinorUnits, "PHP", false)}
          </Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.metricItem}>
          <View style={styles.metricLabelRow}>
            <ArrowUpRight color={theme.colors.danger} size={13} />
            <Text style={styles.metricLabel}>Outflow</Text>
          </View>
          <Text style={[styles.metricValue, { color: theme.colors.danger }]}>
            {formatCurrency(metrics.totalOutflowMinorUnits, "PHP", false)}
          </Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.metricItem}>
          <View style={styles.metricLabelRow}>
            <Scale
              color={
                isNetPositive ? theme.colors.success : theme.colors.danger
              }
              size={13}
            />
            <Text style={styles.metricLabel}>Net</Text>
          </View>
          <Text
            style={[
              styles.metricValue,
              {
                color: isNetPositive
                  ? theme.colors.success
                  : theme.colors.danger,
              },
            ]}
          >
            {formatCurrency(metrics.netCashflowMinorUnits, "PHP", false)}
          </Text>
        </View>
      </View>
    );
  }

  if (activeTab === "schedules") {
    return (
      <View style={styles.ribbon}>
        <View style={styles.metricItem}>
          <View style={styles.metricLabelRow}>
            <Clock color={theme.colors.warning ?? "#f59e0b"} size={13} />
            <Text style={styles.metricLabel}>Total Due</Text>
          </View>
          <Text
            style={[
              styles.metricValue,
              { color: theme.colors.warning ?? "#f59e0b" },
            ]}
          >
            {formatCurrency(metrics.schedulesTotalDueMinorUnits, "PHP")}
          </Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Upcoming</Text>
          <Text style={styles.metricValue}>
            {metrics.schedulesPendingCount}{" "}
            {metrics.schedulesPendingCount === 1 ? "item" : "items"}
          </Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Posted</Text>
          <Text style={[styles.metricValue, { color: theme.colors.success }]}>
            {metrics.schedulesPostedCount}{" "}
            {metrics.schedulesPostedCount === 1 ? "item" : "items"}
          </Text>
        </View>
      </View>
    );
  }

  // Net tab:
  const isNetPositive = metrics.netCashflowMinorUnits >= 0;
  const isProjectedPositive = metrics.projectedMonthEndNetMinorUnits >= 0;

  return (
    <View style={styles.ribbon}>
      <View style={styles.metricItem}>
        <Text style={styles.metricLabel}>Net Result</Text>
        <Text
          style={[
            styles.metricValue,
            {
              color: isNetPositive
                ? theme.colors.success
                : theme.colors.danger,
            },
          ]}
        >
          {formatCurrency(metrics.netCashflowMinorUnits, "PHP", false)}
        </Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.metricItem}>
        <Text style={styles.metricLabel}>Savings Rate</Text>
        <Text style={styles.metricValue}>
          {metrics.savingsRatePercent > 0 ? `${metrics.savingsRatePercent}%` : "0%"}
        </Text>
      </View>

      {isMonthScope && (
        <>
          <View style={styles.separator} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Month Forecast</Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color: isProjectedPositive
                    ? theme.colors.success
                    : theme.colors.danger,
                },
              ]}
            >
              {formatCurrency(metrics.projectedMonthEndNetMinorUnits, "PHP", false)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    ribbon: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    metricItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    metricLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginBottom: 2,
    },
    metricLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: theme.colors.textSecondary,
    },
    metricValue: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    separator: {
      width: 1,
      height: 24,
      backgroundColor: theme.colors.border,
    },
  });
}
