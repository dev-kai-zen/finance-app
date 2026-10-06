import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Landmark,
  MoreVertical,
  Pencil,
  RotateCcw,
  Sparkles,
  Trash2,
  WalletCards,
} from "lucide-react-native";
import { IconHelper } from "@/components/icon-helper";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type { GoalStatus, GoalWithProgress } from "../types/goal.types";

export interface GoalCardProps {
  goal: GoalWithProgress;
  onPress: () => void;
  onEdit: () => void;
  onToggleStatus: (status: GoalStatus) => void;
  onDelete: () => void;
}

export const GoalCard = memo(function GoalCard({
  goal,
  onPress,
  onEdit,
  onToggleStatus,
  onDelete,
}: GoalCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const resolveEntityColor = useResolveEntityColor();

  const entityColor =
    (goal.hexColorsId ? resolveEntityColor(goal.hexColorsId) : null) ||
    theme.colors.primary;

  const clampedProgress = Math.min(100, Math.max(0, goal.progressPercentage));
  const isCompleted = goal.isCompleted || goal.status === "completed";

  const statusColor = isCompleted
    ? theme.colors.success
    : goal.status === "paused"
      ? theme.colors.textMuted
      : theme.colors.primary;

  return (
    <Pressable
      accessibilityLabel={`Goal ${goal.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        goal.status === "paused" && styles.cardPaused,
        isCompleted && styles.cardCompleted,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: `${entityColor}1E` },
            ]}
          >
            <IconHelper
              color={entityColor}
              name={goal.iconKey || "target"}
              size={20}
            />
          </View>
          <View style={styles.titleTextWrapper}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.goalName}>
                {goal.name}
              </Text>
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Sparkles color={theme.colors.success} size={12} />
                  <Text style={styles.completedBadgeText}>Reached!</Text>
                </View>
              )}
            </View>

            {/* Linked Account(s) & Pocket(s) Chip */}
            {(() => {
              const hasAccounts =
                goal.linkedAccounts && goal.linkedAccounts.length > 0;
              const hasPockets =
                goal.linkedPockets && goal.linkedPockets.length > 0;

              if (hasAccounts && hasPockets) {
                return (
                  <View style={styles.accountChip}>
                    <Landmark color={theme.colors.textSecondary} size={12} />
                    <Text numberOfLines={1} style={styles.accountChipText}>
                      {goal.linkedAccounts.length}{" "}
                      {goal.linkedAccounts.length === 1 ? "account" : "accounts"},{" "}
                      {goal.linkedPockets.length}{" "}
                      {goal.linkedPockets.length === 1 ? "pocket" : "pockets"}
                    </Text>
                  </View>
                );
              }

              if (hasAccounts) {
                return (
                  <View style={styles.accountChip}>
                    <Landmark color={theme.colors.textSecondary} size={12} />
                    <Text numberOfLines={1} style={styles.accountChipText}>
                      {goal.linkedAccounts.length === 1
                        ? goal.linkedAccounts[0].name
                        : `${goal.linkedAccounts.length} accounts: ${goal.linkedAccounts.map((a) => a.name).join(", ")}`}
                    </Text>
                  </View>
                );
              }

              if (hasPockets) {
                return (
                  <View style={styles.accountChip}>
                    <WalletCards color={theme.colors.info} size={12} />
                    <Text numberOfLines={1} style={styles.accountChipText}>
                      {goal.linkedPockets.length === 1
                        ? `${goal.linkedPockets[0].name}${goal.linkedPockets[0].accountName ? ` (${goal.linkedPockets[0].accountName})` : ""}`
                        : `${goal.linkedPockets.length} pockets: ${goal.linkedPockets.map((p) => p.name).join(", ")}`}
                    </Text>
                  </View>
                );
              }

              return <Text style={styles.unlinkedText}>No linked funds</Text>;
            })()}
          </View>
        </View>

        {/* Quick Edit / Actions */}
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Edit goal"
            hitSlop={8}
            onPress={onEdit}
            style={styles.iconButton}
          >
            <Pencil color={theme.colors.textSecondary} size={16} />
          </Pressable>
          <Pressable
            accessibilityLabel="Delete goal"
            hitSlop={8}
            onPress={onDelete}
            style={styles.iconButton}
          >
            <Trash2 color={theme.colors.danger} size={16} />
          </Pressable>
        </View>
      </View>

      {/* Progress Bar & Amount Row */}
      <View style={styles.progressSection}>
        <View style={styles.amountRow}>
          <View>
            <Text style={styles.savedLabel}>Current Balance</Text>
            <Text
              style={[
                styles.savedAmount,
                isCompleted && { color: theme.colors.success },
              ]}
            >
              {formatCurrency(goal.currentAmountMinorUnits, goal.currencyCode)}
            </Text>
          </View>
          <View style={styles.targetCol}>
            <Text style={styles.targetLabel}>Target</Text>
            <Text style={styles.targetAmount}>
              {formatCurrency(goal.targetAmountMinorUnits, goal.currencyCode)}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${clampedProgress}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>

        <View style={styles.progressMetaRow}>
          <Text style={styles.progressPercentageText}>
            {clampedProgress}% completed
          </Text>
          {!isCompleted && (
            <Text style={styles.remainingText}>
              {formatCurrency(goal.remainingMinorUnits, goal.currencyCode)} to go
            </Text>
          )}
        </View>
      </View>

      {/* Target Date & Savings Pace Guidance */}
      {goal.targetDate && (
        <View style={styles.footerGuidance}>
          <View style={styles.dateRow}>
            {goal.isPastDeadline ? (
              <View style={styles.deadlineWarning}>
                <AlertTriangle color={theme.colors.danger} size={14} />
                <Text style={styles.deadlineWarningText}>
                  Past target date: {goal.targetDate.toLocaleDateString()}
                </Text>
              </View>
            ) : (
              <View style={styles.deadlineNumber}>
                <Calendar color={theme.colors.textSecondary} size={14} />
                <Text style={styles.deadlineText}>
                  Target: {goal.targetDate.toLocaleDateString()} (
                  {goal.daysRemaining} days left)
                </Text>
              </View>
            )}
          </View>

          {/* Monthly Pace */}
          {!isCompleted &&
            goal.pacePerMonthMinorUnits != null &&
            goal.pacePerMonthMinorUnits > 0 &&
            !goal.isPastDeadline && (
              <View style={styles.pacePill}>
                <Text style={styles.pacePillText}>
                  💡 Save{" "}
                  {formatCurrency(
                    goal.pacePerMonthMinorUnits,
                    goal.currencyCode,
                  )}
                  /mo to reach on time
                </Text>
              </View>
            )}
        </View>
      )}

      {/* Goal Note Preview */}
      {goal.note ? (
        <Text numberOfLines={2} style={styles.notePreview}>
          {goal.note}
        </Text>
      ) : null}

      {/* Bottom Status Toggle */}
      <View style={styles.bottomBar}>
        {isCompleted ? (
          <Pressable
            onPress={() => onToggleStatus("in_progress")}
            style={styles.reopenButton}
          >
            <RotateCcw color={theme.colors.textSecondary} size={14} />
            <Text style={styles.reopenButtonText}>Mark as In Progress</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => onToggleStatus("completed")}
            style={styles.completeButton}
          >
            <Check color={theme.colors.success} size={14} />
            <Text style={styles.completeButtonText}>Mark as Completed</Text>
          </Pressable>
        )}

        <View style={styles.statusPill}>
          <Text
            style={[
              styles.statusPillText,
              { color: statusColor },
            ]}
          >
            {isCompleted
              ? "Completed"
              : goal.status === "paused"
                ? "Paused"
                : "Active"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    cardPaused: {
      opacity: 0.75,
    },
    cardCompleted: {
      borderColor: `${theme.colors.success}40`,
    },
    cardPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.995 }],
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: theme.spacing.md,
    },
    titleGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      flex: 1,
    },
    iconWrapper: {
      width: 42,
      height: 42,
      borderRadius: theme.borderRadius.medium,
      alignItems: "center",
      justifyContent: "center",
    },
    titleTextWrapper: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    goalName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      flexShrink: 1,
    },
    completedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: `${theme.colors.success}18`,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.round,
    },
    completedBadgeText: {
      color: theme.colors.success,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
    },
    accountChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 3,
    },
    accountChipText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    unlinkedText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
      marginTop: 2,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    iconButton: {
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.small,
    },
    progressSection: {
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    amountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: theme.spacing.sm,
    },
    savedLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    savedAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    targetCol: {
      alignItems: "flex-end",
    },
    targetLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    targetAmount: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    progressTrack: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      overflow: "hidden",
      marginBottom: theme.spacing.xs,
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.borderRadius.round,
    },
    progressMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    progressPercentageText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    remainingText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    footerGuidance: {
      marginTop: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    deadlineNumber: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    deadlineText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    deadlineWarning: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    deadlineWarningText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    pacePill: {
      backgroundColor: `${theme.colors.primary}12`,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.small,
      alignSelf: "flex-start",
    },
    pacePillText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    notePreview: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
      marginTop: theme.spacing.xs,
    },
    bottomBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    completeButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
    },
    completeButtonText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    reopenButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
    },
    reopenButtonText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.surfaceElevated,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
}
