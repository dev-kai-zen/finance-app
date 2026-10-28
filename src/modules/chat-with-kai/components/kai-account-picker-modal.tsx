import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Search, Wallet, X } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { IconHelper } from "@/components/icon-helper";
import { formatCurrency } from "@/utils/currency";
import {
  accountColor,
  isSystemOthersAccountTypeId,
  type AccountListItem,
} from "@/modules/accounts";

export interface KaiAccountPickerModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: AccountListItem[];
  selectedAccountId?: string | null;
  onSelectAccount: (account: AccountListItem) => void;
}

export function KaiAccountPickerModal({
  visible,
  onClose,
  accounts,
  selectedAccountId,
  onSelectAccount,
}: KaiAccountPickerModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const q = searchQuery.toLowerCase().trim();
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.accountType?.name ?? "").toLowerCase().includes(q),
    );
  }, [accounts, searchQuery]);

  // Group accounts by accountType exactly like AccountPickerModal (excluding pockets)
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
      onRequestClose={handleClose}
      visible={visible}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>
              {t("chatWithKai.pickerSelectAccount")}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={t("chatWithKai.cancel")}
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleClose}
            style={styles.closeBtn}
          >
            <X color={theme.colors.textMuted} size={22} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBoxWrap}>
          <View style={styles.searchBox}>
            <Search color={theme.colors.textMuted} size={18} />
            <TextInput
              autoCapitalize="none"
              onChangeText={setSearchQuery}
              placeholder={t("chatWithKai.pickerSearchAccount")}
              placeholderTextColor={theme.colors.textMuted}
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable hitSlop={6} onPress={() => setSearchQuery("")}>
                <X color={theme.colors.textMuted} size={16} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Account List */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {groupedAccounts.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Wallet color={theme.colors.textMuted} size={36} />
              <Text style={styles.emptyText}>
                {t("chatWithKai.noAccountsFound")}
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
                    const balance =
                      account.currentBalanceMinorUnits !== undefined
                        ? account.currentBalanceMinorUnits
                        : account.openingBalanceMinorUnits;

                    const formattedBalance = formatCurrency(
                      balance,
                      account.currencyCode,
                    );

                    return (
                      <View key={account.id}>
                        {index > 0 && <View style={styles.cardDivider} />}
                        <TouchableOpacity
                          accessibilityLabel={`${account.name}, balance ${formattedBalance}`}
                          accessibilityRole="button"
                          activeOpacity={0.7}
                          onPress={() => handleSelect(account)}
                          style={[
                            styles.accountItem,
                            isSelected && styles.selectedAccountItem,
                          ]}
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
                                color={group.color}
                                name={account.iconKey ?? group.iconKey}
                                size={18}
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
                                {account.accountType?.accountGroup === "liability"
                                  ? "Liability"
                                  : "Asset"}{" "}
                                | {account.accountType?.name ?? "Account"}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.accountItemRight}>
                            <Text
                              style={[
                                styles.accountItemBalance,
                                balance > 0 && styles.positiveBalance,
                                balance < 0 && styles.negativeBalance,
                              ]}
                            >
                              {formattedBalance}
                            </Text>
                            {isSelected && (
                              <View style={styles.checkBadge}>
                                <Check
                                  color={theme.colors.surface}
                                  size={14}
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
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    headerTitleBox: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceElevated,
    },
    searchBoxWrap: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textPrimary,
      paddingVertical: 0,
    },
    listContent: {
      padding: 16,
      paddingBottom: 40,
      gap: 16,
    },
    emptyWrap: {
      padding: 40,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    groupContainer: {
      gap: 8,
    },
    groupHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 4,
    },
    groupDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    groupTitle: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    groupCount: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    groupCards: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden",
    },
    accountItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    selectedAccountItem: {
      backgroundColor: `${theme.colors.primary}10`,
    },
    cardDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginLeft: 54,
    },
    accountItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 10,
    },
    accountIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    accountItemTextCol: {
      flex: 1,
    },
    accountItemName: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    selectedText: {
      color: theme.colors.primary,
      fontWeight: "700",
    },
    accountItemType: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    accountItemRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    accountItemBalance: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    positiveBalance: {
      color: theme.colors.success ?? "#10B981",
    },
    negativeBalance: {
      color: theme.colors.danger ?? "#EF4444",
    },
    checkBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
