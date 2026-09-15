import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
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
import { Check, Search, X } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { IconHelper } from "./icon-helper";
import { formatCurrency } from "@/utils/currency";
import type { AccountListItem } from "@/modules/accounts/types/account.types";

export interface AccountPickerModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: AccountListItem[];
  selectedAccountId?: string | null;
  onSelectAccount: (account: AccountListItem) => void;
  title?: string;
  excludeAccountId?: string | null;
}

export function AccountPickerModal({
  visible,
  onClose,
  accounts,
  selectedAccountId,
  onSelectAccount,
  title = "Select Account",
  excludeAccountId,
}: AccountPickerModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAccounts = useMemo(() => {
    let list = accounts.filter(
      (acc) =>
        !acc.isArchived &&
        (!acc.hideFromSelection || acc.id === selectedAccountId),
    );
    if (excludeAccountId) {
      list = list.filter((acc) => acc.id !== excludeAccountId);
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;

    return list.filter(
      (acc) =>
        acc.name.toLowerCase().includes(query) ||
        acc.accountType?.name?.toLowerCase().includes(query),
    );
  }, [accounts, excludeAccountId, searchQuery, selectedAccountId]);

  // Group accounts by accountType
  const groupedAccounts = useMemo(() => {
    const groups: {
      typeId: string;
      typeName: string;
      color: string;
      iconKey: string;
      accounts: AccountListItem[];
    }[] = [];

    const map = new Map<string, typeof groups[0]>();

    for (const acc of filteredAccounts) {
      const typeId = acc.accountType?.id ?? "others";
      const typeName = acc.accountType?.name ?? "Other Accounts";
      const color = acc.accountType?.color ?? theme.colors.primary;
      const iconKey = acc.accountType?.iconKey ?? "wallet";

      let group = map.get(typeId);
      if (!group) {
        group = { typeId, typeName, color, iconKey, accounts: [] };
        map.set(typeId, group);
        groups.push(group);
      }
      group.accounts.push(acc);
    }

    return groups;
  }, [filteredAccounts, theme.colors.primary]);

  const handleSelect = (account: AccountListItem) => {
    onSelectAccount(account);
    setSearchQuery("");
    onClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.scrim} onPress={handleClose} />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextCol}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>
                Choose an account for this transaction
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              accessibilityLabel="Close account picker"
              accessibilityRole="button"
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Search
              size={18}
              color={theme.colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search account by name or type..."
              placeholderTextColor={theme.colors.textMuted}
              style={styles.searchInput}
              clearButtonMode="while-editing"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && Platform.OS !== "ios" && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearSearchBtn}
              >
                <X size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Accounts List Grouped */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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
                      style={[
                        styles.groupDot,
                        { backgroundColor: group.color },
                      ]}
                    />
                    <Text
                      style={[styles.groupTitle, { color: group.color }]}
                    >
                      {group.typeName.toUpperCase()}
                    </Text>
                    <Text style={styles.groupCount}>
                      ({group.accounts.length})
                    </Text>
                  </View>

                  {/* Account Cards */}
                  <View style={styles.groupCards}>
                    {group.accounts.map((account, index) => {
                      const isSelected = selectedAccountId === account.id;
                      const isLiability =
                        account.accountType?.accountGroup === "liability";
                      const balance =
                        account.currentBalanceMinorUnits !== undefined
                          ? account.currentBalanceMinorUnits
                          : account.openingBalanceMinorUnits;

                      const formattedBalance =
                        account.currencyCode === "PHP"
                          ? formatCurrency(balance, "PHP")
                          : `${balance.toLocaleString()} ${account.currencyCode}`;

                      return (
                        <View key={account.id}>
                          {index > 0 && <View style={styles.cardDivider} />}
                          <TouchableOpacity
                            onPress={() => handleSelect(account)}
                            activeOpacity={0.7}
                            style={[
                              styles.accountItem,
                              isSelected && styles.selectedAccountItem,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`${account.name}, balance ${formattedBalance}`}
                          >
                            <View style={styles.accountItemLeft}>
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
                                  name={account.iconKey ?? group.iconKey}
                                  size={18}
                                  color={group.color}
                                />
                              </View>

                              <View style={styles.accountItemTextCol}>
                                <Text
                                  numberOfLines={1}
                                  style={[
                                    styles.accountItemName,
                                    isSelected && styles.selectedText,
                                  ]}
                                >
                                  {account.name}
                                </Text>
                                <Text style={styles.accountItemType}>
                                  {account.accountType?.name ?? "Account"}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.accountItemRight}>
                              <Text
                                style={[
                                  styles.accountItemBalance,
                                  isLiability && styles.liabilityBalance,
                                  isSelected && styles.selectedBalanceText,
                                ]}
                              >
                                {formattedBalance}
                              </Text>
                              {isSelected && (
                                <View style={styles.checkBadge}>
                                  <Check
                                    size={14}
                                    color={theme.colors.surface}
                                    strokeWidth={3}
                                  />
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
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
      backgroundColor: "rgba(0, 0, 0, 0.55)",
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
      maxHeight: "85%",
      minHeight: "50%",
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
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      height: 44,
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
    scrollList: {
      flex: 1,
      marginTop: theme.spacing.sm,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
    groupContainer: {
      marginBottom: theme.spacing.lg,
    },
    groupHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
      marginBottom: theme.spacing.xs,
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
      minHeight: 58,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    selectedAccountItem: {
      backgroundColor: `${theme.colors.primary}12`,
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
      gap: theme.spacing.md,
      marginRight: theme.spacing.sm,
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
    accountItemRight: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    accountItemBalance: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.bold,
      fontVariant: ["tabular-nums"],
    },
    liabilityBalance: {
      color: theme.colors.warning,
    },
    selectedBalanceText: {
      color: theme.colors.primary,
    },
    checkBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      height: 20,
      justifyContent: "center",
      width: 20,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: theme.spacing.xxl,
    },
    emptyStateTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: 4,
    },
    emptyStateDesc: {
      color: theme.colors.textMuted,
      fontSize: 13,
      textAlign: "center",
    },
  });
}
