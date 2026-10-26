import React, { useState } from "react";
import {
  ActivityIndicator,
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
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { IconHelper } from "@/components";
import { useResolveEntityColor } from "@/modules/hex-colors";
import { formatCurrency } from "@/utils/currency";
import type { ParsedTransactionProposal } from "../types/chat-with-kai.types";

interface ChatTransactionCardProps {
  proposal: ParsedTransactionProposal;
  onEdit: (proposal: ParsedTransactionProposal) => void;
  onSave: (proposal: ParsedTransactionProposal) => Promise<boolean>;
}

export function ChatTransactionCard({
  proposal,
  onEdit,
  onSave,
}: ChatTransactionCardProps) {
  const styles = useThemeStyles(createStyles);
  const theme = useAppTheme();
  const resolveEntityColor = useResolveEntityColor();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(Boolean(proposal.isSaved));

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
      const ok = await onSave(proposal);
      if (ok) {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

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

        {saved ? (
          <View style={styles.savedStatusBadge}>
            <CheckCircle2 color={theme.colors.success} size={13} />
            <Text style={styles.savedStatusText}>Saved</Text>
          </View>
        ) : (
          <Text style={styles.dateText}>Ready to record</Text>
        )}
      </View>

      {/* Duplicate Warning Banner */}
      {proposal.isPotentialDuplicate && !saved ? (
        <View style={styles.duplicateWarningBox}>
          <AlertTriangle color={theme.colors.warning ?? "#F59E0B"} size={13} />
          <Text style={styles.duplicateWarningText}>
            {proposal.duplicateWarningMessage ??
              "A similar transaction was already recorded recently."}
          </Text>
        </View>
      ) : null}

      {/* Amount Display */}
      <View style={styles.amountContainer}>
        <Text
          style={[
            styles.amountText,
            isExpense && styles.expenseAmount,
            isIncome && styles.incomeAmount,
            isTransfer && styles.transferAmount,
          ]}
        >
          {isExpense ? `-${formattedAmount}` : isIncome ? `+${formattedAmount}` : formattedAmount}
        </Text>
        {proposal.name ? (
          <Text numberOfLines={1} style={styles.merchantNameText}>
            {proposal.name}
          </Text>
        ) : null}
      </View>

      {/* Details Row */}
      <View style={styles.detailsBox}>
        {isTransfer ? (
          <View style={styles.transferRow}>
            <View style={styles.accountPill}>
              <Wallet color={theme.colors.textSecondary} size={12} />
              <Text numberOfLines={1} style={styles.accountPillText}>
                {proposal.accountName}
              </Text>
            </View>
            <ArrowRight color={theme.colors.textMuted} size={13} />
            <View style={styles.accountPill}>
              <Wallet color={theme.colors.primary} size={12} />
              <Text numberOfLines={1} style={styles.accountPillText}>
                {proposal.transferAccountName ?? "Destination"}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.infoRow}>
            {/* Category */}
            <View style={styles.metaItem}>
              {proposal.categoryIcon ? (
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: categoryColor ?? theme.colors.surfaceMuted },
                  ]}
                >
                  <IconHelper
                    color={theme.colors.onPrimary}
                    name={proposal.categoryIcon}
                    size={12}
                  />
                </View>
              ) : null}
              <Text numberOfLines={1} style={styles.metaItemText}>
                {proposal.categoryName ?? "Uncategorized"}
              </Text>
            </View>

            {/* Account */}
            <View style={styles.metaItem}>
              <Wallet color={theme.colors.textSecondary} size={12} />
              <Text numberOfLines={1} style={styles.metaItemText}>
                {proposal.accountName}
              </Text>
            </View>
          </View>
        )}

        {proposal.note && proposal.note !== proposal.name ? (
          <Text numberOfLines={1} style={styles.noteText}>
            Note: {proposal.note}
          </Text>
        ) : null}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityLabel="Edit generated transaction"
          accessibilityRole="button"
          onPress={() => onEdit(proposal)}
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Edit3 color={theme.colors.textPrimary} size={14} />
          <Text style={styles.editButtonText}>Tap to Edit</Text>
        </Pressable>

        <Pressable
          accessibilityLabel={saved ? "Transaction already saved" : "Save transaction"}
          accessibilityRole="button"
          disabled={saving || saved}
          onPress={handleSavePress}
          style={({ pressed }) => [
            styles.saveButton,
            saved && styles.saveButtonSaved,
            pressed && !saved && styles.buttonPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.onPrimary} size="small" />
          ) : saved ? (
            <>
              <CheckCircle2 color={theme.colors.onPrimary} size={14} />
              <Text style={styles.saveButtonText}>Saved ✓</Text>
            </>
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </Pressable>
      </View>
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
      letterSpacing: 0.3,
      textTransform: "uppercase",
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
    dateText: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    savedStatusBadge: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    savedStatusText: {
      color: theme.colors.success,
      fontSize: 11,
      fontWeight: "600",
    },
    amountContainer: {
      gap: 2,
    },
    amountText: {
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    expenseAmount: {
      color: theme.colors.textPrimary,
    },
    incomeAmount: {
      color: theme.colors.success,
    },
    transferAmount: {
      color: theme.colors.primary,
    },
    merchantNameText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: "600",
    },
    detailsBox: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      gap: 6,
      padding: 10,
    },
    infoRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    transferRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    accountPill: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    accountPillText: {
      color: theme.colors.textPrimary,
      fontSize: 11,
      fontWeight: "600",
      maxWidth: 100,
    },
    metaItem: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    iconCircle: {
      alignItems: "center",
      borderRadius: 9,
      height: 18,
      justifyContent: "center",
      width: 18,
    },
    metaItemText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
      maxWidth: 130,
    },
    noteText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontStyle: "italic",
    },
    actionsRow: {
      flexDirection: "row",
      gap: 8,
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
    saveButtonSaved: {
      backgroundColor: theme.colors.success,
    },
    saveButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
  });
}
