import React, { memo } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Calendar,
  CheckCircle,
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
  SquarePen,
  Trash2,
} from "lucide-react-native";

import { IconHelper } from "@/components/icon-helper";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { formatCurrency } from "@/utils/currency";
import { formatPrivacyAmount, usePrivacyMode } from "@/modules/settings";
import type { SubscriptionItem } from "../types/subscription.types";

export interface SubscriptionCardProps {
  subscription: SubscriptionItem;
  onPress?: () => void;
  onEdit?: () => void;
  onMarkPaid?: () => void;
  onToggleStatus?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
}

export const SubscriptionCard = memo(function SubscriptionCard({
  subscription,
  onPress,
  onEdit,
  onMarkPaid,
  onToggleStatus,
  onRestore,
  onDelete,
}: SubscriptionCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { isPrivate } = usePrivacyMode();

  const formattedAmount = formatCurrency(
    subscription.amountMinorUnits,
    subscription.currencyCode,
  );

  const monthlyBurnFormatted = formatCurrency(
    subscription.monthlyBurnRateMinorUnits,
    subscription.currencyCode,
  );

  const displayAmount = formatPrivacyAmount(formattedAmount, isPrivate);
  const displayMonthlyBurn = formatPrivacyAmount(
    monthlyBurnFormatted,
    isPrivate,
  );

  const days = subscription.daysUntilRenewal;
  const isArchived = Boolean(subscription.archivedAt);
  const isTrial = subscription.status === "trial";
  const isPaused = subscription.status === "paused";
  const isCancelled = subscription.status === "cancelled";

  // Countdown label and badge color
  let countdownText = "";
  let badgeStyle = styles.badgeUpcoming;
  let badgeTextStyle = styles.badgeTextUpcoming;

  if (isArchived) {
    countdownText = t("subscriptions.filterArchived", { defaultValue: "Archived" });
    badgeStyle = styles.badgePaused;
    badgeTextStyle = styles.badgeTextPaused;
  } else if (isPaused) {
    countdownText = t("subscriptions.statusPaused", { defaultValue: "Paused" });
    badgeStyle = styles.badgePaused;
    badgeTextStyle = styles.badgeTextPaused;
  } else if (isCancelled) {
    countdownText = t("subscriptions.statusCancelled", {
      defaultValue: "Cancelled",
    });
    badgeStyle = styles.badgeCancelled;
    badgeTextStyle = styles.badgeTextCancelled;
  } else if (isTrial) {
    countdownText =
      days <= 0
        ? t("subscriptions.trialEndsToday", { defaultValue: "Trial ends today" })
        : days === 1
          ? t("subscriptions.trialEndsTomorrow", { defaultValue: "Trial ends tomorrow" })
          : t("subscriptions.trialEndsInDays", {
              count: days,
              defaultValue: `Trial ends in ${days}d`,
            });
    badgeStyle = styles.badgeTrial;
    badgeTextStyle = styles.badgeTextTrial;
  } else if (days < 0) {
    countdownText = t("subscriptions.overdueDays", {
      count: Math.abs(days),
      defaultValue: `${Math.abs(days)}d overdue`,
    });
    badgeStyle = styles.badgeOverdue;
    badgeTextStyle = styles.badgeTextOverdue;
  } else if (days === 0) {
    countdownText = t("subscriptions.dueToday", { defaultValue: "Due today" });
    badgeStyle = styles.badgeDueToday;
    badgeTextStyle = styles.badgeTextDueToday;
  } else if (days === 1) {
    countdownText = t("subscriptions.dueTomorrow", { defaultValue: "Tomorrow" });
    badgeStyle = styles.badgeDueSoon;
    badgeTextStyle = styles.badgeTextDueSoon;
  } else {
    countdownText = t("subscriptions.inDays", {
      count: days,
      defaultValue: `In ${days} days`,
    });
    badgeStyle = styles.badgeUpcoming;
    badgeTextStyle = styles.badgeTextUpcoming;
  }

  const cycleLabel = t(`subscriptions.cycle_${subscription.billingCycle}`, {
    defaultValue:
      subscription.billingCycle === "monthly"
        ? "/ mo"
        : subscription.billingCycle === "yearly"
          ? "/ yr"
          : subscription.billingCycle === "weekly"
            ? "/ wk"
            : `/${subscription.billingCycle}`,
  });

  const handleOpenCancelUrl = () => {
    if (subscription.cancellationUrl) {
      void Linking.openURL(subscription.cancellationUrl);
    }
  };

  const iconName = subscription.icon || subscription.categoryIcon || "repeat";
  const iconBg = subscription.color || theme.colors.primary;

  return (
    <Pressable
      accessibilityLabel={`${subscription.name}, ${formattedAmount} ${cycleLabel}, ${countdownText}`}
      accessibilityRole="button"
      onPress={onPress || onEdit}
      style={({ pressed }) => [
        styles.card,
        (isPaused || isArchived) && styles.cardDimmed,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <IconHelper color="#FFFFFF" name={iconName} size={20} />
        </View>

        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={styles.name}>
              {subscription.name}
            </Text>
            <View style={[styles.badge, badgeStyle]}>
              <Text style={[styles.badgeText, badgeTextStyle]}>
                {countdownText}
              </Text>
            </View>
          </View>

          <View style={styles.subtextRow}>
            {subscription.accountName ? (
              <Text numberOfLines={1} style={styles.metaText}>
                {[subscription.accountName, subscription.pocketName]
                  .filter(Boolean)
                  .join(" • ")}
              </Text>
            ) : null}
            {subscription.accountName && subscription.categoryName ? (
              <Text style={styles.metaDot}>•</Text>
            ) : null}
            {subscription.categoryName ? (
              <Text numberOfLines={1} style={styles.metaText}>
                {subscription.categoryName}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.amountCol}>
          <Text style={styles.amountText}>{displayAmount}</Text>
          <Text style={styles.cycleText}>{cycleLabel}</Text>
          {subscription.billingCycle !== "monthly" && (
            <Text style={styles.normalizedText}>
              ({displayMonthlyBurn}/mo)
            </Text>
          )}
        </View>
      </View>

      {/* Action Row */}
      <View style={styles.actionRow}>
        {isArchived && onRestore && (
          <Pressable
            accessibilityLabel={t("subscriptions.restore", {
              defaultValue: "Restore",
            })}
            accessibilityRole="button"
            hitSlop={6}
            onPress={onRestore}
            style={({ pressed }) => [
              styles.restoreBtn,
              pressed && { opacity: 0.8 },
            ]}
          >
            <RotateCcw color="#FFFFFF" size={12} />
            <Text style={styles.restoreBtnText}>
              {t("subscriptions.restore", { defaultValue: "Restore" })}
            </Text>
          </Pressable>
        )}

        {!isArchived && !isPaused && !isCancelled && onMarkPaid && (
          <Pressable
            accessibilityLabel={t("subscriptions.markPaid", {
              defaultValue: "Mark Paid",
            })}
            accessibilityRole="button"
            hitSlop={6}
            onPress={onMarkPaid}
            style={({ pressed }) => [
              styles.markPaidBtn,
              pressed && { opacity: 0.8 },
            ]}
          >
            <CheckCircle color="#FFFFFF" size={13} />
            <Text style={styles.markPaidBtnText}>
              {t("subscriptions.markPaid", { defaultValue: "Mark Paid" })}
            </Text>
          </Pressable>
        )}

        {subscription.cancellationUrl ? (
          <Pressable
            accessibilityLabel={t("subscriptions.manageOnline", {
              defaultValue: "Manage online",
            })}
            accessibilityRole="button"
            hitSlop={6}
            onPress={handleOpenCancelUrl}
            style={({ pressed }) => [
              styles.linkBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <ExternalLink color={theme.colors.textSecondary} size={13} />
            <Text style={styles.linkBtnText}>
              {t("subscriptions.manageOnline", { defaultValue: "Manage" })}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.spacer} />

        {!isArchived && onToggleStatus && (
          <Pressable
            accessibilityLabel={
              isPaused
                ? t("subscriptions.resume", { defaultValue: "Resume" })
                : t("subscriptions.pause", { defaultValue: "Pause" })
            }
            accessibilityRole="button"
            hitSlop={8}
            onPress={onToggleStatus}
            style={styles.iconActionBtn}
          >
            {isPaused ? (
              <Play color={theme.colors.primary} size={15} />
            ) : (
              <Pause color={theme.colors.textSecondary} size={15} />
            )}
          </Pressable>
        )}

        {onEdit && (
          <Pressable
            accessibilityLabel={t("subscriptions.editSubscription", {
              defaultValue: "Edit",
            })}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onEdit}
            style={styles.iconActionBtn}
          >
            <SquarePen color={theme.colors.textSecondary} size={15} />
          </Pressable>
        )}

        {onDelete && (
          <Pressable
            accessibilityLabel={t("common.delete", { defaultValue: "Delete" })}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onDelete}
            style={styles.iconActionBtn}
          >
            <Trash2 color={theme.colors.danger} size={15} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    cardDimmed: {
      opacity: 0.7,
    },
    cardPressed: {
      opacity: 0.9,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: theme.borderRadius.medium,
      alignItems: "center",
      justifyContent: "center",
    },
    infoCol: {
      flex: 1,
      justifyContent: "center",
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: 2,
    },
    name: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    subtextRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    metaDot: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    amountCol: {
      alignItems: "flex-end",
    },
    amountText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    cycleText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    normalizedText: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      marginTop: 1,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.round,
      marginLeft: 4,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "700",
    },
    badgeUpcoming: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    badgeTextUpcoming: {
      color: theme.colors.textSecondary,
    },
    badgeDueSoon: {
      backgroundColor: "rgba(245, 158, 11, 0.15)",
    },
    badgeTextDueSoon: {
      color: theme.colors.warning,
    },
    badgeDueToday: {
      backgroundColor: "rgba(239, 68, 68, 0.15)",
    },
    badgeTextDueToday: {
      color: theme.colors.danger,
    },
    badgeOverdue: {
      backgroundColor: "rgba(239, 68, 68, 0.2)",
    },
    badgeTextOverdue: {
      color: theme.colors.danger,
    },
    badgeTrial: {
      backgroundColor: "rgba(139, 92, 246, 0.15)",
    },
    badgeTextTrial: {
      color: "#8B5CF6",
    },
    badgePaused: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    badgeTextPaused: {
      color: theme.colors.textSecondary,
    },
    badgeCancelled: {
      backgroundColor: "rgba(107, 114, 128, 0.15)",
    },
    badgeTextCancelled: {
      color: theme.colors.textSecondary,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    markPaidBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.round,
    },
    markPaidBtnText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    restoreBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.colors.success,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.round,
    },
    restoreBtnText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    linkBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 4,
    },
    linkBtnText: {
      fontSize: 11,
      fontWeight: "500",
      color: theme.colors.textSecondary,
    },
    spacer: {
      flex: 1,
    },
    iconActionBtn: {
      padding: 6,
      borderRadius: theme.borderRadius.small,
    },
  });
}
