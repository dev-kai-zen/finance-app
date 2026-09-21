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
  const borderColor = withAlpha(typeColor, 0.55);
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
        ? `Move to ${transaction.transferPocketName ?? "Main"}`
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

  const occurredAt = transaction.occurredAt
    ? new Date(transaction.occurredAt)
    : null;
  const formattedDateTime = occurredAt
    ? `${occurredAt.getFullYear()}-${String(occurredAt.getMonth() + 1).padStart(2, "0")}-${String(occurredAt.getDate()).padStart(2, "0")} | ${occurredAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })}`
    : "";

  const routeOrCategory = isTransfer
    ? `${transaction.accountName ?? "Account"} → ${transaction.transferAccountName ?? "Destination"}`
    : `${transaction.categoryName || "Uncategorized"} • ${transaction.accountName ?? "Account"}`;

  const accountRoute = `${transaction.accountTypeName} > ${
    transaction.accountName ?? "Account"
  }`;
  const destinationRoute = `${transaction.transferAccountTypeName ?? "Account"} > ${
    transaction.transferAccountName ?? "Destination"
  }`;
  const sourceTransferRoute = isPocketTransfer
    ? transaction.pocketName ?? "Main"
    : accountRoute;
  const destinationTransferRoute = isPocketTransfer
    ? transaction.transferPocketName ?? "Main"
    : destinationRoute;
  const formattedRoute = `${transaction.categoryName || "Uncategorized"} \u00b7 ${accountRoute}`;

  const balanceAfterMinorUnits = isTransfer
    ? transaction.destinationBalanceAfterMinorUnits
    : transaction.accountBalanceAfterMinorUnits;
  const balanceCurrency = isTransfer
    ? (transaction.transferAccountCurrency ??
      transaction.accountCurrency ??
      "PHP")
    : (transaction.accountCurrency ?? "PHP");
  const balanceText =
    balanceAfterMinorUnits === null
      ? null
      : `${isTransfer && !isPocketTransfer ? "Dest. Bal:" : "Bal:"} ${formatCurrency(
          balanceAfterMinorUnits,
          balanceCurrency,
          false,
        )}`;

  return (
    <Pressable
      accessibilityLabel={`${title}, ${formattedAmount}`}
      accessibilityRole="button"
      onPress={() => onPress?.(transaction)}
      style={({ pressed }) => [
        styles.txCard,
        { borderColor },
        pressed && styles.txCardPressed,
      ]}
    >
      <View style={styles.txHeaderRow}>
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

      <View style={styles.txDetailsRow}>
        <View style={styles.routeColumn}>
          {isTransfer ? (
            <View style={styles.transferRouteRow}>
              <Text style={styles.transferRouteText}>
                {sourceTransferRoute}
              </Text>
              <ArrowRightLeft color={theme.colors.info} size={14} />
              <Text style={styles.transferRouteText}>
                {destinationTransferRoute}
              </Text>
            </View>
          ) : (
            <Text style={styles.routeCategoryText}>{formattedRoute}</Text>
          )}
          {transaction.note && transaction.name ? (
            <Text numberOfLines={2} style={styles.txNoteText}>
              {transaction.note}
            </Text>
          ) : null}
        </View>
        <View style={styles.timeColumn}>
          <Text style={styles.txTimeText}>{formattedDateTime}</Text>
          {balanceText ? (
            <Text style={styles.balanceText}>{balanceText}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    txCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1.5,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      ...theme.shadows.card,
    },
    txCardPressed: {
      backgroundColor: theme.colors.surfaceMuted,
      opacity: 0.9,
    },
    txHeaderRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
    },
    txNameText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: theme.typography.lineHeight.lg,
    },
    amountText: {
      flexShrink: 1,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
      textAlign: "right",
    },
    txDetailsRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
      marginTop: theme.spacing.sm,
    },
    routeColumn: {
      flex: 1,
    },
    transferRouteRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    transferRouteText: {
      color: theme.colors.textSecondary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.medium,
      lineHeight: theme.typography.lineHeight.md,
    },
    routeCategoryText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.medium,
      lineHeight: theme.typography.lineHeight.md,
    },
    txTimeText: {
      color: theme.colors.textSecondary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: "right",
    },
    timeColumn: {
      alignItems: "flex-end",
      flexShrink: 1,
    },
    balanceText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing.xs,
      textAlign: "right",
    },
    txNoteText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      fontStyle: "italic",
      lineHeight: theme.typography.lineHeight.sm,
      marginTop: theme.spacing.xs,
    },
  });
}

function withAlpha(color: string, alpha: number) {
  if (/^#[\da-f]{6}$/i.test(color)) {
    return `${color}${Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
  }

  return color;
}
