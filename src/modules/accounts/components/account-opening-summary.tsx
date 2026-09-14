import { StyleSheet, Text, View } from "react-native";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import {
  AccountAmountText,
  bigintToSafeNumber,
} from "@/modules/accounts/components/account-amount-text";
import type { AccountListItem } from "@/modules/accounts/types/account.types";
import { formatOpeningTotal, openingSummary } from "@/modules/accounts/utils/opening-summary";

export function AccountOpeningSummary({
  accounts,
}: {
  accounts: AccountListItem[];
}) {
  const s = useThemeStyles(styles);
  const summary = openingSummary(accounts);
  const netWorth = summary.assets - summary.liabilities;
  const netWorthNumber = bigintToSafeNumber(netWorth);
  const assetsNumber = bigintToSafeNumber(summary.assets);
  const liabilitiesNumber = bigintToSafeNumber(summary.liabilities);

  return (
    <View style={s.card}>
      <View>
        <Text style={s.eyebrow}>TOTAL NET WORTH</Text>
        {netWorthNumber !== null ? (
          <AccountAmountText
            accessibilityRole="header"
            amountMinorUnits={netWorthNumber}
            variant="hero"
          />
        ) : (
          <Text style={s.fallbackTotal}>{formatOpeningTotal(netWorth)}</Text>
        )}
      </View>

      <View style={s.metricsRow}>
        <View style={s.metricItem}>
          <Text style={s.metricLabel}>ASSETS</Text>
          {assetsNumber !== null ? (
            <AccountAmountText amountMinorUnits={assetsNumber} variant="title" />
          ) : (
            <Text style={s.fallbackMetric}>{formatOpeningTotal(summary.assets)}</Text>
          )}
        </View>

        <View style={s.metricDivider} />

        <View style={s.metricItem}>
          <Text style={s.metricLabel}>LIABILITIES</Text>
          {liabilitiesNumber !== null ? (
            <AccountAmountText
              amountMinorUnits={liabilitiesNumber}
              variant="title"
            />
          ) : (
            <Text style={s.fallbackMetric}>
              {formatOpeningTotal(summary.liabilities)}
            </Text>
          )}
        </View>
      </View>

      {summary.excluded > 0 ? (
        <Text style={s.excludedNote}>
          {summary.excluded} account(s) excluded from PHP totals because of
          another currency or data.
        </Text>
      ) : null}
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
      gap: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
      padding: theme.spacing.xl,
      ...theme.shadows.card,
    },
    eyebrow: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.8,
      marginBottom: theme.spacing.xs,
    },
    fallbackTotal: {
      color: theme.colors.textPrimary,
      fontSize: 32,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
    },
    metricsRow: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      paddingTop: theme.spacing.lg,
    },
    metricItem: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    metricDivider: {
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.lg,
      width: 1,
    },
    metricLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.6,
    },
    fallbackMetric: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      fontVariant: ["tabular-nums"],
    },
    excludedNote: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
    },
  });
}
