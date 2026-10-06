import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Landmark, WalletCards, X } from "lucide-react-native";
import { AppButton, IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountListItem, PocketListItem } from "@/modules/accounts";
import { formatCurrency } from "@/utils/currency";

export interface GoalAccountPickerModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: AccountListItem[];
  pockets?: PocketListItem[];
  selectedAccountIds: string[];
  selectedPocketIds?: string[];
  onConfirm: (accountIds: string[], pocketIds: string[]) => void;
}

export function GoalAccountPickerModal({
  visible,
  onClose,
  accounts,
  pockets = [],
  selectedAccountIds,
  selectedPocketIds = [],
  onConfirm,
}: GoalAccountPickerModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [localSelectedAccountIds, setLocalSelectedAccountIds] =
    useState<string[]>(selectedAccountIds);
  const [localSelectedPocketIds, setLocalSelectedPocketIds] =
    useState<string[]>(selectedPocketIds);

  // Sync with props when opened
  React.useEffect(() => {
    if (visible) {
      setLocalSelectedAccountIds(selectedAccountIds);
      setLocalSelectedPocketIds(selectedPocketIds);
    }
  }, [visible, selectedAccountIds, selectedPocketIds]);

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const toggleAccount = (id: string) => {
    setLocalSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((accId) => accId !== id) : [...prev, id],
    );
  };

  const togglePocket = (id: string) => {
    setLocalSelectedPocketIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id],
    );
  };

  const handleSelectAllAccounts = () => {
    // Only select accounts whose pockets are not currently selected
    const accountsWithoutSelectedPockets = accounts
      .filter((account) =>
        !pockets.some(
          (p) => p.accountId === account.id && localSelectedPocketIds.includes(p.id),
        ),
      )
      .map((a) => a.id);
    setLocalSelectedAccountIds(accountsWithoutSelectedPockets);
  };

  const handleClearAll = () => {
    setLocalSelectedAccountIds([]);
    setLocalSelectedPocketIds([]);
  };

  const totalSelectedBalance = useMemo(() => {
    const selectedAccSet = new Set(localSelectedAccountIds);
    const selectedPockSet = new Set(localSelectedPocketIds);

    const accSum = accounts
      .filter((a) => selectedAccSet.has(a.id))
      .reduce((sum, a) => sum + Math.max(0, a.currentBalanceMinorUnits), 0);

    const pockSum = pockets
      .filter((p) => selectedPockSet.has(p.id))
      .reduce((sum, p) => sum + Math.max(0, p.currentBalanceMinorUnits), 0);

    return accSum + pockSum;
  }, [accounts, pockets, localSelectedAccountIds, localSelectedPocketIds]);

  const handleSave = () => {
    onConfirm(localSelectedAccountIds, localSelectedPocketIds);
    onClose();
  };

  const selectionSummaryText = useMemo(() => {
    const accCount = localSelectedAccountIds.length;
    const pockCount = localSelectedPocketIds.length;

    if (accCount > 0 && pockCount > 0) {
      return `${accCount} ${accCount === 1 ? "account" : "accounts"}, ${pockCount} ${pockCount === 1 ? "pocket" : "pockets"} selected`;
    }
    if (accCount > 0) {
      return `${accCount} ${accCount === 1 ? "account" : "accounts"} selected`;
    }
    if (pockCount > 0) {
      return `${pockCount} ${pockCount === 1 ? "pocket" : "pockets"} selected`;
    }
    return "0 funds selected";
  }, [localSelectedAccountIds, localSelectedPocketIds]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
      visible={visible}
    >
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Close"
            hitSlop={8}
            onPress={onClose}
            style={styles.closeButton}
          >
            <X color={theme.colors.textPrimary} size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>Link Accounts & Pockets</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Quick Toolbar & Rule Guidance */}
        <View style={styles.toolbar}>
          <Text style={styles.toolbarSubtitle}>
            Select accounts or specific pockets to track progress towards this goal.
          </Text>
          <View style={styles.ruleBanner}>
            <Text style={styles.ruleText}>
              To prevent double-counting, an account and one of its own pockets cannot be selected together.
            </Text>
          </View>
          <View style={styles.toolbarActions}>
            <Pressable
              onPress={handleSelectAllAccounts}
              style={styles.toolbarButton}
            >
              <Text style={styles.toolbarButtonText}>Select All Accounts</Text>
            </Pressable>
            <Pressable onPress={handleClearAll} style={styles.toolbarButton}>
              <Text style={styles.toolbarButtonText}>Clear All</Text>
            </Pressable>
          </View>
        </View>

        {/* Content List */}
        <ScrollView contentContainerStyle={styles.scrollList}>
          {/* Accounts Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Accounts</Text>
            <Text style={styles.sectionSubtitle}>
              {accounts.length} available
            </Text>
          </View>

          {accounts.map((account) => {
            const isSelected = localSelectedAccountIds.includes(account.id);
            const childPocketSelected = pockets.find(
              (p) =>
                p.accountId === account.id &&
                localSelectedPocketIds.includes(p.id),
            );
            const isConflicted = !isSelected && Boolean(childPocketSelected);
            const conflictReason = childPocketSelected
              ? `Remove the "${childPocketSelected.name}" pocket first`
              : null;

            return (
              <Pressable
                key={`account-${account.id}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected, disabled: isConflicted }}
                disabled={isConflicted}
                onPress={() => toggleAccount(account.id)}
                style={[
                  styles.itemRow,
                  isSelected && styles.itemRowSelected,
                  isConflicted && styles.itemRowDisabled,
                ]}
              >
                <View style={styles.rowLeft}>
                  {/* Custom Checkbox */}
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                      isConflicted && styles.checkboxDisabled,
                    ]}
                  >
                    {isSelected && (
                      <Check color={theme.colors.onPrimary} size={14} />
                    )}
                  </View>

                  {/* Icon */}
                  <View
                    style={[
                      styles.iconCircle,
                      isConflicted && styles.iconCircleDisabled,
                    ]}
                  >
                    <IconHelper
                      color={
                        isConflicted
                          ? theme.colors.textMuted
                          : theme.colors.primary
                      }
                      name={account.iconKey || "landmark"}
                      size={18}
                    />
                  </View>

                  {/* Name and Type / Conflict */}
                  <View style={styles.itemInfo}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.itemName,
                        isConflicted && styles.itemTextMuted,
                      ]}
                    >
                      {account.name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.itemDetail,
                        isConflicted && styles.conflictText,
                      ]}
                    >
                      {conflictReason ??
                        (account.accountType?.name || "Account")}
                    </Text>
                  </View>
                </View>

                {/* Live Balance */}
                <View style={styles.balanceCol}>
                  <Text
                    style={[
                      styles.balanceAmount,
                      isConflicted && styles.itemTextMuted,
                    ]}
                  >
                    {formatCurrency(
                      account.currentBalanceMinorUnits,
                      account.currencyCode,
                    )}
                  </Text>
                  <Text style={styles.balanceLabel}>Current Balance</Text>
                </View>
              </Pressable>
            );
          })}

          {/* Pockets Section */}
          {pockets.length > 0 && (
            <>
              <View style={[styles.sectionHeaderRow, { marginTop: theme.spacing.md }]}>
                <Text style={styles.sectionTitle}>Pockets</Text>
                <Text style={styles.sectionSubtitle}>
                  {pockets.length} available
                </Text>
              </View>

              {pockets.map((pocket) => {
                const isSelected = localSelectedPocketIds.includes(pocket.id);
                const parentAccount = accountById.get(pocket.accountId);
                const parentAccountSelected = localSelectedAccountIds.includes(
                  pocket.accountId,
                );
                const isConflicted = !isSelected && parentAccountSelected;
                const conflictReason = parentAccountSelected
                  ? `Remove "${parentAccount?.name ?? "parent account"}" first`
                  : null;

                return (
                  <Pressable
                    key={`pocket-${pocket.id}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: isSelected,
                      disabled: isConflicted,
                    }}
                    disabled={isConflicted}
                    onPress={() => togglePocket(pocket.id)}
                    style={[
                      styles.itemRow,
                      isSelected && styles.itemRowSelected,
                      isConflicted && styles.itemRowDisabled,
                    ]}
                  >
                    <View style={styles.rowLeft}>
                      {/* Custom Checkbox */}
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected,
                          isConflicted && styles.checkboxDisabled,
                        ]}
                      >
                        {isSelected && (
                          <Check color={theme.colors.onPrimary} size={14} />
                        )}
                      </View>

                      {/* Pocket Icon */}
                      <View
                        style={[
                          styles.iconCircle,
                          styles.pocketIconCircle,
                          isConflicted && styles.iconCircleDisabled,
                        ]}
                      >
                        <WalletCards
                          color={
                            isConflicted
                              ? theme.colors.textMuted
                              : theme.colors.info
                          }
                          size={18}
                        />
                      </View>

                      {/* Name and Parent / Conflict */}
                      <View style={styles.itemInfo}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.itemName,
                            isConflicted && styles.itemTextMuted,
                          ]}
                        >
                          {pocket.name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.itemDetail,
                            isConflicted && styles.conflictText,
                          ]}
                        >
                          {conflictReason ??
                            `Pocket in ${parentAccount?.name ?? "Account"}`}
                        </Text>
                      </View>
                    </View>

                    {/* Live Balance */}
                    <View style={styles.balanceCol}>
                      <Text
                        style={[
                          styles.balanceAmount,
                          isConflicted && styles.itemTextMuted,
                        ]}
                      >
                        {formatCurrency(
                          pocket.currentBalanceMinorUnits,
                          parentAccount?.currencyCode ?? "PHP",
                        )}
                      </Text>
                      <Text style={styles.balanceLabel}>Pocket Balance</Text>
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}
        </ScrollView>

        {/* Footer Summary & Confirm */}
        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <View>
              <Text style={styles.footerSelectedCount}>
                {selectionSummaryText}
              </Text>
              <Text style={styles.footerTotalLabel}>Combined Balance:</Text>
            </View>
            <Text style={styles.footerTotalAmount}>
              {formatCurrency(totalSelectedBalance)}
            </Text>
          </View>

          <AppButton
            label="Confirm Linked Funds"
            onPress={handleSave}
            variant="primary"
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    toolbar: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: theme.spacing.xs,
    },
    toolbarSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    ruleBanner: {
      backgroundColor: `${theme.colors.info}12`,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.info,
      marginVertical: 2,
    },
    ruleText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },
    toolbarActions: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginTop: 2,
    },
    toolbarButton: {
      paddingVertical: 2,
    },
    toolbarButtonText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    scrollList: {
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: 2,
    },
    sectionTitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    sectionSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
    },
    itemRowSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}08`,
    },
    itemRowDisabled: {
      opacity: 0.6,
      backgroundColor: theme.colors.surfaceElevated,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      flex: 1,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    checkboxSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxDisabled: {
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: theme.borderRadius.round,
      backgroundColor: `${theme.colors.primary}12`,
      alignItems: "center",
      justifyContent: "center",
    },
    pocketIconCircle: {
      backgroundColor: `${theme.colors.info}15`,
    },
    iconCircleDisabled: {
      backgroundColor: `${theme.colors.textMuted}15`,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    itemDetail: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    conflictText: {
      color: theme.colors.danger,
      fontStyle: "italic",
    },
    itemTextMuted: {
      color: theme.colors.textMuted,
    },
    balanceCol: {
      alignItems: "flex-end",
    },
    balanceAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    balanceLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      marginTop: 2,
      textTransform: "uppercase",
    },
    footer: {
      padding: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: theme.spacing.md,
    },
    footerSummary: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    footerSelectedCount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    footerTotalLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    footerTotalAmount: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
