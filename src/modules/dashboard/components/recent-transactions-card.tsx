import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useResolveEntityColor } from "@/modules/hex-colors";
import type { TransactionListItem } from "@/modules/transactions";
import { formatCurrency } from "@/utils/currency";

export interface RecentTransactionsCardProps {
  transactions: TransactionListItem[];
  onViewAll: () => void;
  currencyCode?: string;
}

export function RecentTransactionsCard({
  transactions,
  onViewAll,
  currencyCode = "PHP",
}: RecentTransactionsCardProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const resolveEntityColor = useResolveEntityColor();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Transactions</Text>
        <Pressable
          accessibilityLabel="View all transactions"
          accessibilityRole="button"
          onPress={onViewAll}
          style={({ pressed }) => [
            styles.viewAllButton,
            pressed && styles.viewAllButtonPressed,
          ]}
        >
          <Text style={styles.viewAllText}>View all</Text>
          <ArrowRight color={theme.colors.primary} size={15} />
        </Pressable>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions recorded yet.</Text>
          <Text style={styles.emptyHint}>
            Use the + button to record your first transaction.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {transactions.slice(0, 5).map((tx, idx) => {
            const isIncome = tx.type === "income";
            const isTransfer = tx.type === "transfer";
            const isLast = idx === Math.min(5, transactions.length) - 1;

            const catColor = resolveEntityColor(
              tx.categoryColor,
              isIncome
                ? theme.colors.success
                : isTransfer
                  ? theme.colors.info
                  : theme.colors.danger,
            );

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
                  <View style={styles.primaryRow}>
                    <Text numberOfLines={1} style={styles.titleText}>
                      {title}
                    </Text>
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      numberOfLines={1}
                      style={[
                        styles.amountText,
                        isTransfer ? styles.transferText : isPositive ? styles.incomeText : null,
                      ]}
                    >
                      {formattedAmount}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text numberOfLines={1} style={styles.metaCategory}>
                      {isTransfer
                        ? `${tx.accountName} → ${tx.transferAccountName}`
                        : tx.categoryName || "Uncategorized"}
                    </Text>
                    <Text numberOfLines={1} style={styles.metaDate}>
                      {formattedDate}
                    </Text>
                  </View>
                </View>
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
      marginBottom: theme.spacing.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: -0.2,
    },
    viewAllButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 40,
      paddingHorizontal: theme.spacing.sm,
    },
    viewAllButtonPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    viewAllText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 24,
    },
    emptyText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyHint: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      marginTop: theme.spacing.xs,
      textAlign: "center",
    },
    list: {},
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      paddingVertical: 10,
    },
    rowBorder: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
    },
    iconBadge: {
      alignItems: "center",
      borderRadius: 10,
      borderWidth: 1,
      flexShrink: 0,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    infoCol: {
      flex: 1,
      minWidth: 0,
    },
    primaryRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
    },
    titleText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 18,
    },
    metaRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "space-between",
      marginTop: 2,
    },
    metaCategory: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: 11,
      fontWeight: "500",
      minWidth: 0,
    },
    metaDate: {
      color: theme.colors.textMuted,
      flexShrink: 0,
      fontSize: 11,
      textAlign: "right",
    },
    amountText: {
      color: theme.colors.danger,
      flexShrink: 1,
      fontSize: 14,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      maxWidth: "48%",
      textAlign: "right",
    },
    incomeText: {
      color: theme.colors.success,
    },
    transferText: {
      color: theme.colors.info,
    },
  });
}
