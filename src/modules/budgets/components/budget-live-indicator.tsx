import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import { checkBudgetExceeded } from "../services/check-budget-exceeded.service";

export interface BudgetLiveIndicatorProps {
  categoryId: string;
  amountMinorUnits: number;
  expenseCurrencyCode?: string;
  occurredAt?: Date;
  excludeTransactionId?: string | null;
}

export const BudgetLiveIndicator = memo(function BudgetLiveIndicator({
  categoryId,
  amountMinorUnits,
  expenseCurrencyCode,
  occurredAt,
  excludeTransactionId,
}: BudgetLiveIndicatorProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const result = useMemo(() => {
    if (!categoryId) return null;
    return checkBudgetExceeded({
      categoryId,
      amountMinorUnits: amountMinorUnits,
      expenseCurrencyCode,
      occurredAt,
      excludeTransactionId,
    });
  }, [categoryId, amountMinorUnits, expenseCurrencyCode, occurredAt, excludeTransactionId]);

  if (!result || !result.hasBudget || !result.isEnabled) {
    return null;
  }

  const {
    periodLabel,
    effectiveBudgetCents,
    newSpentCents,
    remainingAfterCents,
    exceeds,
    exceededByCents,
    budgetCurrencyCode,
  } = result;

  const percentage =
    effectiveBudgetCents > 0
      ? Math.round((newSpentCents / effectiveBudgetCents) * 100)
      : 100;

  const isNearLimit = percentage >= 85 && !exceeds;

  const statusColor = exceeds
    ? theme.colors.danger
    : isNearLimit
      ? theme.colors.warning
      : theme.colors.success;

  const statusBg = exceeds
    ? `${theme.colors.danger}15`
    : isNearLimit
      ? `${theme.colors.warning}15`
      : `${theme.colors.success}15`;

  const statusBorder = exceeds
    ? `${theme.colors.danger}40`
    : isNearLimit
      ? `${theme.colors.warning}40`
      : `${theme.colors.success}40`;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: statusBg,
          borderColor: statusBorder,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        {exceeds ? (
          <AlertCircle color={statusColor} size={15} />
        ) : isNearLimit ? (
          <AlertTriangle color={statusColor} size={15} />
        ) : (
          <CheckCircle2 color={statusColor} size={15} />
        )}
      </View>

      <View style={styles.textWrap}>
        <Text numberOfLines={1} style={[styles.mainText, { color: statusColor }]}>
          {exceeds
            ? `Exceeds ${periodLabel} budget by ${formatCurrency(exceededByCents, budgetCurrencyCode, false)}!`
            : isNearLimit
              ? `Near ${periodLabel} limit (${percentage}% used)`
              : `Within ${periodLabel} budget (${percentage}% used)`}
        </Text>
        <Text numberOfLines={1} style={styles.subText}>
          {formatCurrency(newSpentCents, budgetCurrencyCode, false)} of{" "}
          {formatCurrency(effectiveBudgetCents, budgetCurrencyCode, false)} (
          {exceeds
            ? `${formatCurrency(exceededByCents, budgetCurrencyCode, false)} over`
            : `${formatCurrency(remainingAfterCents, budgetCurrencyCode, false)} left`}
          )
        </Text>
      </View>
    </View>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
    },
    iconWrap: {
      alignItems: "center",
      justifyContent: "center",
    },
    textWrap: {
      flex: 1,
    },
    mainText: {
      fontSize: 12,
      fontWeight: "700",
    },
    subText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      marginTop: 1,
    },
  });
}
