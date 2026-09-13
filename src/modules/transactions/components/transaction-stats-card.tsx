import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import type { TransactionStats } from "../types/transaction.types";

export interface TransactionStatsCardProps {
  stats: TransactionStats;
  currencyCode?: string;
}

export function TransactionStatsCard({
  stats,
  currencyCode = "PHP",
}: TransactionStatsCardProps) {
  const styles = useThemeStyles(createStyles);

  const netColorStyle =
    stats.netCashflowMinorUnits >= 0
      ? styles.positiveText
      : styles.negativeText;

  return (
    <View style={styles.container}>
      {/* Inflow Card */}
      <View style={styles.statCard}>
        <Text style={styles.label}>TOTAL INFLOW</Text>
        <Text style={[styles.value, styles.positiveText]}>
          +{formatCurrency(stats.totalInflowMinorUnits, currencyCode, true)}
        </Text>
      </View>

      {/* Outflow Card */}
      <View style={styles.statCard}>
        <Text style={styles.label}>TOTAL OUTFLOW</Text>
        <Text style={[styles.value, styles.negativeText]}>
          -{formatCurrency(stats.totalOutflowMinorUnits, currencyCode, true)}
        </Text>
      </View>

      {/* Net Cashflow Card */}
      <View style={styles.statCard}>
        <Text style={styles.label}>NET CASHFLOW</Text>
        <Text style={[styles.value, netColorStyle]}>
          {stats.netCashflowMinorUnits >= 0 ? "+" : ""}
          {formatCurrency(stats.netCashflowMinorUnits, currencyCode, true)}
        </Text>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    statCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flex: 1,
      minWidth: 140,
      padding: theme.spacing.md,
      ...theme.shadows.card,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    value: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    positiveText: {
      color: theme.colors.success,
    },
    negativeText: {
      color: theme.colors.danger,
    },
  });
}
