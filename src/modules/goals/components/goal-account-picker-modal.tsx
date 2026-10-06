import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  Check,
  Folder,
  Search,
  WalletCards,
  X,
} from "lucide-react-native";
import { AppButton, IconHelper } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  accountColor,
  isSystemOthersAccountTypeId,
  type AccountListItem,
  type PocketListItem,
} from "@/modules/accounts";
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
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [searchQuery, setSearchQuery] = useState("");
  const [localSelectedAccountIds, setLocalSelectedAccountIds] =
    useState<string[]>(selectedAccountIds);
  const [localSelectedPocketIds, setLocalSelectedPocketIds] =
    useState<string[]>(selectedPocketIds);

  // Sync with props when opened
  React.useEffect(() => {
    if (visible) {
      setLocalSelectedAccountIds(selectedAccountIds);
      setLocalSelectedPocketIds(selectedPocketIds);
      setSearchQuery("");
    }
  }, [visible, selectedAccountIds, selectedPocketIds]);

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

  // Filter accounts and pockets based on search query
  const filteredAccounts = useMemo(() => {
    const activeAccounts = accounts.filter((acc) => !acc.isArchived);
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeAccounts;

    return activeAccounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(query) ||
        acc.accountType?.name?.toLowerCase().includes(query) ||
        pockets.some(
          (pocket) =>
            pocket.accountId === acc.id &&
            !pocket.isArchived &&
            pocket.name.toLowerCase().includes(query),
        ),
    );
  }, [accounts, pockets, searchQuery]);

  // Group accounts by accountType exactly like AccountPickerModal
  const groupedAccounts = useMemo(() => {
    const groups: {
      typeId: string;
      typeName: string;
      color: string;
      iconKey: string;
      accountGroup: string;
      typeSortOrder: number;
      accounts: AccountListItem[];
    }[] = [];

    const map = new Map<string, (typeof groups)[0]>();

    for (const acc of filteredAccounts) {
      const typeId = acc.accountType?.id ?? "others";
      const typeName = acc.accountType?.name ?? "Other Accounts";
      const color = accountColor(
        theme,
        acc.accountType?.color ?? acc.accountType?.hexColorsId ?? null,
      );
      const iconKey = acc.accountType?.iconKey ?? "wallet";
      const accountGroup = acc.accountType?.accountGroup ?? "other";
      const typeSortOrder = acc.accountType?.sortOrder ?? Number.MAX_SAFE_INTEGER;

      let group = map.get(typeId);
      if (!group) {
        group = {
          typeId,
          typeName,
          color,
          iconKey,
          accountGroup,
          typeSortOrder,
          accounts: [],
        };
        map.set(typeId, group);
        groups.push(group);
      }
      group.accounts.push(acc);
    }

    for (const group of groups) {
      group.accounts.sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name) ||
          a.id.localeCompare(b.id),
      );
    }

    const groupOrder: Record<string, number> = {
      asset: 0,
      liability: 1,
      other: 2,
    };

    return groups.sort(
      (a, b) =>
        (groupOrder[a.accountGroup] ?? groupOrder.other) -
          (groupOrder[b.accountGroup] ?? groupOrder.other) ||
        Number(isSystemOthersAccountTypeId(a.typeId)) -
          Number(isSystemOthersAccountTypeId(b.typeId)) ||
        a.typeSortOrder - b.typeSortOrder ||
        a.typeName.localeCompare(b.typeName) ||
        a.typeId.localeCompare(b.typeId),
    );
  }, [filteredAccounts, theme]);

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
      return `${accCount} ${accCount === 1 ? "account" : "accounts"}, ${pockCount} ${pockCount === 1 ? "pocket" : "pockets"}`;
    }
    if (accCount > 0) {
      return `${accCount} ${accCount === 1 ? "account" : "accounts"}`;
    }
    if (pockCount > 0) {
      return `${pockCount} ${pockCount === 1 ? "pocket" : "pockets"}`;
    }
    return "0 funds";
  }, [localSelectedAccountIds, localSelectedPocketIds]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        automaticOffset
        behavior="height"
        style={styles.backdrop}
      >
        <Pressable onPress={onClose} style={styles.scrim} />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextCol}>
              <Text style={styles.headerTitle}>Link Accounts & Pockets</Text>
              <Text style={styles.headerSubtitle}>
                Select accounts or specific pockets to link to this goal
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <X color={theme.colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Search
              color={theme.colors.textMuted}
              size={18}
              style={styles.searchIcon}
            />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              onChangeText={setSearchQuery}
              placeholder="Search account, pocket, or type..."
              placeholderTextColor={theme.colors.textMuted}
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery.length > 0 && Platform.OS !== "ios" && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearSearchBtn}
              >
                <X color={theme.colors.textMuted} size={16} />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Selection Toolbar & Double Counting Rule Banner */}
          <View style={styles.toolbar}>
            <View style={styles.ruleBanner}>
              <Text style={styles.ruleText}>
                An account and its own pockets cannot be selected together to prevent double-counting.
              </Text>
            </View>
            <View style={styles.toolbarActions}>
              <TouchableOpacity
                onPress={handleSelectAllAccounts}
                style={styles.toolbarButton}
              >
                <Text style={styles.toolbarButtonText}>Select All Accounts</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClearAll}
                style={styles.toolbarButton}
              >
                <Text style={styles.toolbarButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Grouped Accounts List */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scrollList}
          >
            {groupedAccounts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No accounts found</Text>
                <Text style={styles.emptyStateDesc}>
                  {searchQuery
                    ? `No accounts matching "${searchQuery}"`
                    : "No available accounts to choose from"}
                </Text>
              </View>
            ) : (
              groupedAccounts.map((group) => (
                <View key={group.typeId} style={styles.groupContainer}>
                  {/* Group Header */}
                  <View style={styles.groupHeaderRow}>
                    <View
                      style={[styles.groupDot, { backgroundColor: group.color }]}
                    />
                    <Text style={[styles.groupTitle, { color: group.color }]}>
                      {group.typeName.toUpperCase()}
                    </Text>
                    <Text style={styles.groupCount}>
                      ({group.accounts.length})
                    </Text>
                  </View>

                  {/* Account Cards Container */}
                  <View style={styles.groupCards}>
                    {group.accounts.map((account, index) => {
                      const isAccountSelected =
                        localSelectedAccountIds.includes(account.id);

                      // Check for pockets of this account
                      const accountPockets = pockets.filter(
                        (p) => p.accountId === account.id && !p.isArchived,
                      );

                      const selectedChildPockets = accountPockets.filter((p) =>
                        localSelectedPocketIds.includes(p.id),
                      );
                      const hasSelectedChildPockets =
                        selectedChildPockets.length > 0;

                      // Account is disabled if child pockets are selected
                      const isAccountDisabled =
                        !isAccountSelected && hasSelectedChildPockets;

                      const formattedBalance = formatCurrency(
                        account.currentBalanceMinorUnits,
                        account.currencyCode,
                      );

                      return (
                        <View key={account.id}>
                          {index > 0 && <View style={styles.cardDivider} />}

                          {/* Account Item Row */}
                          <TouchableOpacity
                            accessibilityRole="checkbox"
                            accessibilityState={{
                              checked: isAccountSelected,
                              disabled: isAccountDisabled,
                            }}
                            activeOpacity={0.7}
                            disabled={isAccountDisabled}
                            onPress={() => toggleAccount(account.id)}
                            style={[
                              styles.accountItem,
                              isAccountSelected && styles.selectedAccountItem,
                              isAccountDisabled && styles.disabledItem,
                            ]}
                          >
                            <View style={styles.accountItemLeft}>
                              {/* Custom Multi-select Checkbox */}
                              <View
                                style={[
                                  styles.checkbox,
                                  isAccountSelected && styles.checkboxSelected,
                                  isAccountDisabled && styles.checkboxDisabled,
                                ]}
                              >
                                {isAccountSelected && (
                                  <Check
                                    color={theme.colors.onPrimary}
                                    size={14}
                                  />
                                )}
                              </View>

                              {/* Account Icon */}
                              <View
                                style={[
                                  styles.accountIconWrap,
                                  {
                                    backgroundColor: `${group.color}15`,
                                    borderColor: `${group.color}30`,
                                  },
                                ]}
                              >
                                <IconHelper
                                  color={group.color}
                                  name={account.iconKey ?? group.iconKey}
                                  size={18}
                                />
                              </View>

                              {/* Name and Type / Conflict note */}
                              <View style={styles.accountItemTextCol}>
                                <Text
                                  numberOfLines={1}
                                  style={[
                                    styles.accountItemName,
                                    isAccountSelected && styles.selectedText,
                                    isAccountDisabled && styles.textDisabled,
                                  ]}
                                >
                                  {account.name}
                                </Text>
                                <Text
                                  numberOfLines={1}
                                  style={[
                                    styles.accountItemType,
                                    isAccountDisabled && styles.conflictText,
                                  ]}
                                >
                                  {isAccountDisabled
                                    ? `Selected pockets active`
                                    : `${account.accountType?.accountGroup === "liability" ? "Liability" : "Asset"} | ${account.accountType?.name ?? "Account"}`}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.accountItemRight}>
                              <Text
                                style={[
                                  styles.accountItemBalance,
                                  account.currentBalanceMinorUnits > 0 &&
                                    styles.positiveBalance,
                                  account.currentBalanceMinorUnits < 0 &&
                                    styles.negativeBalance,
                                  isAccountDisabled && styles.textDisabled,
                                ]}
                              >
                                {formattedBalance}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* Nested Pockets Tree (if account has pockets) */}
                          {accountPockets.length > 0 && (
                            <View style={styles.locationList}>
                              {accountPockets.map((pocket) => {
                                const isPocketSelected =
                                  localSelectedPocketIds.includes(pocket.id);
                                const isPocketDisabled =
                                  !isPocketSelected && isAccountSelected;

                                const formattedPocketBalance = formatCurrency(
                                  pocket.currentBalanceMinorUnits,
                                  account.currencyCode,
                                );

                                return (
                                  <TouchableOpacity
                                    key={pocket.id}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{
                                      checked: isPocketSelected,
                                      disabled: isPocketDisabled,
                                    }}
                                    activeOpacity={0.7}
                                    disabled={isPocketDisabled}
                                    onPress={() => togglePocket(pocket.id)}
                                    style={[
                                      styles.locationItem,
                                      isPocketSelected &&
                                        styles.selectedAccountItem,
                                      isPocketDisabled && styles.disabledItem,
                                    ]}
                                  >
                                    <View style={styles.locationItemLeft}>
                                      {/* Tree Branch Connector */}
                                      <View style={styles.locationBranch} />

                                      {/* Pocket Checkbox */}
                                      <View
                                        style={[
                                          styles.checkbox,
                                          isPocketSelected &&
                                            styles.checkboxSelected,
                                          isPocketDisabled &&
                                            styles.checkboxDisabled,
                                        ]}
                                      >
                                        {isPocketSelected && (
                                          <Check
                                            color={theme.colors.onPrimary}
                                            size={14}
                                          />
                                        )}
                                      </View>

                                      {/* Pocket Icon */}
                                      <View style={styles.locationIconWrap}>
                                        <Folder
                                          color={
                                            isPocketDisabled
                                              ? theme.colors.textMuted
                                              : theme.colors.info
                                          }
                                          size={16}
                                        />
                                      </View>

                                      {/* Pocket Name & Conflict Note */}
                                      <View style={styles.locationTextCol}>
                                        <Text
                                          numberOfLines={1}
                                          style={[
                                            styles.locationName,
                                            isPocketSelected &&
                                              styles.selectedText,
                                            isPocketDisabled &&
                                              styles.textDisabled,
                                          ]}
                                        >
                                          {pocket.name}
                                        </Text>
                                        {isPocketDisabled && (
                                          <Text
                                            style={styles.pocketDisabledText}
                                          >
                                            Included in {account.name}
                                          </Text>
                                        )}
                                      </View>
                                    </View>

                                    <View style={styles.accountItemRight}>
                                      <Text
                                        style={[
                                          styles.locationBalance,
                                          pocket.currentBalanceMinorUnits > 0 &&
                                            styles.positiveBalance,
                                          pocket.currentBalanceMinorUnits < 0 &&
                                            styles.negativeBalance,
                                          isPocketDisabled &&
                                            styles.textDisabled,
                                        ]}
                                      >
                                        {formattedPocketBalance}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer Summary & Confirm Button */}
          <View style={styles.footer}>
            <View style={styles.footerSummary}>
              <View>
                <Text style={styles.footerSelectedCount}>
                  {selectionSummaryText} selected
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
    },
    scrim: {
      backgroundColor: theme.colors.overlay,
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
      height: "82%",
      maxHeight: "85%",
      width: "100%",
      ...theme.shadows.modal,
    },
    header: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    headerTextCol: {
      flex: 1,
    },
    headerTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: theme.typography.fontWeight.bold,
    },
    headerSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    closeBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    searchContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      height: 42,
    },
    searchIcon: {
      marginRight: theme.spacing.sm,
    },
    searchInput: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
      height: "100%",
    },
    clearSearchBtn: {
      padding: 4,
    },
    toolbar: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xs,
      gap: 4,
    },
    ruleBanner: {
      backgroundColor: `${theme.colors.info}12`,
      borderRadius: theme.borderRadius.small,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.info,
      marginTop: 2,
    },
    ruleText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      lineHeight: 14,
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
      flex: 1,
      marginTop: theme.spacing.xs,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xs,
    },
    groupContainer: {
      marginBottom: theme.spacing.md,
    },
    groupHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
      marginBottom: 6,
      paddingHorizontal: 4,
    },
    groupDot: {
      borderRadius: 3,
      height: 6,
      width: 6,
    },
    groupTitle: {
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
    groupCount: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    groupCards: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
      ...theme.shadows.card,
    },
    accountItem: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 56,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    selectedAccountItem: {
      backgroundColor: `${theme.colors.primary}12`,
    },
    disabledItem: {
      opacity: 0.55,
      backgroundColor: theme.colors.surfaceElevated,
    },
    cardDivider: {
      backgroundColor: theme.colors.border,
      height: 1,
      marginLeft: 56,
    },
    accountItemLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginRight: theme.spacing.sm,
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
    accountIconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    accountItemTextCol: {
      flex: 1,
    },
    accountItemName: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    selectedText: {
      color: theme.colors.primary,
    },
    accountItemType: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    conflictText: {
      color: theme.colors.danger,
      fontStyle: "italic",
    },
    textDisabled: {
      color: theme.colors.textMuted,
    },
    accountItemRight: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    accountItemBalance: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
    },
    locationList: {
      backgroundColor: theme.colors.background,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingBottom: 4,
      paddingLeft: theme.spacing.md,
    },
    locationItem: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 46,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    locationItemLeft: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minWidth: 0,
    },
    locationBranch: {
      borderBottomColor: theme.colors.borderStrong,
      borderBottomWidth: 1,
      borderLeftColor: theme.colors.borderStrong,
      borderLeftWidth: 1,
      height: 22,
      width: 14,
      marginRight: -2,
    },
    locationIconWrap: {
      alignItems: "center",
      backgroundColor: `${theme.colors.info}15`,
      borderRadius: theme.borderRadius.small,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    locationTextCol: {
      flex: 1,
    },
    locationName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    pocketDisabledText: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontStyle: "italic",
    },
    locationBalance: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
    },
    positiveBalance: {
      color: theme.colors.textPrimary,
    },
    negativeBalance: {
      color: theme.colors.danger,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xxl,
    },
    emptyStateTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing.xs,
    },
    emptyStateDesc: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      textAlign: "center",
    },
    footer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
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
