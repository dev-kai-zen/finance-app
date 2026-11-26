import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, FastForward, RotateCcw, SquarePen } from "lucide-react-native";

import { AppButton } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { Account } from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import { useLocalization } from "@/infrastructure/localization";
import { formatCurrency } from "@/utils/currency";
import type {
  ScheduleOccurrence,
  ScheduledTransaction,
} from "../types/scheduled-transaction.types";
import {
  scheduleAccountLine,
  scheduleCardTitle,
} from "../utils/schedule-card-copy";
import { formatScheduleRecurrence } from "../utils/format-schedule-recurrence";

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
  cardRef?: React.Ref<View>;
  skipRef?: React.Ref<View>;
  postRef?: React.Ref<View>;
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
  cardRef,
  skipRef,
  postRef,
}: ScheduledOccurrenceCardProps) {
  const theme = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemeStyles(createStyles);

  const isTransfer = schedule.transactionType === "transfer";
  const signedAmount = isTransfer
    ? Math.abs(schedule.amountMinorUnits)
    : schedule.amountMinorUnits;

  const isFailed = occurrence.status === "failed";
  const dueDateTime = occurrence.effectiveDueAt ?? occurrence.nominalDueAt;

  return (
    <View
      ref={cardRef}
      collapsable={false}
      style={[styles.card, isFailed && styles.cardFailed]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardMain}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {scheduleCardTitle(schedule, category, t)}
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
                {isFailed
                  ? t("scheduledTransactions.occurrence.failed")
                  : t("scheduledTransactions.occurrence.due")}
              </Text>
            </View>
          </View>

          <Text style={styles.cardMeta}>
            {scheduleAccountLine(
              schedule,
              sourceAccount,
              destinationAccount,
              category,
              t,
            )}
          </Text>

          <Text style={styles.cardMeta}>
            {formatScheduleRecurrence(schedule, t)} ·{" "}
            {schedule.autoPost
              ? t("scheduledTransactions.postingMode.autoPost")
              : t("scheduledTransactions.postingMode.confirmEach")}
          </Text>

          <Text style={[styles.dueText, isFailed && styles.dueTextFailed]}>
            {t("scheduledTransactions.occurrence.dueOn", {
              date: dueDateTime.toLocaleString(),
            })}
          </Text>

          {occurrence.errorMessage ? (
            <Text style={styles.failureText}>{occurrence.errorMessage}</Text>
          ) : null}
        </View>

        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          numberOfLines={1}
          style={[
            styles.amountText,
            isTransfer
              ? styles.amountTransfer
              : signedAmount > 0
                ? styles.amountIncome
                : styles.amountExpense,
          ]}
        >
          {formatCurrency(
            signedAmount,
            sourceAccount?.currencyCode ?? "PHP",
            signedAmount > 0 && !isTransfer,
          )}
        </Text>
      </View>

      <View style={styles.cardActions}>
        {onEdit ? (
          <Pressable
            accessibilityLabel={t(
              "scheduledTransactions.occurrence.editAccessibility",
            )}
            accessibilityRole="button"
            disabled={pending}
            onPress={() => onEdit(schedule)}
            style={styles.iconAction}
          >
            <SquarePen color={theme.colors.textSecondary} size={16} />
            <Text style={styles.actionText}>
              {t("scheduledTransactions.occurrence.edit")}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.rightActions}>
          <AppButton
            accessibilityLabel={t(
              "scheduledTransactions.occurrence.skipAccessibility",
            )}
            buttonRef={skipRef}
            disabled={pending}
            label={t("scheduledTransactions.occurrence.skip")}
            leading={
              <FastForward color={theme.colors.textSecondary} size={15} />
            }
            onPress={() => onSkip(occurrence.id)}
            size="small"
            variant="secondary"
          />
          <AppButton
            accessibilityLabel={
              isFailed
                ? t("scheduledTransactions.occurrence.retryAccessibility")
                : t("scheduledTransactions.occurrence.postAccessibility")
            }
            buttonRef={postRef}
            disabled={pending}
            label={
              isFailed
                ? t("scheduledTransactions.occurrence.retryAction")
                : t("scheduledTransactions.occurrence.postAction")
            }
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
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      justifyContent: "flex-end",
      marginLeft: "auto",
    },
  });
}
