import { memo, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { formatCurrency } from "@/utils/currency";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";
import {
  evaluateBudgetSnapshot,
  getBudgetLiveSnapshot,
  type BudgetLiveSnapshot,
} from "../services/check-budget-exceeded.service";

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
  const { t, locale } = useLocalization();
  const occurredAtMs = occurredAt ? occurredAt.getTime() : null;

  const [snapshot, setSnapshot] = useState<BudgetLiveSnapshot | null>(null);

  useEffect(() => {
    if (!categoryId) {
      setSnapshot(null);
      return;
    }

    const cancel = scheduleAfterPaint(() => {
      const liveSnapshot = getBudgetLiveSnapshot({
        categoryId,
        expenseCurrencyCode,
        occurredAt: occurredAtMs !== null ? new Date(occurredAtMs) : undefined,
        excludeTransactionId,
        language: locale,
      });
      setSnapshot(liveSnapshot);
    });

    return cancel;
  }, [categoryId, expenseCurrencyCode, occurredAtMs, excludeTransactionId, locale]);

  const result = useMemo(() => {
    if (!snapshot) return null;
    return evaluateBudgetSnapshot(snapshot, amountMinorUnits);
  }, [snapshot, amountMinorUnits]);

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
      : null;

  const isNearLimit = percentage !== null && percentage >= 85 && !exceeds;

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
            ? t("budgets.live.exceeds", {
                period: periodLabel,
                amount: formatCurrency(exceededByCents, budgetCurrencyCode, false),
              })
            : isNearLimit
              ? t("budgets.live.nearLimit", {
                  period: periodLabel,
                  percentage,
                })
              : percentage !== null
                ? t("budgets.live.within", {
                    period: periodLabel,
                    percentage,
                  })
                : t("budgets.live.withinNoPercent", {
                    period: periodLabel,
                  })}
        </Text>
        <Text numberOfLines={1} style={styles.subText}>
          {t("budgets.live.spentOf", {
            spent: formatCurrency(newSpentCents, budgetCurrencyCode, false),
            budget: formatCurrency(effectiveBudgetCents, budgetCurrencyCode, false),
            status: exceeds
              ? t("budgets.live.over", {
                  amount: formatCurrency(exceededByCents, budgetCurrencyCode, false),
                })
              : t("budgets.live.left", {
                  amount: formatCurrency(remainingAfterCents, budgetCurrencyCode, false),
                }),
          })}
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
