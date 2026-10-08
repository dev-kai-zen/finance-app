import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRightLeft, Paperclip } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useCurrencyPreferences } from "@/modules/currencies";
import { formatCurrency } from "@/utils/currency";
import { LabelBadge } from "@/modules/labels";
import type { TransactionListItem } from "../types/transaction.types";

export interface TransactionRowProps {
  transaction: TransactionListItem;
  onPress?: (tx: TransactionListItem) => void;
  onDelete?: (id: string) => void;
  viewMode?: "compact" | "detailed";
}

const SHORT_MONTHS = [
  "Jan.",
  "Feb.",
  "Mar.",
  "Apr.",
  "May",
  "Jun.",
  "Jul.",
  "Aug.",
  "Sep.",
  "Oct.",
  "Nov.",
  "Dec.",
] as const;

function formatTransactionDateTime(date: Date) {
  const formattedDate = `${SHORT_MONTHS[date.getMonth()]} ${String(
    date.getDate(),
  ).padStart(2, "0")}, ${date.getFullYear()}`;
  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  });

  return `${formattedDate} | ${formattedTime}`;
}

function formatLocationRoute(
  accountTypeName: string | null,
  accountName: string | null,
  pocketName: string | null,
  pocketEnabled = false,
) {
  const pocketSegment = pocketEnabled ? (pocketName ?? "Available") : pocketName;
  return [
    accountTypeName || "Account",
    accountName || "Unknown Account",
    pocketSegment,
  ]
    .filter(Boolean)
    .join(" > ");
}

function formatCompactLocation(
  accountName: string | null,
  pocketName: string | null,
  pocketEnabled = false,
) {
  const effectivePocket = pocketName ?? (pocketEnabled ? "Available" : null);
  const accName = accountName?.trim() || "Account";
  if (effectivePocket) {
    return `${accName} · ${effectivePocket} (Pockets)`;
  }
  return accName;
}

