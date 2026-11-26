import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Calendar, Flame, Sparkles } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { formatCurrency } from "@/utils/currency";
import { formatPrivacyAmount, usePrivacyMode } from "@/modules/settings";
import type { SubscriptionBurnRateSummary } from "../types/subscription.types";

export interface SubscriptionBurnRateSummaryProps {
  summary: SubscriptionBurnRateSummary;
  cardRef?: React.Ref<View>;
}

export const SubscriptionBurnRateSummaryCard = memo(
  function SubscriptionBurnRateSummaryCard({
    summary,
    cardRef,
  }: SubscriptionBurnRateSummaryProps) {
    const theme = useAppTheme();
    const styles = useThemeStyles(createStyles);
    const { t } = useLocalization();
    const { isPrivate } = usePrivacyMode();

    const monthlyFormatted = formatCurrency(
      summary.totalMonthlyBurnRateMinorUnits,
      summary.currencyCode,
    );

    const yearlyFormatted = formatCurrency(
      summary.totalYearlyProjectedMinorUnits,
      summary.currencyCode,
    );

    const displayMonthly = formatPrivacyAmount(monthlyFormatted, isPrivate);
    const displayYearly = formatPrivacyAmount(yearlyFormatted, isPrivate);

    return (
      <View ref={cardRef} collapsable={false} style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleWithIcon}>
            <View style={styles.flameIconContainer}>
              <Flame color="#F59E0B" size={18} />
            </View>
            <Text numberOfLines={1} style={styles.title}>
              {t("subscriptions.monthlyBurnRate", {
                defaultValue: "Monthly Burn Rate",
              })}
            </Text>
          </View>
          <View style={styles.activePill}>
            <Text numberOfLines={1} style={styles.activePillText}>
              {t("subscriptions.activeCount", {
                count: summary.activeCount,
                defaultValue: `${summary.activeCount} Active`,
              })}
            </Text>
          </View>
        </View>

        <View style={styles.amountContainer}>
          <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={styles.mainAmount}>{displayMonthly}</Text>
          <Text style={styles.perMonthLabel}>
            {t("subscriptions.perMonth", { defaultValue: "/ month" })}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.footerRow}>
          <View style={styles.statColumn}>
            <Text numberOfLines={1} style={styles.statLabel}>
              {t("subscriptions.yearlyProjected", {
                defaultValue: "Yearly Projection",
              })}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              numberOfLines={1}
              style={styles.statValue}
            >
              {displayYearly}
            </Text>
          </View>

          {summary.upcomingCount7Days > 0 ? (
            <View style={styles.alertChip}>
              <Calendar color={theme.colors.primary} size={13} />
              <Text numberOfLines={1} style={styles.alertChipText}>
                {t("subscriptions.dueIn7Days", {
                  count: summary.upcomingCount7Days,
                  defaultValue: `${summary.upcomingCount7Days} due this week`,
                })}
              </Text>
            </View>
          ) : summary.trialCount > 0 ? (
            <View style={styles.trialChip}>
              <Sparkles color="#8B5CF6" size={13} />
              <Text numberOfLines={1} style={styles.trialChipText}>
                {t("subscriptions.trialsActive", {
                  count: summary.trialCount,
                  defaultValue: `${summary.trialCount} on Trial`,
                })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  },
);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      elevation: 2,
    },
    headerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    titleWithIcon: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flex: 1,
      minWidth: 140,
    },
    flameIconContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(245, 158, 11, 0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
    activePill: {
      backgroundColor: "rgba(34, 197, 94, 0.12)",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
      borderRadius: theme.borderRadius.round,
      flexShrink: 0,
    },
    activePillText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#16A34A",
    },
    amountContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "baseline",
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    mainAmount: {
      fontSize: 32,
      fontWeight: "800",
      color: theme.colors.textPrimary,
      letterSpacing: -0.5,
      maxWidth: "100%",
    },
    perMonthLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.sm,
    },
    footerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    statColumn: {
      flexDirection: "column",
      flexShrink: 1,
      minWidth: 100,
    },
    statLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    alertChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.round,
      flexShrink: 0,
      maxWidth: "60%",
    },
    alertChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
      flexShrink: 1,
    },
    trialChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(139, 92, 246, 0.12)",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.round,
      flexShrink: 0,
      maxWidth: "60%",
    },
    trialChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#8B5CF6",
      flexShrink: 1,
    },
  });
}
