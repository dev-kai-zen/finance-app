import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRightLeft } from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency, formatPhpCurrency } from "@/utils/currency";
import type { TransactionListItem } from "../types/transaction.types";

export interface TransactionRowProps {
  transaction: TransactionListItem;
  onPress?: (tx: TransactionListItem) => void;
  onDelete?: (id: string) => void;
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

function withAlpha(color: string, alpha: number) {
  if (/^#[\da-f]{6}$/i.test(color)) {
    return `${color}${Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
  }

  return color;
}

export function TransactionRow({ transaction, onPress }: TransactionRowProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

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
    ? Math.abs(transaction.amountCents)
    : transaction.amountCents;
  const amountColor = isTransfer
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
        Math.abs(transaction.amountCents),
        transaction.accountCurrency ?? "PHP",
        false,
      )
    : formatPhpCurrency(displayAmountCents, {
        showPositiveSign: false,
        positiveColor: theme.colors.success,
        negativeColor: theme.colors.danger,
        zeroColor: theme.colors.textMuted,
      }).formatted;

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
  const sourceBalance = formatCurrency(
    transaction.locationBalanceAfterMinorUnits ?? 0,
    transaction.accountCurrency ?? "PHP",
    false,
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
      accessibilityLabel={`${title}, ${formattedAmount}`}
      accessibilityRole="button"
      onPress={() => onPress?.(transaction)}
      style={({ pressed }) => [
        styles.txCard,
        { borderColor: withAlpha(typeColor, 0.55) },
        pressed && styles.txCardPressed,
      ]}
    >
      <View style={styles.line}>
        <Text numberOfLines={2} style={styles.txNameText}>
          {title}
        </Text>
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
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    txCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1.5,
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      ...theme.shadows.card,
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
    txNoteText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
      lineHeight: theme.typography.lineHeight.xs,
      marginTop: theme.spacing.xxs,
    },
  });
}
