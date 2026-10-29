import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { useCurrencyPreferences } from "@/modules/currencies";
import { formatCurrency } from "@/utils/currency";
import type { MonthlyCashflow } from "../types/dashboard.types";

export interface DashboardCashflowCardProps {
  cashflow: MonthlyCashflow;
  currencyCode?: string;
  onPressReports?: () => void;
  onPressIncome?: () => void;
  onPressExpense?: () => void;
}

export function DashboardCashflowCard({
  cashflow,
  currencyCode = "PHP",
  onPressReports,
  onPressIncome,
  onPressExpense,
}: DashboardCashflowCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { preferences } = useCurrencyPreferences();

  const inflow = cashflow.totalInflowMinorUnits;
  const outflow = cashflow.totalOutflowMinorUnits;
  const net = cashflow.netSavingsMinorUnits;
  const isNetPositive = net >= 0;

  const totalVolume = inflow + outflow;
  const inflowShare =
    totalVolume > 0 ? Math.max(8, Math.round((inflow / totalVolume) * 100)) : 50;
  const outflowShare =
    totalVolume > 0 ? Math.max(8, 100 - inflowShare) : 50;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{t("dashboard.cashflowCardTitle")}</Text>
          <Text style={styles.subtitle}>{cashflow.monthLabel}</Text>
        </View>

        {inflow > 0 ? (
          <View style={styles.savingsPill}>
            <Sparkles color={theme.colors.primary} size={12} />
            <Text style={styles.savingsPillText}>
              {t("dashboard.savingsRateBadge", {
                rate: cashflow.savingsRatePercentage,
              })}
            </Text>
          </View>
        ) : onPressReports ? (
          <Pressable
            accessibilityRole="button"
            onPress={onPressReports}
            style={({ pressed }) => [
              styles.reportsLink,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.reportsLinkText}>
              {t("navigation.reports")}
            </Text>
            <ArrowRight color={theme.colors.primary} size={14} />
          </Pressable>
        ) : null}
      </View>

      {/* Net Cashflow Hero Row */}
      <View style={styles.netRow}>
        <Text style={styles.netLabel}>{t("dashboard.netCashflowLabel")}</Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          numberOfLines={1}
          style={[
            styles.netValue,
            preferences.colorAmounts &&
              (isNetPositive ? styles.positiveText : styles.negativeText),
          ]}
        >
          {formatCurrency(net, currencyCode, true)}
        </Text>
      </View>

      {/* Visual Split Bar */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barSegmentInflow,
            {
              flex: totalVolume > 0 ? inflowShare : 1,
              backgroundColor: theme.colors.success,
            },
          ]}
        />
        <View
          style={[
            styles.barSegmentOutflow,
            {
              flex: totalVolume > 0 ? outflowShare : 1,
              backgroundColor: theme.colors.danger,
            },
          ]}
        />
      </View>

      {/* Inflow vs Outflow Boxes */}
      <View style={styles.metricsRow}>
        <Pressable
          accessibilityRole="button"
          disabled={!onPressIncome}
          onPress={onPressIncome}
          style={({ pressed }) => [
            styles.metricBox,
            pressed && onPressIncome && styles.pressed,
          ]}
        >
          <View style={styles.metricHeader}>
            <View
              style={[
                styles.metricIconBadge,
                { backgroundColor: `${theme.colors.success}18` },
              ]}
            >
              <ArrowDownLeft color={theme.colors.success} size={14} />
            </View>
            <Text style={styles.metricLabel}>
              {t("dashboard.cashflowIncome")}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[
              styles.metricAmount,
              preferences.colorAmounts && styles.positiveText,
            ]}
          >
            {formatCurrency(inflow, currencyCode)}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={!onPressExpense}
          onPress={onPressExpense}
          style={({ pressed }) => [
            styles.metricBox,
            pressed && onPressExpense && styles.pressed,
          ]}
        >
          <View style={styles.metricHeader}>
            <View
              style={[
                styles.metricIconBadge,
                { backgroundColor: `${theme.colors.danger}18` },
              ]}
            >
              <ArrowUpRight color={theme.colors.danger} size={14} />
            </View>
            <Text style={styles.metricLabel}>
              {t("dashboard.cashflowExpenses")}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[
              styles.metricAmount,
              preferences.colorAmounts && styles.negativeText,
            ]}
          >
            {formatCurrency(outflow, currencyCode)}
          </Text>
        </Pressable>
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
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
    },
    titleWrap: {
      minWidth: 0,
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.2,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    savingsPill: {
      flexShrink: 0,
      alignItems: "center",
      backgroundColor: theme.colors.controlSecondary,
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    savingsPillText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    reportsLink: {
      flexShrink: 0,
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    reportsLinkText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    netRow: {
      alignItems: "baseline",
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    netLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    netValue: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.bold,
    },
    barTrack: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: 3,
      height: 8,
      overflow: "hidden",
    },
    barSegmentInflow: {
      borderRadius: theme.borderRadius.round,
      height: "100%",
    },
    barSegmentOutflow: {
      borderRadius: theme.borderRadius.round,
      height: "100%",
    },
    metricsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    metricBox: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      gap: 6,
      padding: theme.spacing.sm,
    },
    metricHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    metricIconBadge: {
      alignItems: "center",
      borderRadius: 6,
      height: 22,
      justifyContent: "center",
      width: 22,
    },
    metricLabel: {
      flex: 1,
      minWidth: 0,
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    metricAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.bold,
    },
    positiveText: {
      color: theme.colors.success,
    },
    negativeText: {
      color: theme.colors.danger,
    },
    pressed: {
      opacity: 0.75,
    },
  });
}

