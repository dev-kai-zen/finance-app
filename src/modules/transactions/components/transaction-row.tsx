import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency, formatPhpCurrency } from "@/utils/currency";
import type { TransactionListItem } from "../types/transaction.types";

export interface TransactionRowProps {
  transaction: TransactionListItem;
  onPress?: (tx: TransactionListItem) => void;
  onDelete?: (id: string) => void;
}

export function TransactionRow({
  transaction,
  onPress,
  onDelete,
}: TransactionRowProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const isIncome = transaction.type === "income";
  const isTransfer = transaction.type === "transfer";
  const isPositive = transaction.amountCents > 0;

  const categoricalColor =
    transaction.categoryColor && transaction.categoryColor in theme.colors.categorical
      ? theme.colors.categorical[
          transaction.categoryColor as keyof AppTheme["colors"]["categorical"]
        ]
      : isIncome
        ? theme.colors.success
        : isTransfer
          ? theme.colors.info
          : theme.colors.danger;

  const iconName = isTransfer
    ? "arrow-left-right"
    : transaction.categoryIcon || (isIncome ? "arrow-down-left" : "shopping-cart");

  const formattedDate = transaction.occurredAt
    ? new Date(transaction.occurredAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "";

  const formattedTime = transaction.occurredAt
    ? new Date(transaction.occurredAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const title =
    transaction.name ||
    transaction.note ||
    (isTransfer
      ? `Transfer to ${transaction.transferAccountName ?? "Account"}`
      : transaction.categoryName || "Transaction");

  const phpResult = formatPhpCurrency(transaction.amountCents, {
    showPositiveSign: true,
    positiveColor: theme.colors.success,
    negativeColor: theme.colors.danger,
    zeroColor: theme.colors.textMuted,
  });

  const formattedAmount = isTransfer
    ? formatCurrency(
        Math.abs(transaction.amountCents),
        transaction.accountCurrency ?? "PHP",
        false,
      )
    : phpResult.formatted;

  const amountColor = isTransfer ? theme.colors.info : phpResult.color;

  const routeOrCategory = isTransfer
    ? `${transaction.accountName ?? "Account"} → ${transaction.transferAccountName ?? "Destination"}`
    : `${transaction.categoryName || "Uncategorized"} • ${transaction.accountName ?? "Account"}`;

  return (
    <Pressable
      accessibilityLabel={`${title}, ${formattedAmount}`}
      accessibilityRole="button"
      onPress={() => onPress && onPress(transaction)}
      style={({ pressed }) => [
        styles.txCard,
        pressed && styles.txCardPressed,
      ]}
    >
      {/* Row 1: Icon + Title & Amount (Kaizen Design) */}
      <View style={styles.txMainRow}>
        <View style={styles.txTitleGroup}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: `${categoricalColor}20`,
                borderColor: `${categoricalColor}45`,
              },
            ]}
          >
            <IconHelper color={categoricalColor} name={iconName} size={16} />
          </View>
          <Text numberOfLines={1} style={styles.txNameText}>
            {title}
          </Text>
        </View>

        <Text style={[styles.amountText, { color: amountColor }]}>
          {formattedAmount}
        </Text>
      </View>

      {/* Row 2: Category / Account Route & Date/Time */}
      <View style={styles.txSubRow}>
        <Text numberOfLines={1} style={styles.routeCategoryText}>
          {routeOrCategory}
        </Text>
        <Text style={styles.txTimeText}>
          {formattedDate} {formattedTime ? `• ${formattedTime}` : ""}
        </Text>
      </View>

      {/* Row 3: Notes (if present and different from title) */}
      {transaction.note && transaction.name && (
        <Text numberOfLines={2} style={styles.txNoteText}>
          {transaction.note}
        </Text>
      )}
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    txCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...theme.shadows.card,
    },
    txCardPressed: {
      backgroundColor: theme.colors.surfaceMuted,
      opacity: 0.9,
    },
    txMainRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    txTitleGroup: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 10,
      marginRight: 10,
    },
    iconBadge: {
      alignItems: "center",
      borderRadius: 10,
      borderWidth: 1,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    txNameText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
    },
    amountText: {
      fontSize: 15,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    amountIncome: {
      color: theme.colors.success,
    },
    amountExpense: {
      color: theme.colors.danger,
    },
    amountTransfer: {
      color: theme.colors.info,
    },
    txSubRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
    },
    routeCategoryText: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: 12,
      fontWeight: "500",
      marginRight: 8,
    },
    txTimeText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: "500",
    },
    txNoteText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontStyle: "italic",
      marginTop: 5,
    },
  });
}
