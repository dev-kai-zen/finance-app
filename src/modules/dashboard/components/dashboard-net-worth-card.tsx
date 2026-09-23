import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
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
          <View style={styles.titleIcon}>
            <Sparkles color={theme.colors.primary} size={18} />
          </View>
          <Text style={styles.label}>TOTAL NET WORTH</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel={
              chartVisible ? "Hide net worth chart" : "Show net worth chart"
            }
            accessibilityRole="button"
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

      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        numberOfLines={1}
        selectable
        style={[
          styles.netWorthValue,
          !isPositive && styles.netWorthValueNegative,
        ]}
      >
        {valuesVisible
          ? formatCurrency(netWorthMinorUnits, currencyCode)
          : privateValue}
      </Text>
      {chartVisible ? (
        <>
          <View
            style={[
              styles.trendPill,
              !trendIsPositive && styles.trendPillNegative,
            ]}
          >
            <TrendIcon
              color={
                trendIsPositive
                  ? theme.colors.success
                  : theme.colors.danger
              }
              size={15}
            />
            <Text
              style={[
                styles.trendText,
                !trendIsPositive && styles.trendTextNegative,
              ]}
            >
              {!valuesVisible
                ? "Hidden"
                : monthlyChangePercentage === null
                  ? "No prior month"
                  : `${monthlyChangePercentage >= 0 ? "+" : ""}${monthlyChangePercentage}% vs last mo`}
            </Text>
          </View>

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
            style={[styles.breakdownValue, styles.assetValue]}
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
            style={[styles.breakdownValue, styles.liabilityValue]}
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
      padding: theme.spacing.xl,
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
      gap: theme.spacing.sm,
    },
    titleIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: theme.borderRadius.medium,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.7,
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
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    buttonPressed: {
      opacity: 0.65,
    },
    netWorthValue: {
      color: theme.colors.success,
      fontSize: 40,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
      letterSpacing: -1,
      marginTop: theme.spacing.lg,
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
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
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
      marginTop: theme.spacing.xl,
      overflow: "hidden",
      padding: 3,
    },
    periodButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      justifyContent: "center",
      minHeight: 36,
      minWidth: 46,
      paddingHorizontal: theme.spacing.sm,
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
      flexWrap: "wrap",
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
    },
    breakdownCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.medium,
      borderLeftWidth: 4,
      flex: 1,
      minWidth: 150,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
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
      fontSize: theme.typography.fontSize.lg,
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
