import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Wallet,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import { REPORT_COLORS } from "../../constants/reports.constants";

interface CashFlowSummaryCardsProps {
  totalInflowMinorUnits: number;
  totalOutflowMinorUnits: number;
  netCashFlowMinorUnits: number;
  savingsRatePercentage: number;
}

export function CashFlowSummaryCards({
  totalInflowMinorUnits,
  totalOutflowMinorUnits,
  netCashFlowMinorUnits,
  savingsRatePercentage,
}: CashFlowSummaryCardsProps) {
  const styles = useThemeStyles(createStyles);
  const isNetPositive = netCashFlowMinorUnits >= 0;

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {/* Card 1: Total Inflow */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>TOTAL INFLOW</Text>
            <View style={[styles.iconWrap, styles.inflowIconWrap]}>
              <ArrowDownRight size={14} color={REPORT_COLORS.positiveGreen} />
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.cardValue, styles.inflowValue]}>
            +{formatCurrency(totalInflowMinorUnits, "PHP")}
          </Text>
          <Text style={styles.cardSub}>Money in</Text>
        </View>

        {/* Card 2: Total Outflow */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>TOTAL OUTFLOW</Text>
            <View style={[styles.iconWrap, styles.outflowIconWrap]}>
              <ArrowUpRight size={14} color={REPORT_COLORS.negativeRed} />
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.cardValue, styles.outflowValue]}>
            -{formatCurrency(totalOutflowMinorUnits, "PHP")}
          </Text>
          <Text style={styles.cardSub}>Money out</Text>
        </View>

        {/* Card 3: Net Cash Flow */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>NET CASH FLOW</Text>
            <View style={[styles.iconWrap, styles.netIconWrap]}>
              <Wallet size={14} color={styles.netIconColor.color} />
            </View>
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.cardValue,
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
          <Text style={styles.cardSub}>
            {isNetPositive ? "Net savings" : "Net deficit"}
          </Text>
        </View>

        {/* Card 4: Savings Rate */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>SAVINGS RATE</Text>
            <View style={[styles.iconWrap, styles.savingsIconWrap]}>
              <PiggyBank size={14} color={styles.savingsIconColor.color} />
            </View>
          </View>
          <Text numberOfLines={1} style={styles.cardValue}>
            {savingsRatePercentage}%
          </Text>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, Math.max(0, savingsRatePercentage))}%`,
                  backgroundColor:
                    savingsRatePercentage >= 20
                      ? REPORT_COLORS.positiveGreen
                      : savingsRatePercentage > 0
                      ? styles.savingsIconColor.color
                      : REPORT_COLORS.negativeRed,
                },
              ]}
            />
          </View>
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
    inflowIconWrap: {
      backgroundColor: `${REPORT_COLORS.positiveGreen}20`,
    },
    outflowIconWrap: {
      backgroundColor: `${REPORT_COLORS.negativeRed}20`,
    },
    netIconWrap: {
      backgroundColor: `${theme.colors.primary}20`,
    },
    savingsIconWrap: {
      backgroundColor: `${theme.colors.accent}20`,
    },
    netIconColor: {
      color: theme.colors.primary,
    },
    savingsIconColor: {
      color: theme.colors.accent,
    },
    cardValue: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      fontVariant: ["tabular-nums"],
      marginBottom: 2,
    },
    inflowValue: {
      color: REPORT_COLORS.positiveGreen,
    },
    outflowValue: {
      color: REPORT_COLORS.negativeRed,
    },
    cardSub: {
      fontSize: 10,
      color: theme.colors.textMuted,
    },
    progressBarTrack: {
      height: 4,
      backgroundColor: `${theme.colors.border}80`,
      borderRadius: 2,
      overflow: "hidden",
      marginTop: 4,
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 2,
    },
  });
}
