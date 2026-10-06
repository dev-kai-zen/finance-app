import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CheckCircle2, Target, TrendingUp } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import type { GoalSummaryStats } from "../types/goal.types";

export interface GoalSummaryHeaderProps {
  summary: GoalSummaryStats;
  currencyCode?: string;
}

export function GoalSummaryHeader({
  summary,
  currencyCode = "PHP",
}: GoalSummaryHeaderProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const {
    totalTargetMinorUnits,
    totalSavedMinorUnits,
    overallProgressPercentage,
    activeGoalsCount,
    completedGoalsCount,
    totalGoalsCount,
  } = summary;

  const remaining = Math.max(0, totalTargetMinorUnits - totalSavedMinorUnits);
  const clampedProgress = Math.min(100, Math.max(0, overallProgressPercentage));

  return (
    <View style={styles.container}>
      {/* Main Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroSubheading}>TOTAL TARGET</Text>
            <Text style={styles.heroTargetAmount}>
              {formatCurrency(totalTargetMinorUnits, currencyCode)}
            </Text>
          </View>
          <View style={styles.percentageBadge}>
            <TrendingUp color={theme.colors.primary} size={16} />
            <Text style={styles.percentageText}>{clampedProgress}%</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${clampedProgress}%`,
                backgroundColor:
                  clampedProgress >= 100
                    ? theme.colors.success
                    : theme.colors.primary,
              },
            ]}
          />
        </View>

        {/* Saved & Remaining Stats */}
        <View style={styles.heroBottomRow}>
          <View>
            <Text style={styles.statLabel}>Saved so far</Text>
            <Text style={styles.statValueSaved}>
              {formatCurrency(totalSavedMinorUnits, currencyCode)}
            </Text>
          </View>
          <View style={styles.alignRight}>
            <Text style={styles.statLabel}>Remaining shortfall</Text>
            <Text style={styles.statValueRemaining}>
              {formatCurrency(remaining, currencyCode)}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Stat Counter Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statMiniCard}>
          <View
            style={[
              styles.miniIconWrapper,
              { backgroundColor: `${theme.colors.primary}18` },
            ]}
          >
            <Target color={theme.colors.primary} size={18} />
          </View>
          <View style={styles.miniTextWrapper}>
            <Text style={styles.miniCount}>{activeGoalsCount}</Text>
            <Text style={styles.miniLabel}>In Progress</Text>
          </View>
        </View>

        <View style={styles.statMiniCard}>
          <View
            style={[
              styles.miniIconWrapper,
              { backgroundColor: `${theme.colors.success}18` },
            ]}
          >
            <CheckCircle2 color={theme.colors.success} size={18} />
          </View>
          <View style={styles.miniTextWrapper}>
            <Text style={styles.miniCount}>{completedGoalsCount}</Text>
            <Text style={styles.miniLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.statMiniCard}>
          <View
            style={[
              styles.miniIconWrapper,
              { backgroundColor: `${theme.colors.textSecondary}18` },
            ]}
          >
            <TrendingUp color={theme.colors.textSecondary} size={18} />
          </View>
          <View style={styles.miniTextWrapper}>
            <Text style={styles.miniCount}>{totalGoalsCount}</Text>
            <Text style={styles.miniLabel}>Total Goals</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    heroCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: theme.spacing.md,
    },
    heroSubheading: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 2,
    },
    heroTargetAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    percentageBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: `${theme.colors.primary}15`,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.round,
    },
    percentageText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    progressTrack: {
      height: 10,
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.borderRadius.round,
      overflow: "hidden",
      marginBottom: theme.spacing.md,
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.borderRadius.round,
    },
    heroBottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: theme.spacing.xs,
    },
    statLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginBottom: 2,
    },
    statValueSaved: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    statValueRemaining: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    alignRight: {
      alignItems: "flex-end",
    },
    statsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    statMiniCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    miniIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.small,
      alignItems: "center",
      justifyContent: "center",
    },
    miniTextWrapper: {
      flex: 1,
    },
    miniCount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    miniLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
}
