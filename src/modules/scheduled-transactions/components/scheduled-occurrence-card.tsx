import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, FastForward, RotateCcw, SquarePen } from "lucide-react-native";

import { AppButton } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { Account } from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import { formatCurrency } from "@/utils/currency";
import type {
  ScheduleOccurrence,
  ScheduledTransaction,
} from "../types/scheduled-transaction.types";
import { formatScheduleRecurrence } from "../utils/recurrence";

export interface ScheduledOccurrenceCardProps {
  occurrence: ScheduleOccurrence;
  schedule: ScheduledTransaction;
  sourceAccount?: Account;
  destinationAccount?: Account;
  category?: Category;
  onPost: (occurrence: ScheduleOccurrence) => void;
  onSkip: (occurrenceId: string) => void;
  onEdit?: (schedule: ScheduledTransaction) => void;
  pending?: boolean;
}

export function ScheduledOccurrenceCard({
  occurrence,
  schedule,
  sourceAccount,
  destinationAccount,
  category,
  onPost,
  onSkip,
  onEdit,
  pending = false,
}: ScheduledOccurrenceCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const signedAmount =
    schedule.transactionType === "expense"
      ? -schedule.amountCents
      : schedule.amountCents;

  const isFailed = occurrence.status === "failed";
  const dueDateTime = occurrence.effectiveDueAt ?? occurrence.nominalDueAt;

  return (
    <View style={[styles.card, isFailed && styles.cardFailed]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardMain}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {schedule.name?.trim() ||
                category?.name ||
                (schedule.transactionType === "transfer"
                  ? "Scheduled transfer"
                  : "Scheduled " + schedule.transactionType)}
            </Text>
            <View
              style={[
                styles.statusBadge,
                isFailed ? styles.statusFailed : styles.statusDue,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isFailed ? styles.statusFailedText : styles.statusDueText,
                ]}
              >
                {isFailed ? "Failed" : "Due"}
              </Text>
            </View>
          </View>

          <Text style={styles.cardMeta}>
            {schedule.transactionType === "transfer"
              ? (sourceAccount?.name ?? "Unknown") +
                " → " +
                (destinationAccount?.name ?? "Unknown")
              : (sourceAccount?.name ?? "Unknown") +
                " · " +
                (category?.name ?? "No category")}
          </Text>

          <Text style={styles.cardMeta}>
            {formatScheduleRecurrence(schedule)} ·{" "}
            {schedule.autoPost ? "Auto-post" : "Confirm each"}
          </Text>

          <Text style={[styles.dueText, isFailed && styles.dueTextFailed]}>
            Due: {dueDateTime.toLocaleString()}
          </Text>

          {occurrence.errorMessage ? (
            <Text style={styles.failureText}>{occurrence.errorMessage}</Text>
          ) : null}
        </View>

        <Text
          style={[
            styles.amountText,
            schedule.transactionType === "expense"
              ? styles.amountExpense
              : schedule.transactionType === "income"
                ? styles.amountIncome
                : styles.amountTransfer,
          ]}
        >
          {formatCurrency(
            signedAmount,
            sourceAccount?.currencyCode ?? "PHP",
            schedule.transactionType === "income",
          )}
        </Text>
      </View>

      <View style={styles.cardActions}>
        {onEdit ? (
          <Pressable
            accessibilityLabel="Edit schedule"
            accessibilityRole="button"
            disabled={pending}
            onPress={() => onEdit(schedule)}
            style={styles.iconAction}
          >
            <SquarePen color={theme.colors.textSecondary} size={16} />
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
        ) : null}

        <View style={styles.rightActions}>
          <AppButton
            accessibilityLabel="Skip occurrence"
            disabled={pending}
            label="Skip"
            leading={
              <FastForward color={theme.colors.textSecondary} size={15} />
            }
            onPress={() => onSkip(occurrence.id)}
            size="small"
            variant="secondary"
          />
          <AppButton
            accessibilityLabel={isFailed ? "Retry action" : "Post action"}
            disabled={pending}
            label={isFailed ? "Retry Action" : "Post Action"}
            leading={
              isFailed ? (
                <RotateCcw color={theme.colors.onPrimary} size={15} />
              ) : (
                <Check color={theme.colors.onPrimary} size={15} />
              )
            }
            onPress={() => onPost(occurrence)}
            size="small"
            variant="primary"
          />
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
      borderLeftColor: theme.colors.warning,
      borderLeftWidth: 3,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.md,
      ...theme.shadows.card,
    },
    cardFailed: {
      borderLeftColor: theme.colors.danger,
    },
    cardHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
    },
    cardMain: {
      flex: 1,
      minWidth: 0,
    },
    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "capitalize",
    },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
    },
    statusDue: {
      backgroundColor: theme.colors.warning + "20",
    },
    statusDueText: {
      color: theme.colors.warning,
    },
    statusFailed: {
      backgroundColor: theme.colors.danger + "20",
    },
    statusFailedText: {
      color: theme.colors.danger,
    },
    statusText: {
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: "uppercase",
    },
    cardMeta: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: 20,
      marginTop: 2,
    },
    dueText: {
      color: theme.colors.warning,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      marginTop: theme.spacing.xs,
    },
    dueTextFailed: {
      color: theme.colors.danger,
    },
    failureText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    amountText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    amountExpense: {
      color: theme.colors.danger,
    },
    amountIncome: {
      color: theme.colors.success,
    },
    amountTransfer: {
      color: theme.colors.primary,
    },
    cardActions: {
      alignItems: "center",
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      justifyContent: "space-between",
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    iconAction: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 36,
      paddingHorizontal: theme.spacing.sm,
    },
    actionText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    rightActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginLeft: "auto",
    },
  });
}
