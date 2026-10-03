import { memo } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { AlertCircle, AlertTriangle, RotateCw } from "lucide-react-native";
import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type { BudgetStatus } from "../types/budget.types";

export interface BudgetCardProps {
  status: BudgetStatus;
  onPress: () => void;
  onToggle: (isEnabled: boolean) => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  semi_monthly: "Semi-Monthly",
  monthly: "Monthly",
  custom_monthly: "Custom Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export const BudgetCard = memo(function BudgetCard({
  status,
  onPress,
  onToggle,
}: BudgetCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const resolveEntityColor = useResolveEntityColor();

  const {
    budget,
    category,
    periodLabel,
    effectiveTargetCents,
    spentCents,
    remainingCents,
    percentage,
    isExceeded,
    isNearLimit,
    rolloverCents,
  } = status;

  const categoryColor =
    resolveEntityColor(category.hexColorsId) ||
    category.color ||
    theme.colors.primary;

  const statusColor = !budget.isEnabled
    ? theme.colors.textSecondary
    : isExceeded
      ? theme.colors.danger
      : isNearLimit
        ? theme.colors.warning
        : theme.colors.success;

  const clampedProgress = Math.min(percentage, 100);

  return (
    <Pressable
      accessibilityLabel={`${category.name} budget`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !budget.isEnabled && styles.cardDisabled,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.categoryInfo}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${categoryColor}20` },
            ]}
          >
            <IconHelper
              color={categoryColor}
              name={category.icon || "tag"}
              size={20}
            />
          </View>
          <View style={styles.titleColumn}>
            <Text numberOfLines={1} style={styles.categoryName}>
              {category.name}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.frequencyBadge}>
                <Text style={styles.frequencyText}>
                  {FREQUENCY_LABELS[budget.frequency] || budget.frequency}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.periodText}>
                {periodLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.toggleContainer}>
          <Switch
            accessibilityLabel={`Toggle ${category.name} budget`}
            onValueChange={onToggle}
            thumbColor={
              budget.isEnabled
                ? theme.colors.onPrimary
                : theme.colors.textSecondary
            }
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            value={budget.isEnabled}
          />
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${clampedProgress}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>
      </View>

      {/* Amounts and Status Row */}
      <View style={styles.metricsRow}>
        <View style={styles.spentGroup}>
          <Text style={styles.metricLabel}>Spent</Text>
          <Text style={[styles.spentValue, { color: statusColor }]}>
            {formatCurrency(spentCents, "PHP", false)}
          </Text>
        </View>

        <View style={styles.targetGroup}>
          <Text style={styles.metricLabel}>Budget</Text>
          <Text style={styles.targetValue}>
            {formatCurrency(effectiveTargetCents, "PHP", false)}
          </Text>
        </View>

        <View style={styles.remainingGroup}>
          <Text style={styles.metricLabel}>
            {isExceeded ? "Over by" : "Remaining"}
          </Text>
          <Text
            style={[
              styles.remainingValue,
              {
                color: isExceeded
                  ? theme.colors.danger
                  : theme.colors.textPrimary,
              },
            ]}
          >
            {formatCurrency(Math.abs(remainingCents), "PHP", false)}
          </Text>
        </View>
      </View>

      {/* Rollover or Exceeded indicator Footer */}
      {(budget.allowRollover || isExceeded) && (
        <View style={styles.footerRow}>
          {isExceeded ? (
            <View style={styles.warningPill}>
              <AlertCircle color={theme.colors.danger} size={14} />
              <Text style={styles.warningPillText}>
                Budget exceeded by {formatCurrency(Math.abs(remainingCents), "PHP", false)} ({percentage}%)
              </Text>
            </View>
          ) : budget.allowRollover && rolloverCents !== 0 ? (
            <View style={styles.rolloverPill}>
              <RotateCw color={theme.colors.textSecondary} size={12} />
              <Text style={styles.rolloverPillText}>
                {rolloverCents > 0
                  ? `+${formatCurrency(rolloverCents, "PHP", false)} rolled over from last period`
                  : `${formatCurrency(rolloverCents, "PHP", false)} deficit carried forward`}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    cardDisabled: {
      opacity: 0.6,
    },
    cardPressed: {
      opacity: 0.9,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    categoryInfo: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
    },
    iconContainer: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      height: 40,
      justifyContent: "center",
      marginRight: theme.spacing.md,
      width: 40,
    },
    titleColumn: {
      flex: 1,
    },
    categoryName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 2,
    },
    badgeRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    frequencyBadge: {
      backgroundColor: `${theme.colors.primary}18`,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    frequencyText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    periodText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    toggleContainer: {
      marginLeft: theme.spacing.sm,
    },
    progressContainer: {
      marginVertical: theme.spacing.sm,
    },
    progressBarBackground: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 8,
      overflow: "hidden",
      width: "100%",
    },
    progressBarFill: {
      borderRadius: theme.borderRadius.round,
      height: "100%",
    },
    metricsRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.xs,
    },
    spentGroup: {
      alignItems: "flex-start",
    },
    targetGroup: {
      alignItems: "center",
    },
    remainingGroup: {
      alignItems: "flex-end",
    },
    metricLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "600",
      marginBottom: 2,
      textTransform: "uppercase",
    },
    spentValue: {
      fontSize: 14,
      fontWeight: "700",
    },
    targetValue: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    remainingValue: {
      fontSize: 14,
      fontWeight: "700",
    },
    footerRow: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    warningPill: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    warningPillText: {
      color: theme.colors.danger,
      fontSize: 12,
      fontWeight: "600",
    },
    rolloverPill: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    rolloverPillText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
  });
}
