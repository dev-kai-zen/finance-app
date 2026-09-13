import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import type { TransactionListItem } from "../types/transaction.types";

export interface TransactionRowProps {
  transaction: TransactionListItem;
  onDelete?: (id: string) => void;
  isLast?: boolean;
}

export function TransactionRow({
  transaction,
  onDelete,
  isLast = false,
}: TransactionRowProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const isIncome = transaction.type === "income";
  const isTransfer = transaction.type === "transfer";

  const categoricalColor =
    transaction.categoryColor && transaction.categoryColor in theme.colors.categorical
      ? theme.colors.categorical[transaction.categoryColor as keyof AppTheme["colors"]["categorical"]]
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
        year: "numeric",
      })
    : "";

  const title =
    transaction.note ||
    (isTransfer
      ? `Transfer to ${transaction.transferAccountName ?? "Account"}`
      : transaction.categoryName || "Transaction");

  const amountSign = isIncome ? "+" : isTransfer ? "" : "-";
  const formattedAmount = `${amountSign}${formatCurrency(
    transaction.amountCents,
    transaction.accountCurrency ?? "PHP",
    true,
  )}`;

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.leftCol}>
        {/* Icon Badge */}
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: `${categoricalColor}20`,
              borderColor: `${categoricalColor}45`,
            },
          ]}
        >
          <IconHelper
            color={categoricalColor}
            name={iconName}
            size={18}
          />
        </View>

        {/* Info Column */}
        <View style={styles.infoCol}>
          <Text numberOfLines={1} style={styles.titleText}>
            {title}
          </Text>

          <View style={styles.metaRow}>
            {isTransfer ? (
              <Text numberOfLines={1} style={styles.metaAccount}>
                {transaction.accountName} → {transaction.transferAccountName}
              </Text>
            ) : (
              <>
                <Text style={styles.metaCategory}>
                  {transaction.categoryName || "Uncategorized"}
                </Text>
                <Text style={styles.metaDot}>•</Text>
                <Text numberOfLines={1} style={styles.metaAccount}>
                  {transaction.accountName}
                </Text>
              </>
            )}
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaDate}>{formattedDate}</Text>
          </View>
        </View>
      </View>

      {/* Right Column: Amount & Delete Button */}
      <View style={styles.rightCol}>
        <Text
          style={[
            styles.amountText,
            isIncome && styles.amountIncome,
            isTransfer && styles.amountTransfer,
          ]}
        >
          {formattedAmount}
        </Text>

        {onDelete ? (
          <Pressable
            accessibilityLabel={`Delete ${title}`}
            accessibilityRole="button"
            onPress={() => onDelete(transaction.id)}
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && styles.deleteBtnPressed,
            ]}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.md,
    },
    rowBorder: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
    },
    leftCol: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    iconBadge: {
      alignItems: "center",
      borderRadius: 12,
      borderWidth: 1,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    infoCol: {
      flex: 1,
    },
    titleText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
      lineHeight: 20,
    },
    metaRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
      marginTop: 3,
    },
    metaCategory: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    metaDot: {
      color: theme.colors.textSecondary,
      fontSize: 11,
    },
    metaAccount: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    metaDate: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    rightCol: {
      alignItems: "flex-end",
      flexDirection: "row",
      gap: 10,
    },
    amountText: {
      color: theme.colors.danger,
      fontSize: 15,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    amountIncome: {
      color: theme.colors.success,
    },
    amountTransfer: {
      color: theme.colors.info,
    },
    deleteBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      height: 24,
      justifyContent: "center",
      width: 24,
    },
    deleteBtnPressed: {
      opacity: 0.7,
    },
    deleteBtnText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "bold",
    },
  });
}
