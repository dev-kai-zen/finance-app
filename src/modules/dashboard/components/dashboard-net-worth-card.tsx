import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { NetWorthChart } from "@/modules/dashboard/components/net-worth-chart";
import type {
  NetWorthHistory,
  NetWorthPeriod,
} from "@/modules/dashboard/types/dashboard.types";
import { formatCurrency } from "@/utils/currency";

const PERIODS: NetWorthPeriod[] = ["1M", "3M", "6M", "1Y"];

export interface DashboardNetWorthCardProps {
  netWorthMinorUnits: number;
  totalAssetsMinorUnits: number;
  totalLiabilitiesMinorUnits: number;
  history: NetWorthHistory;
  monthlyChangePercentage: number | null;
  currencyCode?: string;
}

export function DashboardNetWorthCard({
  netWorthMinorUnits,
  totalAssetsMinorUnits,
  totalLiabilitiesMinorUnits,
  history,
  monthlyChangePercentage,
  currencyCode = "PHP",
}: DashboardNetWorthCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { preferences } = useCurrencyPreferences();
  const isPositive = netWorthMinorUnits >= 0;
  const [period, setPeriod] = useState<NetWorthPeriod>("6M");
  const [valuesVisible, setValuesVisible] = useState(true);
  const [chartVisible, setChartVisible] = useState(true);
  const trendIsPositive = (monthlyChangePercentage ?? 0) >= 0;
  const TrendIcon = trendIsPositive ? TrendingUp : TrendingDown;
  const privateValue = "••••••";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.label}>Net Worth</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel={
              chartVisible ? "Hide net worth chart" : "Show net worth chart"
            }
            accessibilityRole="button"
            hitSlop={5}
            onPress={() => setChartVisible((current) => !current)}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.buttonPressed,
            ]}
          >
            {chartVisible ? (
              <ChevronUp color={theme.colors.textSecondary} size={20} />
            ) : (
              <ChevronDown color={theme.colors.textSecondary} size={20} />
            )}
          </Pressable>
          <Pressable
            accessibilityLabel={valuesVisible ? "Hide net worth values" : "Show net worth values"}
            accessibilityRole="button"
            hitSlop={5}
            onPress={() => setValuesVisible((current) => !current)}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.buttonPressed,
            ]}
          >
            {valuesVisible ? (
              <Eye color={theme.colors.textSecondary} size={20} />
            ) : (
              <EyeOff color={theme.colors.textSecondary} size={20} />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={1}
          selectable
          style={[
            styles.netWorthValue,
            preferences.colorAmounts && !isPositive && styles.netWorthValueNegative,
          ]}
        >
          {valuesVisible
            ? formatCurrency(netWorthMinorUnits, currencyCode)
            : privateValue}
        </Text>
        <View
          style={[
            styles.trendPill,
            !trendIsPositive && styles.trendPillNegative,
          ]}
        >
          <TrendIcon
            color={trendIsPositive ? theme.colors.success : theme.colors.danger}
            size={14}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.trendText,
              !trendIsPositive && styles.trendTextNegative,
            ]}
          >
            {!valuesVisible
              ? "Hidden"
              : monthlyChangePercentage === null
                ? "No prior month"
                : `${monthlyChangePercentage >= 0 ? "+" : ""}${monthlyChangePercentage}%`}
          </Text>
        </View>
      </View>
      {chartVisible ? (
        <>
          <View style={styles.periodSelector}>
            {PERIODS.map((option) => {
              const selected = option === period;
              return (
                <Pressable
                  key={option}
                  accessibilityLabel={`Show ${option} net worth history`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setPeriod(option)}
                  style={({ pressed }) => [
                    styles.periodButton,
                    selected && styles.periodButtonSelected,
                    pressed && !selected && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodText,
                      selected && styles.periodTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <NetWorthChart
            points={history[period]}
            valuesVisible={valuesVisible}
          />
        </>
      ) : null}

      <View style={styles.breakdownRow}>
        <View style={[styles.breakdownCard, styles.assetCard]}>
          <View style={styles.breakdownLabelRow}>
            <View style={[styles.breakdownDot, styles.assetDot]} />
            <Text style={styles.breakdownLabel}>Total assets</Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            selectable={valuesVisible}
            style={[
              styles.breakdownValue,
              preferences.colorAmounts && styles.assetValue,
            ]}
          >
            {valuesVisible
              ? formatCurrency(totalAssetsMinorUnits, currencyCode)
              : privateValue}
          </Text>
        </View>

        <View style={[styles.breakdownCard, styles.liabilityCard]}>
          <View style={styles.breakdownLabelRow}>
            <View style={[styles.breakdownDot, styles.liabilityDot]} />
            <Text style={styles.breakdownLabel}>Liabilities</Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            selectable={valuesVisible}
            style={[
              styles.breakdownValue,
              preferences.colorAmounts && styles.liabilityValue,
            ]}
          >
            {valuesVisible
              ? formatCurrency(totalLiabilitiesMinorUnits, currencyCode)
              : privateValue}
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
      gap: theme.spacing.md,
      justifyContent: "space-between",
    },
    titleGroup: {
      alignItems: "center",
      flexDirection: "row",
      flexShrink: 1,
    },
    label: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.2,
    },
    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    buttonPressed: {
      opacity: 0.65,
    },
    summaryRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
      marginTop: theme.spacing.md,
    },
    netWorthValue: {
      color: theme.colors.success,
      flex: 1,
      fontSize: theme.typography.fontSize.title,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
      letterSpacing: -0.5,
      minWidth: 0,
    },
    netWorthValueNegative: {
      color: theme.colors.danger,
    },
    trendPill: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: `${theme.colors.success}18`,
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: theme.spacing.xs,
      flexShrink: 0,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    trendPillNegative: {
      backgroundColor: `${theme.colors.danger}18`,
    },
    trendText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    trendTextNegative: {
      color: theme.colors.danger,
    },
    periodSelector: {
      alignSelf: "flex-end",
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      marginTop: theme.spacing.md,
      overflow: "hidden",
      padding: theme.spacing.xxs,
    },
    periodButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      justifyContent: "center",
      minHeight: 30,
      minWidth: 40,
      paddingHorizontal: theme.spacing.xs,
    },
    periodButtonSelected: {
      backgroundColor: theme.colors.primary,
    },
    periodText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    periodTextSelected: {
      color: theme.colors.onPrimary,
    },
    breakdownRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    breakdownCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.medium,
      borderLeftWidth: 3,
      flex: 1,
      minWidth: 0,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    assetCard: {
      borderLeftColor: theme.colors.success,
    },
    liabilityCard: {
      borderLeftColor: theme.colors.danger,
    },
    breakdownLabelRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    breakdownDot: {
      borderRadius: 4,
      height: 8,
      width: 8,
    },
    assetDot: {
      backgroundColor: theme.colors.success,
    },
    liabilityDot: {
      backgroundColor: theme.colors.danger,
    },
    breakdownLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    breakdownValue: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
      marginTop: theme.spacing.xs,
    },
    assetValue: {
      color: theme.colors.success,
    },
    liabilityValue: {
      color: theme.colors.danger,
    },
  });
}
