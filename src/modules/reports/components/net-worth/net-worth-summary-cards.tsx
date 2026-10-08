import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Award,
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { formatCurrency } from "@/utils/currency";
import { REPORT_COLORS } from "../../constants/reports.constants";

interface NetWorthSummaryCardsProps {
  currentNetWorthMinorUnits: number;
  periodChangeMinorUnits: number;
  periodChangePercentage: number | null;
  peakNetWorthMinorUnits: number;
  lowestNetWorthMinorUnits: number;
}

export function NetWorthSummaryCards({
  currentNetWorthMinorUnits,
  periodChangeMinorUnits,
  periodChangePercentage,
  peakNetWorthMinorUnits,
  lowestNetWorthMinorUnits,
}: NetWorthSummaryCardsProps) {
  const styles = useThemeStyles(createStyles);
  const { preferences } = useCurrencyPreferences();
  const currencyCode = preferences.defaultCurrency;
  const isGrowthPositive = periodChangeMinorUnits >= 0;

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {/* Card 1: Current Net Worth */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>CURRENT NET WORTH</Text>
            <View style={[styles.iconWrap, styles.primaryIconWrap]}>
              <CircleDollarSign size={14} color={styles.primaryIconColor.color} />
            </View>
          </View>
          <Text numberOfLines={1} style={styles.cardValue}>
            {formatCurrency(currentNetWorthMinorUnits, currencyCode)}
          </Text>
          <Text style={styles.cardSub}>Latest snapshot</Text>
        </View>

        {/* Card 2: Period Growth */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>PERIOD GROWTH</Text>
            <View
              style={[
                styles.iconWrap,
                isGrowthPositive
                  ? styles.growthPositiveWrap
                  : styles.growthNegativeWrap,
              ]}
            >
              {isGrowthPositive ? (
                <TrendingUp size={14} color={REPORT_COLORS.positiveGreen} />
              ) : (
                <TrendingDown size={14} color={REPORT_COLORS.negativeRed} />
              )}
            </View>
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.cardValue,
              {
                color: isGrowthPositive
                  ? REPORT_COLORS.positiveGreen
                  : REPORT_COLORS.negativeRed,
              },
            ]}
          >
            {formatCurrency(periodChangeMinorUnits, currencyCode, true)}{" "}
            {isGrowthPositive ? "▲" : "▼"}
          </Text>
          <Text style={styles.cardSub}>
            {periodChangePercentage !== null
              ? `${periodChangePercentage >= 0 ? "+" : ""}${periodChangePercentage}% growth`
              : "Baseline"}
          </Text>
        </View>

        {/* Card 3: Peak Net Worth */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>PEAK WEALTH</Text>
            <View style={[styles.iconWrap, styles.peakIconWrap]}>
              <Award size={14} color={styles.peakIconColor.color} />
            </View>
          </View>
          <Text numberOfLines={1} style={styles.cardValue}>
            {formatCurrency(peakNetWorthMinorUnits, currencyCode)}
          </Text>
          <Text style={styles.cardSub}>Highest in period</Text>
        </View>

        {/* Card 4: Lowest Net Worth */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>LOWEST WEALTH</Text>
            <View style={[styles.iconWrap, styles.lowestIconWrap]}>
              <TrendingDown size={14} color={styles.lowestIconColor.color} />
            </View>
          </View>
          <Text numberOfLines={1} style={styles.cardValue}>
            {formatCurrency(lowestNetWorthMinorUnits, currencyCode)}
          </Text>
          <Text style={styles.cardSub}>Lowest in period</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    card: {
      flex: 1,
      minWidth: 140,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    cardLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.6,
      color: theme.colors.textMuted,
      textTransform: "uppercase",
    },
    iconWrap: {
      width: 24,
      height: 24,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    primaryIconWrap: {
      backgroundColor: `${theme.colors.primary}20`,
    },
    growthPositiveWrap: {
      backgroundColor: `${REPORT_COLORS.positiveGreen}20`,
    },
    growthNegativeWrap: {
      backgroundColor: `${REPORT_COLORS.negativeRed}20`,
    },
    peakIconWrap: {
      backgroundColor: `${theme.colors.accent}20`,
    },
    lowestIconWrap: {
      backgroundColor: `${theme.colors.border}60`,
    },
    primaryIconColor: {
      color: theme.colors.primary,
    },
    peakIconColor: {
      color: theme.colors.accent,
    },
    lowestIconColor: {
      color: theme.colors.textSecondary,
    },
    cardValue: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
      marginBottom: 2,
    },
    cardSub: {
      fontSize: 10,
      color: theme.colors.textMuted,
    },
  });
}
