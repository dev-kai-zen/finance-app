import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FloatingActionButton, PageContainer, PageEmptyState, PageHeader } from "@/components";
import { LAYOUT_DIMENSIONS } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { useAccounts } from "@/modules/accounts";
import { useCategories } from "@/modules/categories";
import { TransactionFormModal } from "../components/transaction-form-modal";
import { TransactionRow } from "../components/transaction-row";
import { TransactionStatsCard } from "../components/transaction-stats-card";
import { useTransactions } from "../hooks/use-transactions";
import type { TransactionFilter, TransactionType } from "../types/transaction.types";

export function TransactionsScreen() {
  const styles = useThemeStyles(createStyles);

  const {
    transactions,
    stats,
    loading,
    pendingAction,
    error,
    filter,
    setFilter,
    recordTransaction,
    recordTransfer,
    deleteTx,
  } = useTransactions();

  const { accounts } = useAccounts();
  const { categories } = useCategories();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const handleAddTransaction = () => {
    setIsFormModalOpen(true);
  };

  const handleFilterChange = (type: TransactionFilter["type"]) => {
    setFilter((prev) => ({ ...prev, type }));
  };

  const handleDelete = (id: string) => {
    const executeDelete = async () => {
      await deleteTx(id);
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this transaction record?")) {
        executeDelete();
      }
    } else {
      Alert.alert(
        "Delete Transaction",
        "Are you sure you want to delete this transaction record?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: executeDelete },
        ],
      );
    }
  };

  const filterOptions = [
    { key: "all", label: `All (${transactions.length})` },
    { key: "income", label: "Income" },
    { key: "expense", label: "Expense" },
    { key: "transfer", label: "Transfers" },
  ] as const;

  return (
    <PageContainer
      header={
        <PageHeader
          breadcrumb="Kaizen Finance / Transactions"
          primaryAction={{
            label: "+ Record Transaction",
            onPress: handleAddTransaction,
          }}
          subtitle="Detailed ledger of your income, expenses, and account transfers."
          title="Transactions"
        />
      }
    >
      <View style={styles.container}>
        {/* Statistics Card */}
        <TransactionStatsCard stats={stats} />

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {filterOptions.map((opt) => {
            const active = (filter.type ?? "all") === opt.key;

            return (
              <Pressable
                key={opt.key}
                accessibilityLabel={`Filter by ${opt.label}`}
                accessibilityRole="button"
                onPress={() => handleFilterChange(opt.key)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    active && styles.filterPillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Transactions Table / List */}
        {transactions.length === 0 ? (
          <PageEmptyState
            actionLabel="+ Record First Transaction"
            description="No transaction records match the current filter."
            onAction={handleAddTransaction}
            title="No Transactions Found"
          />
        ) : (
          <View style={styles.card}>
            {transactions.map((tx, idx) => (
              <TransactionRow
                key={tx.id}
                isLast={idx === transactions.length - 1}
                onDelete={handleDelete}
                transaction={tx}
              />
            ))}
          </View>
        )}
      </View>

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton
        accessibilityLabel="Record new transaction"
        onPress={handleAddTransaction}
      />

      {/* Transaction & Transfer Form Modal */}
      <TransactionFormModal
        accounts={accounts}
        categories={categories}
        error={error}
        onClose={() => setIsFormModalOpen(false)}
        onSaveTransaction={recordTransaction}
        onSaveTransfer={recordTransfer}
        pending={pendingAction}
        visible={isFormModalOpen}
      />
    </PageContainer>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.md,
      paddingBottom: 80,
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
  });
}
