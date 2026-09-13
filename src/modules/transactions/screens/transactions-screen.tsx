import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PageContainer, PageEmptyState } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";

interface TransactionItem {
  id: string;
  accountName: string;
  categoryName: string;
  description: string;
  occurredAt: string;
  amountMinorUnits: number;
  type: "income" | "expense" | "transfer";
}

const SAMPLE_TRANSACTIONS: TransactionItem[] = [
  {
    id: "tx-1",
    accountName: "BDO Everyday Checking",
    categoryName: "Income / Salary",
    description: "Monthly Software Engineering Retainer",
    occurredAt: "Today, 10:30 AM",
    amountMinorUnits: 6500000,
    type: "income",
  },
  {
    id: "tx-2",
    accountName: "BDO Everyday Checking",
    categoryName: "Groceries",
    description: "SM Supermarket Weekly Provisions",
    occurredAt: "Yesterday, 6:45 PM",
    amountMinorUnits: -435000,
    type: "expense",
  },
  {
    id: "tx-3",
    accountName: "Maya Digital Wallet",
    categoryName: "Utilities",
    description: "Meralco Electric Power Distribution",
    occurredAt: "Sep 11, 2026",
    amountMinorUnits: -582000,
    type: "expense",
  },
  {
    id: "tx-4",
    accountName: "Metrobank Platinum Card",
    categoryName: "Dining",
    description: "Grab Food Meal Delivery",
    occurredAt: "Sep 11, 2026",
    amountMinorUnits: -62000,
    type: "expense",
  },
  {
    id: "tx-5",
    accountName: "BDO Checking → BPI Savings",
    categoryName: "Transfer",
    description: "Emergency Fund Allocation",
    occurredAt: "Sep 10, 2026",
    amountMinorUnits: -1000000,
    type: "transfer",
  },
  {
    id: "tx-6",
    accountName: "BPI High-Yield Savings",
    categoryName: "Investments",
    description: "High-Yield Interest Accrual",
    occurredAt: "Sep 01, 2026",
    amountMinorUnits: 42500,
    type: "income",
  },
];

export function TransactionsScreen() {
  const styles = useThemeStyles(createStyles);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense" | "transfer">("all");

  const filteredTransactions = SAMPLE_TRANSACTIONS.filter((tx) => {
    if (filterType === "all") return true;
    return tx.type === filterType;
  });

  const handleAddTransaction = () => {
    if (Platform.OS === "web") {
      window.alert("Add Transaction action triggered. Ready for form modal integration.");
    } else {
      Alert.alert("Add Transaction", "Add Transaction action triggered. Ready for form modal integration.");
    }
  };

  return (
    <PageContainer
      header={
        <PageHeader
          breadcrumb="Kaizen Finance / Transactions"
          primaryAction={{
            label: "+ Add Transaction",
            onPress: handleAddTransaction,
          }}
          subtitle="Detailed audit log of your income, expenses, and account transfers."
          title="Transactions"
        />
      }
    >
      <View style={styles.container}>
        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(["all", "income", "expense", "transfer"] as const).map((type) => {
            const active = filterType === type;
            const labels = {
              all: `All (${SAMPLE_TRANSACTIONS.length})`,
              income: "Income",
              expense: "Expense",
              transfer: "Transfers",
            };

            return (
              <Pressable
                key={type}
                accessibilityLabel={`Filter by ${labels[type]}`}
                accessibilityRole="button"
                onPress={() => setFilterType(type)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {labels[type]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Transactions Table / List */}
        {filteredTransactions.length === 0 ? (
          <PageEmptyState
            actionLabel="+ Record Transaction"
            description="No transactions match this category."
            onAction={handleAddTransaction}
            title="No Transactions Found"
          />
        ) : (
          <View style={styles.card}>
            {filteredTransactions.map((tx, idx) => {
              const isIncome = tx.type === "income";
              const isTransfer = tx.type === "transfer";
              const isLast = idx === filteredTransactions.length - 1;

              return (
                <View
                  key={tx.id}
                  style={[styles.row, !isLast && styles.rowBorder]}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.typeBadge,
                        isIncome && styles.badgeIncome,
                        isTransfer && styles.badgeTransfer,
                      ]}
                    >
                      <Text style={styles.typeBadgeIcon}>
                        {isIncome ? "↓" : isTransfer ? "⇄" : "↑"}
                      </Text>
                    </View>

                    <View style={styles.info}>
                      <Text numberOfLines={1} style={styles.description}>
                        {tx.description}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.category}>{tx.categoryName}</Text>
                        <Text style={styles.separator}>•</Text>
                        <Text style={styles.account}>{tx.accountName}</Text>
                        <Text style={styles.separator}>•</Text>
                        <Text style={styles.date}>{tx.occurredAt}</Text>
                      </View>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.amount,
                      isIncome && styles.amountIncome,
                      isTransfer && styles.amountTransfer,
                    ]}
                  >
                    {formatCurrency(tx.amountMinorUnits, "PHP", true)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.lg,
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    filterPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: LAYOUT_DIMENSIONS.minTouchTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    filterPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterPillText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    filterPillTextActive: {
      color: theme.colors.onPrimary,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
    },
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
    rowLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    typeBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    badgeIncome: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    badgeTransfer: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    typeBadgeIcon: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    info: {
      flex: 1,
    },
    description: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      lineHeight: theme.typography.lineHeight.sm,
    },
    metaRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      marginTop: 2,
    },
    category: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    separator: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    account: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    date: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    amount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
    },
    amountIncome: {
      color: theme.colors.success,
    },
    amountTransfer: {
      color: theme.colors.textSecondary,
    },
  });
}
