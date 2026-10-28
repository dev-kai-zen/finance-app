import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Edit3,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { IconHelper } from "@/components";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type { ParsedTransactionProposal } from "../types/chat-with-kai.types";

interface ChatTransactionCardProps {
  proposal: ParsedTransactionProposal;
  mode?: "review" | "auto";
  onEdit: (proposal: ParsedTransactionProposal) => void;
  onSave: (proposal: ParsedTransactionProposal) => Promise<boolean>;
  onDelete?: (proposal: ParsedTransactionProposal) => Promise<boolean>;
}

export function ChatTransactionCard({
  proposal,
  mode = "review",
  onEdit,
  onSave,
  onDelete,
}: ChatTransactionCardProps) {
  const styles = useThemeStyles(createStyles);
  const theme = useAppTheme();
  const { t } = useLocalization();
  const resolveEntityColor = useResolveEntityColor();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saved = Boolean(proposal.isSaved);
  const isDeleted = Boolean(proposal.isDeleted);

  const isExpense = proposal.type === "expense";
  const isIncome = proposal.type === "income";
  const isTransfer = proposal.type === "transfer";

  const formattedAmount = formatCurrency(
    proposal.amountMinorUnits,
    proposal.currencyCode,
  );

  const categoryColor = resolveEntityColor(proposal.categoryColor);

  const handleSavePress = async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      await onSave(proposal);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePress = () => {
    if (deleting || !onDelete) return;
    Alert.alert(
      t("chatWithKai.deleteConfirmTitle"),
      t("chatWithKai.deleteConfirmMessage"),
      [
        { text: t("chatWithKai.cancel"), style: "cancel" },
        {
          text: t("chatWithKai.deleteButton"),
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await onDelete(proposal);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const accountGroupLabel =
    proposal.accountGroup === "liability"
      ? "Liability"
      : proposal.accountGroup === "asset"
        ? "Asset"
        : proposal.accountGroup
          ? proposal.accountGroup.charAt(0).toUpperCase() + proposal.accountGroup.slice(1)
          : "Asset";

  const transferDestGroupLabel =
    proposal.transferAccountGroup === "liability"
      ? "Liability"
      : proposal.transferAccountGroup === "asset"
        ? "Asset"
        : proposal.transferAccountGroup
          ? proposal.transferAccountGroup.charAt(0).toUpperCase() + proposal.transferAccountGroup.slice(1)
          : "Asset";

  return (
    <View style={styles.card}>
      {/* Header: Type Badge & Status */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.typeBadge,
            isExpense && styles.expenseBadge,
            isIncome && styles.incomeBadge,
            isTransfer && styles.transferBadge,
          ]}
        >
          {isExpense && <TrendingDown color={theme.colors.danger} size={13} />}
          {isIncome && <TrendingUp color={theme.colors.success} size={13} />}
          {isTransfer && <ArrowRightLeft color={theme.colors.primary} size={13} />}
          <Text
            style={[
              styles.typeBadgeText,
              isExpense && styles.expenseBadgeText,
              isIncome && styles.incomeBadgeText,
              isTransfer && styles.transferBadgeText,
            ]}
          >
            {isExpense ? "Expense" : isIncome ? "Income" : "Transfer"}
          </Text>
        </View>

        {isDeleted ? (
          <View style={styles.deletedStatusBadge}>
            <Trash2 color={theme.colors.danger} size={13} />
            <Text style={styles.deletedStatusText}>
              {t("chatWithKai.deletedBadge")}
            </Text>
          </View>
        ) : saved ? (
          <View style={styles.savedStatusBadge}>
            <CheckCircle2 color={theme.colors.success} size={13} />
            <Text style={styles.savedStatusText}>
              {mode === "auto" ? t("chatWithKai.recordedBadge") : "Saved"}
            </Text>
          </View>
        ) : (
          <Text style={styles.dateText}>Ready to record</Text>
        )}
      </View>

      {/* Duplicate Warning Banner */}
      {proposal.isPotentialDuplicate && !saved && !isDeleted ? (
        <View style={styles.duplicateWarningBox}>
          <AlertTriangle color={theme.colors.warning ?? "#F59E0B"} size={13} />
          <Text style={styles.duplicateWarningText}>
            {proposal.duplicateWarningMessage ??
              "A similar transaction was already recorded recently."}
          </Text>
        </View>
      ) : null}

      {/* Body: Two-Column Layout (Amount, Merchant, Category on Left; Group, Account on Right) */}
      {isTransfer ? (
        <View style={styles.transferSection}>
          <Text style={[styles.amountText, styles.transferAmount]}>
            {formattedAmount}
          </Text>

          <View style={styles.transferAccountsRow}>
            <View style={styles.transferAccountCol}>
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>{accountGroupLabel}</Text>
              </View>
              <View style={styles.accountRow}>
                <Wallet color={theme.colors.textSecondary} size={12} />
                <Text numberOfLines={1} style={styles.accountNameText}>
                  {proposal.accountName}
                </Text>
              </View>
              {proposal.pocketName ? (
                <Text numberOfLines={1} style={styles.pocketNameText}>
                  ↳ {proposal.pocketName}
                </Text>
              ) : null}
            </View>

            <View style={styles.transferArrowWrapper}>
              <ArrowRight color={theme.colors.textMuted} size={18} />
            </View>

            <View style={styles.transferAccountCol}>
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>{transferDestGroupLabel}</Text>
              </View>
              <View style={styles.accountRow}>
                <Wallet color={theme.colors.textSecondary} size={12} />
                <Text numberOfLines={1} style={styles.accountNameText}>
                  {proposal.transferAccountName ?? "Destination Account"}
                </Text>
              </View>
              {proposal.transferPocketName ? (
                <Text numberOfLines={1} style={styles.pocketNameText}>
                  ↳ {proposal.transferPocketName}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.columnsContainer}>
          {/* Left Column: Amount, Merchant, Category */}
          <View style={styles.leftColumn}>
            <Text
              style={[
                styles.amountText,
                isExpense && styles.expenseAmount,
                isIncome && styles.incomeAmount,
              ]}
            >
              {formattedAmount}
            </Text>

            {proposal.name ? (
              <Text numberOfLines={1} style={styles.merchantText}>
                {proposal.name}
              </Text>
            ) : null}

            {proposal.categoryName ? (
              <View style={styles.categoryRow}>
                {proposal.categoryIcon ? (
                  <View
                    style={[
                      styles.categoryIconWrap,
                      { backgroundColor: categoryColor },
                    ]}
                  >
                    <IconHelper
                      color="#FFFFFF"
                      name={proposal.categoryIcon}
                      size={10}
                    />
                  </View>
                ) : null}
                <Text numberOfLines={1} style={styles.categoryNameText}>
                  {proposal.categoryName}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Right Column: Account Group Pill, Account Name, Pocket */}
          <View style={styles.rightColumn}>
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>{accountGroupLabel}</Text>
            </View>

            <View style={styles.accountRow}>
              <Wallet color={theme.colors.textSecondary} size={12} />
              <Text numberOfLines={1} style={styles.accountNameText}>
                {proposal.accountName}
              </Text>
            </View>

            {proposal.pocketName ? (
              <Text numberOfLines={1} style={styles.pocketNameText}>
                ↳ {proposal.pocketName}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Note Preview if present */}
      {proposal.note && (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Note:</Text>
          <Text numberOfLines={2} style={styles.noteText}>
            {proposal.note}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {isDeleted ? (
        <View style={styles.deletedNoticeBox}>
          <Text style={styles.deletedNoticeText}>
            {t("chatWithKai.deletedNotice")}
          </Text>
        </View>
      ) : saved ? (
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityLabel={t("chatWithKai.tapToEdit")}
            accessibilityRole="button"
            onPress={() => onEdit(proposal)}
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Edit3 color={theme.colors.textPrimary} size={14} />
            <Text style={styles.editButtonText}>
              {t("chatWithKai.tapToEdit")}
            </Text>
          </Pressable>

          {onDelete ? (
            <Pressable
              accessibilityLabel={t("chatWithKai.deleteButton")}
              accessibilityRole="button"
              disabled={deleting}
              onPress={handleDeletePress}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.buttonPressed,
              ]}
            >
              {deleting ? (
                <ActivityIndicator color={theme.colors.danger} size="small" />
              ) : (
                <>
                  <Trash2 color={theme.colors.danger} size={14} />
                  <Text style={styles.deleteButtonText}>
                    {t("chatWithKai.deleteButton")}
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityLabel={t("chatWithKai.tapToEdit")}
            accessibilityRole="button"
            onPress={() => onEdit(proposal)}
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Edit3 color={theme.colors.textPrimary} size={14} />
            <Text style={styles.editButtonText}>
              {t("chatWithKai.tapToEdit")}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Save transaction"
            accessibilityRole="button"
            disabled={saving}
            onPress={handleSavePress}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.buttonPressed,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      padding: theme.spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    duplicateWarningBox: {
      alignItems: "center",
      backgroundColor: "rgba(245, 158, 11, 0.12)",
      borderColor: "rgba(245, 158, 11, 0.35)",
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    duplicateWarningText: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 11,
      lineHeight: 15,
    },
    typeBadge: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    expenseBadge: {
      backgroundColor: "rgba(239, 68, 68, 0.12)",
    },
    incomeBadge: {
      backgroundColor: "rgba(16, 185, 129, 0.12)",
    },
    transferBadge: {
      backgroundColor: "rgba(59, 130, 246, 0.12)",
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: "700",
    },
    expenseBadgeText: {
      color: theme.colors.danger,
    },
    incomeBadgeText: {
      color: theme.colors.success,
    },
    transferBadgeText: {
      color: theme.colors.primary,
    },
    savedStatusBadge: {
      alignItems: "center",
      backgroundColor: "rgba(16, 185, 129, 0.12)",
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    savedStatusText: {
      color: theme.colors.success,
      fontSize: 12,
      fontWeight: "600",
    },
    deletedStatusBadge: {
      alignItems: "center",
      backgroundColor: "rgba(239, 68, 68, 0.12)",
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    deletedStatusText: {
      color: theme.colors.danger,
      fontSize: 12,
      fontWeight: "600",
    },
    dateText: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    columnsContainer: {
      flexDirection: "row",
      gap: theme.spacing.md,
      justifyContent: "space-between",
    },
    leftColumn: {
      flex: 1,
      gap: 3,
    },
    rightColumn: {
      alignItems: "flex-end",
      flex: 1,
      gap: 4,
    },
    amountText: {
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    expenseAmount: {
      color: theme.colors.danger,
    },
    incomeAmount: {
      color: theme.colors.success,
    },
    transferAmount: {
      color: theme.colors.primary,
    },
    merchantText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    categoryRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
      marginTop: 2,
    },
    categoryIconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 16,
      justifyContent: "center",
      width: 16,
    },
    categoryNameText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    groupBadge: {
      backgroundColor: "rgba(139, 92, 246, 0.12)",
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    groupBadgeText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
    accountRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
    },
    accountNameText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    pocketNameText: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    transferSection: {
      gap: theme.spacing.sm,
    },
    transferAccountsRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
      justifyContent: "space-between",
    },
    transferAccountCol: {
      flex: 1,
      gap: 3,
    },
    transferArrowWrapper: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    noteBox: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    noteLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    noteText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    actionsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: 2,
    },
    editButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      paddingVertical: 9,
    },
    editButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    deleteButton: {
      alignItems: "center",
      backgroundColor: "rgba(239, 68, 68, 0.08)",
      borderColor: "rgba(239, 68, 68, 0.25)",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      paddingVertical: 9,
    },
    deleteButtonText: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: "600",
    },
    saveButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flex: 1,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      paddingVertical: 9,
    },
    saveButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    deletedNoticeBox: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      paddingVertical: 8,
      marginTop: 2,
    },
    deletedNoticeText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontStyle: "italic",
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
  });
}
