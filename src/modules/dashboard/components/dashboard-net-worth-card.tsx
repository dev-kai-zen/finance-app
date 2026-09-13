import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";

export interface DashboardNetWorthCardProps {
  netWorthMinorUnits: number;
  totalAssetsMinorUnits: number;
  totalLiabilitiesMinorUnits: number;
  currencyCode?: string;
}

export function DashboardNetWorthCard({
  netWorthMinorUnits,
  totalAssetsMinorUnits,
  totalLiabilitiesMinorUnits,
  currencyCode = "PHP",
}: DashboardNetWorthCardProps) {
  const styles = useThemeStyles(createStyles);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>ESTIMATED NET WORTH</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>REAL-TIME</Text>
        </View>
      </View>

      <Text style={styles.netWorthValue}>
        {formatCurrency(netWorthMinorUnits, currencyCode, true)}
      </Text>

      <View style={styles.breakdownRow}>
        <View style={styles.pill}>
          <View style={[styles.pillDot, styles.assetDot]} />
          <Text style={styles.pillLabel}>Assets:</Text>
          <Text style={styles.pillValue}>
            {formatCurrency(totalAssetsMinorUnits, currencyCode, true)}
          </Text>
        </View>

        <View style={styles.pill}>
          <View style={[styles.pillDot, styles.liabilityDot]} />
          <Text style={styles.pillLabel}>Liabilities:</Text>
          <Text style={[styles.pillValue, styles.liabilityText]}>
            {formatCurrency(totalLiabilitiesMinorUnits, currencyCode, true)}
          </Text>
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
      marginBottom: 6,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
    },
    liveIndicator: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: 12,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    liveDot: {
      backgroundColor: theme.colors.primary,
      borderRadius: 3,
      height: 6,
      width: 6,
    },
    liveText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    netWorthValue: {
      color: theme.colors.textPrimary,
      fontSize: 32,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
      letterSpacing: -0.5,
      marginVertical: 4,
    },
    breakdownRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 12,
    },
    pill: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    pillDot: {
      borderRadius: 4,
      height: 7,
      width: 7,
    },
    assetDot: {
      backgroundColor: theme.colors.success,
    },
    liabilityDot: {
      backgroundColor: theme.colors.warning,
    },
    pillLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    pillValue: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    liabilityText: {
      color: theme.colors.warning,
    },
  });
}