function withAlpha(color: string, alpha: number) {
  if (/^#[\da-f]{6}$/i.test(color)) {
    return `${color}${Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
  }

  return color;
}

export function TransactionRow({
  transaction,
  onPress,
  viewMode = "compact",
}: TransactionRowProps) {
  const theme = useAppTheme();
  const { preferences } = useCurrencyPreferences();
  const styles = useThemeStyles(createStyles);
  const isCompact = viewMode === "compact";

  const isIncome = transaction.type === "income";
  const isTransfer = transaction.type === "transfer";
  const isPocketTransfer =
    isTransfer && transaction.accountId === transaction.transferAccountId;
  const typeColor = isTransfer
    ? theme.colors.info
    : isIncome
      ? theme.colors.success
      : theme.colors.danger;
  const displayAmountCents = isTransfer
    ? Math.abs(transaction.amountMinorUnits)
    : transaction.amountMinorUnits;
  const amountColor = !preferences.colorAmounts
    ? theme.colors.textPrimary
    : isTransfer
    ? theme.colors.info
    : displayAmountCents < 0
      ? theme.colors.danger
      : displayAmountCents > 0
        ? theme.colors.success
        : theme.colors.textMuted;

  const title =
    transaction.name ||
    transaction.note ||
    (isTransfer
      ? isPocketTransfer
        ? `Move to ${transaction.transferPocketName ?? "Available"}`
        : `Transfer to ${transaction.transferAccountName ?? "Account"}`
      : transaction.categoryName || "Transaction");

  const formattedAmount = isTransfer
    ? formatCurrency(
        Math.abs(transaction.amountMinorUnits),
        transaction.accountCurrency ?? "PHP",
        false,
      )
    : formatCurrency(
        displayAmountCents,
        transaction.accountCurrency ?? "PHP",
        false,
      );

  const sourceBalance = formatCurrency(
    transaction.locationBalanceAfterMinorUnits ??
      transaction.accountBalanceAfterMinorUnits ??
      0,
    transaction.accountCurrency ?? "PHP",
    false,
  );

  if (isCompact) {
    const compactLocation = formatCompactLocation(
      transaction.accountName,
      transaction.pocketName,
      transaction.accountPocketEnabled,
    );
    const compactDestLocation = isTransfer
      ? formatCompactLocation(
          transaction.transferAccountName,
          transaction.transferPocketName,
          transaction.transferAccountPocketEnabled ?? false,
        )
      : "";
    const compactCategory = transaction.categoryName || "Uncategorized";
    const compactMeta = isTransfer
      ? `${compactLocation} → ${compactDestLocation}`
      : `${compactCategory}  ·  ${compactLocation}`;

    return (
      <Pressable
        accessibilityLabel={`${title}, ${formattedAmount}${transaction.attachmentCount > 0 ? `, ${transaction.attachmentCount} attachments` : ""}`}
        accessibilityRole="button"
        onPress={() => onPress?.(transaction)}
        style={({ pressed }) => [
          styles.compactCard,
          { borderColor: withAlpha(typeColor, 0.55) },
          pressed && styles.txCardPressed,
        ]}
      >
        <View style={styles.compactRow}>
          <View style={styles.compactLeftCol}>
            <View style={styles.compactTitleRow}>
              <Text numberOfLines={1} style={styles.compactTitleText}>
                {title}
              </Text>
              {transaction.attachmentCount > 0 ? (
                <View style={styles.compactAttachmentBadge}>
                  <Paperclip color={theme.colors.primary} size={11} />
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.compactMetaText}>
              {compactMeta}
            </Text>
          </View>

          <View style={styles.compactRightCol}>
            <Text
              numberOfLines={1}
              style={[styles.compactAmountText, { color: amountColor }]}
            >
              {formattedAmount}
            </Text>
            <Text numberOfLines={1} style={styles.compactBalanceText}>
              {sourceBalance}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  const formattedDateTime = transaction.occurredAt
    ? formatTransactionDateTime(new Date(transaction.occurredAt))
    : "";
  const sourceRoute = formatLocationRoute(
    transaction.accountTypeName,
    transaction.accountName,
    transaction.pocketName,
    transaction.accountPocketEnabled,
  );
  const destinationRoute = formatLocationRoute(
    transaction.transferAccountTypeName,
    transaction.transferAccountName,
    transaction.transferPocketName,
    transaction.transferAccountPocketEnabled ?? false,
  );
  const destinationBalance = formatCurrency(
    transaction.destinationLocationBalanceAfterMinorUnits ?? 0,
    transaction.transferAccountCurrency ??
      transaction.accountCurrency ??
      "PHP",
    false,
  );

  return (
    <Pressable
      accessibilityLabel={`${title}, ${formattedAmount}${transaction.attachmentCount > 0 ? `, ${transaction.attachmentCount} attachments` : ""}`}
      accessibilityRole="button"
      onPress={() => onPress?.(transaction)}
      style={({ pressed }) => [
        styles.txCard,
        { borderColor: withAlpha(typeColor, 0.55) },
        pressed && styles.txCardPressed,
      ]}
    >
      <View style={styles.line}>
        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={styles.txNameText}>
            {title}
          </Text>
          {transaction.attachmentCount > 0 ? (
            <View
              accessibilityLabel={`${transaction.attachmentCount} attachments`}
              style={styles.attachmentBadge}
            >
              <Paperclip color={theme.colors.primary} size={13} />
              <Text style={styles.attachmentCount}>
                {transaction.attachmentCount > 99
                  ? "99+"
                  : transaction.attachmentCount}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={[styles.amountText, { color: amountColor }]}
        >
          {formattedAmount}
        </Text>
      </View>

      {isTransfer ? (
        <>
          <View style={styles.detailLine}>
            <Text numberOfLines={2} style={styles.detailLeft}>
              {sourceRoute}
            </Text>
            <Text style={styles.detailRight}>{formattedDateTime}</Text>
          </View>
          <View style={styles.detailLine}>
            <ArrowRightLeft color={theme.colors.info} size={15} />
            <Text style={styles.balanceText}>
              Source Bal: {sourceBalance}
            </Text>
          </View>
          <View style={styles.detailLine}>
            <Text numberOfLines={2} style={styles.detailLeft}>
              {destinationRoute}
            </Text>
            <Text style={styles.balanceText}>
              Dest Bal: {destinationBalance}
            </Text>
          </View>
          {transaction.transferFeeAmountMinorUnits ? (
            <View style={styles.detailLine}>
              <View style={styles.feeBadge}>
                <Text style={styles.feeBadgeText}>
                  Fee: {formatCurrency(transaction.transferFeeAmountMinorUnits, transaction.accountCurrency ?? "PHP", false)}
                </Text>
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.detailLine}>
            <Text numberOfLines={1} style={styles.detailLeft}>
              {transaction.categoryName || "Uncategorized"}
            </Text>
            <Text style={styles.detailRight}>{formattedDateTime}</Text>
          </View>
          <View style={styles.detailLine}>
            <Text numberOfLines={2} style={styles.detailLeft}>
              {sourceRoute}
            </Text>
            <Text style={styles.balanceText}>Bal: {sourceBalance}</Text>
          </View>
        </>
      )}

      {transaction.note && transaction.name ? (
        <Text numberOfLines={2} style={styles.txNoteText}>
          {transaction.note}
        </Text>
      ) : null}

      {transaction.labels && transaction.labels.length > 0 ? (
        <View style={styles.labelsRow}>
          {transaction.labels.map((lbl) => (
            <LabelBadge key={lbl.id} label={lbl} size="sm" />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    labelsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
      marginTop: 2,
    },
    txCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1.5,
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      ...theme.shadows.card,
    },
    compactCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1.5,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      ...theme.shadows.card,
    },
    compactRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
    },
    compactLeftCol: {
      flex: 1,
      gap: 2,
      justifyContent: "center",
    },
    compactTitleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    compactTitleText: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: theme.typography.lineHeight.sm,
    },
    compactAttachmentBadge: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 2,
    },
    compactMetaText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      lineHeight: theme.typography.lineHeight.xs,
    },
    compactRightCol: {
      alignItems: "flex-end",
      flexShrink: 0,
      gap: 2,
      justifyContent: "center",
    },
    compactAmountText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
      lineHeight: theme.typography.lineHeight.sm,
      textAlign: "right",
    },
    compactBalanceText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      fontVariant: ["tabular-nums"],
      lineHeight: theme.typography.lineHeight.xs,
      textAlign: "right",
    },
    txCardPressed: {
      backgroundColor: theme.colors.surfaceMuted,
      opacity: 0.9,
    },
    line: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
    },
    txNameText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: theme.typography.lineHeight.md,
    },
    titleRow: {
      alignItems: "flex-start",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    attachmentBadge: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}12`,
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: 2,
      minHeight: 22,
      paddingHorizontal: 6,
    },
    attachmentCount: {
      color: theme.colors.primary,
      fontSize: 10,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.bold,
    },
    amountText: {
      flexShrink: 1,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
      textAlign: "right",
    },
    detailLine: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
    },
    detailLeft: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      lineHeight: theme.typography.lineHeight.xs,
    },
    detailRight: {
      color: theme.colors.textSecondary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: "right",
    },
    balanceText: {
      color: theme.colors.textSecondary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "right",
    },
    feeBadge: {
      alignSelf: "flex-start",
      backgroundColor: `${theme.colors.danger}14`,
      borderColor: `${theme.colors.danger}30`,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      marginTop: 2,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    feeBadgeText: {
      color: theme.colors.danger,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.semibold,
      fontVariant: ["tabular-nums"],
    },
    txNoteText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
      lineHeight: theme.typography.lineHeight.xs,
      marginTop: theme.spacing.xxs,
    },
  });
}
