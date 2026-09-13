import { StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountListItem } from "@/modules/accounts/types/account.types";
import { formatOpeningTotal, openingSummary } from "@/modules/accounts/utils/opening-summary";

export function AccountOpeningSummary({ accounts }: { accounts: AccountListItem[] }) {
  const s = useThemeStyles(styles);
  const summary = openingSummary(accounts);
  const netStartingBalance = summary.assets - summary.liabilities;

  return (
    <View style={s.card}>
      <View style={s.topRow}>
        <View>
          <Text style={s.eyebrow}>TOTAL NET BALANCE</Text>
          <Text style={s.totalAmount} accessibilityRole="header">
            {formatOpeningTotal(netStartingBalance)}
          </Text>
        </View>
        <View style={s.activeBadge}>
          <Text style={s.activeBadgeText}>
            {accounts.filter((a) => !a.isArchived).length} Active Accounts
          </Text>
        </View>
      </View>

      <View style={s.metricsRow}>
        <View style={s.metricItem}>
          <View style={s.metricHeader}>
            <View style={[s.indicatorDot, s.assetDot]} />
            <Text style={s.metricLabel}>Total Assets</Text>
          </View>
          <Text style={s.metricAmount}>{formatOpeningTotal(summary.assets)}</Text>
        </View>

        <View style={s.metricDivider} />

        <View style={s.metricItem}>
          <View style={s.metricHeader}>
            <View style={[s.indicatorDot, s.liabilityDot]} />
            <Text style={s.metricLabel}>Total Liabilities</Text>
          </View>
          <Text style={[s.metricAmount, s.liabilityAmount]}>
            {formatOpeningTotal(summary.liabilities)}
          </Text>
        </View>
      </View>

      {summary.excluded > 0 && (
        <Text style={s.excludedNote}>
          {summary.excluded} account(s) excluded from PHP totals because of another currency or data.
        </Text>
      )}
    </View>
  );
}

function styles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
      ...theme.shadows.card,
    },
    topRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    eyebrow: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.8,
      marginBottom: theme.spacing.xs,
    },
    totalAmount: {
      color: theme.colors.textPrimary,
      fontSize: 32,
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: 38,
      fontVariant: ["tabular-nums"],
    },
    activeBadge: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    activeBadgeText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    metricsRow: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      paddingTop: theme.spacing.lg,
    },
    metricItem: {
      flex: 1,
    },
    metricDivider: {
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.lg,
      width: 1,
    },
    metricHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    indicatorDot: {
      borderRadius: 4,
      height: 8,
      width: 8,
    },
    assetDot: {
      backgroundColor: theme.colors.success,
    },
    liabilityDot: {
      backgroundColor: theme.colors.warning,
    },
    metricLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    metricAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      fontVariant: ["tabular-nums"],
    },
    liabilityAmount: {
      color: theme.colors.warning,
    },
    excludedNote: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
    },
  });
}
