import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChevronLeft, RotateCcw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency, formatPhpCurrency } from "@/utils/currency";
import type { TransactionListItem } from "../types/transaction.types";

export interface DeletedTransactionsModalProps {
  visible: boolean;
  transactions: TransactionListItem[];
  pending?: boolean;
  onClose: () => void;
  onRestore: (id: string) => void;
}

export function DeletedTransactionsModal({
  visible,
  transactions,
  pending = false,
  onClose,
  onRestore,
}: DeletedTransactionsModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!pending) onClose();
      }}
      visible={visible}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Close trash"
            accessibilityRole="button"
            disabled={pending}
            onPress={onClose}
            style={styles.backButton}
          >
            <ChevronLeft color={theme.colors.textPrimary} size={24} />
          </Pressable>
          <View style={styles.titleColumn}>
            <Text style={styles.title}>Trash</Text>
            <Text style={styles.subtitle}>
              {transactions.length} deleted{" "}
              {transactions.length === 1 ? "transaction" : "transactions"}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Trash is empty</Text>
              <Text style={styles.emptyDescription}>
                Deleted transactions will appear here and can be restored.
              </Text>
            </View>
          ) : (
            transactions.map((transaction) => {
              const isTransfer = transaction.type === "transfer";
              const isNegative = transaction.amountCents < 0;
              const amountColor = isTransfer
                ? theme.colors.info
                : isNegative
                  ? theme.colors.danger
                  : theme.colors.success;
              const amount = isTransfer
                ? formatCurrency(
                    Math.abs(transaction.amountCents),
                    transaction.accountCurrency,
                  )
                : formatPhpCurrency(transaction.amountCents, {
                    showPositiveSign: false,
                  }).formatted;
              const route = isTransfer
                ? transaction.accountTypeName +
                  " > " +
                  transaction.accountName +
                  " → " +
                  (transaction.transferAccountTypeName ?? "Account") +
                  " > " +
                  (transaction.transferAccountName ?? "Destination")
                : (transaction.categoryName ?? "Uncategorized") +
                  " · " +
                  transaction.accountTypeName +
                  " > " +
                  transaction.accountName;
              const transactionTitle =
                transaction.name ||
                transaction.note ||
                (isTransfer
                  ? "Transfer"
                  : transaction.categoryName || "Transaction");

              return (
                <View key={transaction.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text numberOfLines={2} style={styles.transactionTitle}>
                      {transactionTitle}
                    </Text>
                    <Text style={[styles.amount, { color: amountColor }]}>
                      {amount}
                    </Text>
                  </View>
                  <Text style={styles.route}>{route}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.deletedDate}>
                      Deleted{" "}
                      {transaction.deletedAt
                        ? new Date(transaction.deletedAt).toLocaleDateString()
                        : ""}
                    </Text>
                    <Pressable
                      accessibilityLabel={"Restore " + transactionTitle}
                      accessibilityRole="button"
                      disabled={pending}
                      onPress={() => onRestore(transaction.id)}
                      style={[styles.restoreButton, pending && styles.disabled]}
                    >
                      <RotateCcw color={theme.colors.success} size={16} />
                      <Text style={styles.restoreText}>Restore</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    header: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    backButton: {
      alignItems: "center",
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    titleColumn: {
      flex: 1,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    headerSpacer: {
      width: 40,
    },
    scrollContent: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    cardHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
    },
    transactionTitle: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    amount: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
    },
    route: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    cardFooter: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    deletedDate: {
      color: theme.colors.textMuted,
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
    },
    restoreButton: {
      alignItems: "center",
      borderColor: theme.colors.success,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    restoreText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    disabled: {
      opacity: 0.5,
    },
    emptyState: {
      alignItems: "center",
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxxl,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    emptyDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      marginTop: theme.spacing.sm,
      textAlign: "center",
    },
  });
}
