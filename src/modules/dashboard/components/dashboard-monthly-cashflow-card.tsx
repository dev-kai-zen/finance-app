import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import type { MonthlyCashflow } from "../types/dashboard.types";

export interface DashboardMonthlyCashflowCardProps {
  cashflow: MonthlyCashflow;
  currencyCode?: string;
}

export function DashboardMonthlyCashflowCard({
  cashflow,
  currencyCode = "PHP",
}: DashboardMonthlyCashflowCardProps) {
  const styles = useThemeStyles(createStyles);

  const isNetPositive = cashflow.netSavingsMinorUnits >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>CASH FLOW OVERVIEW</Text>
        <Text style={styles.monthBadge}>{cashflow.monthLabel}</Text>
      </View>

      <View style={styles.statsGrid}>
        {/* Inflow */}
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Total Inflow</Text>
          <Text style={[styles.statValue, styles.inflowText]}>
            +{formatCurrency(cashflow.totalInflowMinorUnits, currencyCode, true)}
          </Text>
        </View>

        {/* Outflow */}
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Total Outflow</Text>
          <Text style={[styles.statValue, styles.outflowText]}>
            -{formatCurrency(cashflow.totalOutflowMinorUnits, currencyCode, true)}
          </Text>
        </View>

        {/* Net Savings */}
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Net Cash Saved</Text>
          <Text
            style={[
              styles.statValue,
              isNetPositive ? styles.inflowText : styles.outflowText,
            ]}
          >
            {isNetPositive ? "+" : ""}
            {formatCurrency(cashflow.netSavingsMinorUnits, currencyCode, true)}
          </Text>
        </View>
      </View>

      {/* Savings Rate Progress */}
      <View style={styles.rateContainer}>
        <View style={styles.rateHeader}>
          <Text style={styles.rateLabel}>Monthly Savings Rate</Text>
          <Text style={styles.ratePercent}>{cashflow.savingsRatePercentage}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              { width: `${Math.min(100, Math.max(0, cashflow.savingsRatePercentage))}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    title: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
    },
    monthBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 6,
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "space-between",
    },
    statCol: {
      flex: 1,
      minWidth: 100,
    },
    statLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginBottom: 4,
    },
    statValue: {
      color: theme.colors.textPrimary,
      fontSize: 17,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    inflowText: {
      color: theme.colors.success,
    },
    outflowText: {
      color: theme.colors.danger,
    },
    rateContainer: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      marginTop: 16,
      paddingTop: 12,
    },
    rateHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    rateLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    ratePercent: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    progressTrack: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 4,
      height: 6,
      overflow: "hidden",
      width: "100%",
    },
    progressBar: {
      backgroundColor: theme.colors.primary,
      borderRadius: 4,
      height: "100%",
    },
  });
}
