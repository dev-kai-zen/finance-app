import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isTabletOrDesktop } from "@/constants/layout";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { IconHelper } from "@/components";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency, formatPhpCurrency } from "@/utils/currency";
import type { TransactionListItem } from "../types/transaction.types";

export interface TransactionDetailModalProps {
  visible: boolean;
  onClose: () => void;
  transaction: TransactionListItem | null;
  onEdit?: (tx: TransactionListItem) => void;
  onDuplicate?: (tx: TransactionListItem) => void;
  onDelete?: (id: string) => void;
}

export function TransactionDetailModal({
  visible,
  onClose,
  transaction,
  onEdit,
  onDuplicate,
  onDelete,
}: TransactionDetailModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = isTabletOrDesktop(width);
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const resolveEntityColor = useResolveEntityColor();

  if (!transaction) return null;

  const categoryDisplayColor = resolveEntityColor(transaction.categoryColor);

  const isIncome = transaction.type === "income";
  const isTransfer = transaction.type === "transfer";
  const isPocketTransfer =
    isTransfer && transaction.accountId === transaction.transferAccountId;

  const displayAmountCents = isTransfer
    ? Math.abs(transaction.amountCents)
    : isIncome
      ? transaction.amountCents
      : -Math.abs(transaction.amountCents);

  const amountColor = isTransfer
    ? theme.colors.info
    : displayAmountCents < 0
      ? theme.colors.danger
      : displayAmountCents > 0
        ? theme.colors.success
        : theme.colors.textMuted;

  const phpResult = formatPhpCurrency(displayAmountCents, {
    showPositiveSign: false,
    positiveColor: theme.colors.success,
    negativeColor: theme.colors.danger,
    zeroColor: theme.colors.textMuted,
  });

  const typeColor = isTransfer
    ? theme.colors.info
    : isIncome
      ? theme.colors.success
      : theme.colors.danger;

  const formattedAmount = isTransfer
    ? formatCurrency(
        Math.abs(transaction.amountCents),
        transaction.accountCurrency ?? "PHP",
        false,
      )
    : phpResult.formatted;

  const formattedDate = transaction.occurredAt
    ? new Date(transaction.occurredAt).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const title =
    transaction.name ||
    transaction.note ||
    (isTransfer
      ? isPocketTransfer
        ? `Move to ${transaction.transferPocketName ?? "Main"}`
        : `Transfer to ${transaction.transferAccountName ?? "Account"}`
      : transaction.categoryName || "Transaction");

  const handleDeletePress = () => {
    if (onDelete) {
      onDelete(transaction.id);
      onClose();
    }
  };

  const handleEditPress = () => {
    if (onEdit) {
      onEdit(transaction);
      onClose();
    }
  };

  const handleDuplicatePress = () => {
    if (onDuplicate) {
      onDuplicate(transaction);
      onClose();
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Dismiss transaction details"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />

        <View
          style={[
            styles.sheetContainer,
            isDesktop && styles.sheetContainerDesktop,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Transaction Details</Text>
            <Pressable
              accessibilityLabel="Close transaction details"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollBody}>
            {/* Amount Hero Card */}
            <View style={styles.heroCard}>
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor: `${typeColor}20`,
                    borderColor: `${typeColor}40`,
                  },
                ]}
              >
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                  {isTransfer ? "TRANSFER" : isIncome ? "INCOME" : "EXPENSE"}
                </Text>
              </View>

              <Text style={[styles.amountText, { color: amountColor }]}>
                {formattedAmount}
              </Text>

              <Text numberOfLines={2} style={styles.heroTitleText}>
                {title}
              </Text>
            </View>

            {/* Details Section */}
            <View style={styles.detailsCard}>
              {/* Account Row */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconBadge}>
                  <IconHelper color={theme.colors.primary} name="landmark" size={16} />
                </View>
                <View style={styles.detailInfoCol}>
                  <Text style={styles.detailLabel}>
                    {isPocketTransfer
                      ? "SOURCE POCKET"
                      : isTransfer
                        ? "SOURCE ACCOUNT"
                        : "ACCOUNT"}
                  </Text>
                  <Text style={styles.detailValue}>
                    {isPocketTransfer
                      ? transaction.pocketName ?? "Main"
                      : transaction.accountName ?? "Account"}
                  </Text>
                  {!isPocketTransfer && transaction.pocketName ? (
                    <Text style={styles.detailMeta}>Pocket: {transaction.pocketName}</Text>
                  ) : null}
                </View>
              </View>

              {/* Transfer Destination or Category Row */}
              {isTransfer ? (
                <View style={[styles.detailRow, styles.detailRowBorder]}>
                  <View style={styles.detailIconBadge}>
                    <IconHelper color={theme.colors.info} name="arrow-right" size={16} />
                  </View>
                  <View style={styles.detailInfoCol}>
                    <Text style={styles.detailLabel}>
                      {isPocketTransfer ? "DESTINATION POCKET" : "DESTINATION ACCOUNT"}
                    </Text>
                    <Text style={styles.detailValue}>
                      {isPocketTransfer
                        ? transaction.transferPocketName ?? "Main"
                        : transaction.transferAccountName ?? "Destination Account"}
                    </Text>
                    {!isPocketTransfer && transaction.transferPocketName ? (
                      <Text style={styles.detailMeta}>
                        Pocket: {transaction.transferPocketName}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <View style={[styles.detailRow, styles.detailRowBorder]}>
                  <View style={styles.detailIconBadge}>
                    <IconHelper
                      color={categoryDisplayColor}
                      name={transaction.categoryIcon ?? "tag"}
                      size={16}
                    />
                  </View>
                  <View style={styles.detailInfoCol}>
                    <Text style={styles.detailLabel}>CATEGORY</Text>
                    <Text style={styles.detailValue}>
                      {transaction.categoryName ?? "Uncategorized"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Date Row */}
              <View style={[styles.detailRow, styles.detailRowBorder]}>
                <View style={styles.detailIconBadge}>
                  <IconHelper color={theme.colors.textSecondary} name="calendar" size={16} />
                </View>
                <View style={styles.detailInfoCol}>
                  <Text style={styles.detailLabel}>DATE</Text>
                  <Text style={styles.detailValue}>{formattedDate}</Text>
                </View>
              </View>

              {/* Note Row (if present) */}
              {transaction.note ? (
                <View style={[styles.detailRow, styles.detailRowBorder]}>
                  <View style={styles.detailIconBadge}>
                    <IconHelper color={theme.colors.textSecondary} name="file-text" size={16} />
                  </View>
                  <View style={styles.detailInfoCol}>
                    <Text style={styles.detailLabel}>NOTES</Text>
                    <Text style={styles.detailValue}>{transaction.note}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Action Buttons Footer (Kaizen Design) */}
          <View style={styles.footerRow}>
            {onDelete ? (
              <Pressable
                accessibilityLabel="Delete transaction"
                accessibilityRole="button"
                onPress={handleDeletePress}
                style={styles.deleteBtn}
              >
                <IconHelper color={theme.colors.danger} name="trash-2" size={16} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </Pressable>
            ) : null}

            {onDuplicate ? (
              <Pressable
                accessibilityLabel="Duplicate transaction"
                accessibilityRole="button"
                onPress={handleDuplicatePress}
                style={styles.duplicateBtn}
              >
                <IconHelper color={theme.colors.textPrimary} name="copy" size={16} />
                <Text style={styles.duplicateBtnText}>Duplicate</Text>
              </Pressable>
            ) : null}

            {onEdit ? (
              <Pressable
                accessibilityLabel="Edit transaction"
                accessibilityRole="button"
                onPress={handleEditPress}
                style={styles.editBtn}
              >
                <IconHelper color={theme.colors.onPrimary} name="pencil" size={16} />
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    modalOverlay: {
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      maxHeight: "88%",
      paddingHorizontal: 20,
      paddingTop: 16,
      width: "100%",
      ...theme.shadows.modal,
    },
    sheetContainerDesktop: {
      alignSelf: "center",
      borderRadius: 24,
      marginBottom: "auto",
      marginTop: "auto",
      maxWidth: 480,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    closeBtn: {
      alignItems: "center",
      borderRadius: 16,
      height: 32,
      justifyContent: "center",
      width: 32,
    },
    closeBtnText: {
      color: theme.colors.textMuted,
      fontSize: 16,
      fontWeight: "bold",
    },
    scrollBody: {
      marginBottom: 16,
    },
    heroCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      marginBottom: 16,
      padding: 20,
    },
    typeBadge: {
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    typeBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.6,
    },
    amountText: {
      fontSize: 32,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
      marginBottom: 6,
    },
    heroTitleText: {
      color: theme.colors.textSecondary,
      fontSize: 15,
      fontWeight: "600",
      textAlign: "center",
    },
    detailsCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
    },
    detailRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    detailRowBorder: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
    },
    detailIconBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    detailInfoCol: {
      flex: 1,
    },
    detailLabel: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    detailValue: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      marginTop: 2,
    },
    detailMeta: {
      color: theme.colors.info,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    footerRow: {
      flexDirection: "row",
      gap: 10,
      paddingTop: 8,
    },
    deleteBtn: {
      alignItems: "center",
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: 12,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      gap: 6,
      height: 46,
      justifyContent: "center",
    },
    deleteBtnText: {
      color: theme.colors.danger,
      fontSize: 14,
      fontWeight: "700",
    },
    duplicateBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      gap: 6,
      height: 46,
      justifyContent: "center",
    },
    duplicateBtnText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    editBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      flex: 1.5,
      flexDirection: "row",
      gap: 6,
      height: 46,
      justifyContent: "center",
    },
    editBtnText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
