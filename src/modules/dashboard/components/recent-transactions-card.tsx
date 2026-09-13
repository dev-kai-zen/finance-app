import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { TransactionListItem } from "@/modules/transactions";
import { formatCurrency } from "@/utils/currency";

export interface RecentTransactionsCardProps {
  transactions: TransactionListItem[];
  onViewAll: () => void;
  onAddTransaction: () => void;
  currencyCode?: string;
}

export function RecentTransactionsCard({
  transactions,
  onViewAll,
  onAddTransaction,
  currencyCode = "PHP",
}: RecentTransactionsCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>RECENT TRANSACTIONS</Text>
        <Pressable
          accessibilityLabel="View all transactions"
          accessibilityRole="button"
          onPress={onViewAll}
        >
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions recorded yet.</Text>
          <Pressable
            accessibilityLabel="Record first transaction"
            accessibilityRole="button"
            onPress={onAddTransaction}
            style={styles.addBtn}
          >
            <Text style={styles.addBtnText}>+ Record Transaction</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          {transactions.slice(0, 5).map((tx, idx) => {
            const isIncome = tx.type === "income";
            const isTransfer = tx.type === "transfer";
            const isLast = idx === Math.min(5, transactions.length) - 1;

            const catColor =
              tx.categoryColor && tx.categoryColor in theme.colors.categorical
                ? theme.colors.categorical[tx.categoryColor as keyof AppTheme["colors"]["categorical"]]
                : isIncome
                  ? theme.colors.success
                  : isTransfer
                    ? theme.colors.info
                    : theme.colors.danger;

            const iconName = isTransfer
              ? "arrow-left-right"
              : tx.categoryIcon || (isIncome ? "arrow-down-left" : "shopping-cart");

            const formattedDate = tx.occurredAt
              ? new Date(tx.occurredAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "";

            const title =
              tx.name ||
              tx.note ||
              (isTransfer
                ? `Transfer to ${tx.transferAccountName ?? "Account"}`
                : tx.categoryName || "Transaction");

            const isPositive = tx.amountCents > 0;
            const formattedAmount = isTransfer
              ? formatCurrency(Math.abs(tx.amountCents), tx.accountCurrency ?? currencyCode, false)
              : formatCurrency(tx.amountCents, tx.accountCurrency ?? currencyCode, true);

            return (
              <View
                key={tx.id}
                style={[styles.row, !isLast && styles.rowBorder]}
              >
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor: `${catColor}20`,
                        borderColor: `${catColor}40`,
                      },
                    ]}
                  >
                    <IconHelper color={catColor} name={iconName} size={16} />
                  </View>

                  <View style={styles.infoCol}>
                    <Text numberOfLines={1} style={styles.titleText}>
                      {title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaCategory}>
                        {isTransfer
                          ? `${tx.accountName} → ${tx.transferAccountName}`
                          : tx.categoryName || "Uncategorized"}
                      </Text>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.metaDate}>{formattedDate}</Text>
                    </View>
                  </View>
                </View>

                <Text
                  style={[
                    styles.amountText,
                    isTransfer ? styles.transferText : isPositive ? styles.incomeText : null,
                  ]}
                >
                  {formattedAmount}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    title: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
    },
    viewAllText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: "600",
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 24,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      marginBottom: 12,
    },
    addBtn: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    addBtnText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: "600",
    },
    list: {},
    row: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
    },
    rowBorder: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
    },
    rowLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 12,
    },
    iconBadge: {
      alignItems: "center",
      borderRadius: 10,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    infoCol: {
      flex: 1,
    },
    titleText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 18,
    },
    metaRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
      marginTop: 2,
    },
    metaCategory: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "500",
    },
    metaDot: {
      color: theme.colors.textSecondary,
      fontSize: 10,
    },
    metaDate: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    amountText: {
      color: theme.colors.danger,
      fontSize: 14,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    incomeText: {
      color: theme.colors.success,
    },
    transferText: {
      color: theme.colors.info,
    },
  });
}
