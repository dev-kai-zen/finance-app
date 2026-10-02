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
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { IconHelper } from "./icon-helper";
import { formatCurrency } from "@/utils/currency";
import { accountColor } from "@/modules/accounts/constants/account-appearance.constants";
import { isSystemOthersAccountTypeId } from "@/modules/accounts/constants/account-types.constants";
import type {
  AccountListItem,
  PocketListItem,
} from "@/modules/accounts/types/account.types";

export interface AccountPickerModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: AccountListItem[];
  pockets: PocketListItem[];
  selectedAccountId?: string | null;
  selectedPocketId?: string | null;
  onSelectLocation: (account: AccountListItem, pocketId: string | null) => void;
  title?: string;
  excludeAccountId?: string | null;
  allowNone?: boolean;
  noneLabel?: string;
  onSelectNone?: () => void;
  hidePockets?: boolean;
  defaultExpenseAccountId?: string | null;
  defaultExpensePocketId?: string | null;
  defaultIncomeAccountId?: string | null;
  defaultIncomePocketId?: string | null;
  onSetDefaultExpense?: (accountId: string | null, pocketId: string | null) => void;
  onSetDefaultIncome?: (accountId: string | null, pocketId: string | null) => void;
}

export function AccountPickerModal({
  visible,
  onClose,
  accounts,
  pockets,
  selectedAccountId,
  selectedPocketId,
  onSelectLocation,
  title = "Select Account",
  excludeAccountId,
  allowNone,
  noneLabel,
  onSelectNone,
  hidePockets,
  defaultExpenseAccountId,
  defaultExpensePocketId,
  defaultIncomeAccountId,
  defaultIncomePocketId,
  onSetDefaultExpense,
  onSetDefaultIncome,
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
        acc.accountType?.name?.toLowerCase().includes(query) ||
        (acc.pocketEnabled &&
          pockets.some(
            (pocket) =>
              pocket.accountId === acc.id &&
              !pocket.isArchived &&
              pocket.name.toLowerCase().includes(query),
          )),
    );
  }, [accounts, excludeAccountId, pockets, searchQuery, selectedAccountId]);

  // Group accounts by accountType
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

    const map = new Map<string, typeof groups[0]>();

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

  const [longPressTarget, setLongPressTarget] = useState<{
    account: AccountListItem;
    pocketId: string | null;
    locationName: string | null;
  } | null>(null);

  const canSetDefaults = Boolean(onSetDefaultExpense || onSetDefaultIncome);

  const targetIsDefaultExpense = Boolean(
    longPressTarget &&
      longPressTarget.account.id === defaultExpenseAccountId &&
      (longPressTarget.pocketId ?? null) === (defaultExpensePocketId ?? null),
  );

  const targetIsDefaultIncome = Boolean(
    longPressTarget &&
      longPressTarget.account.id === defaultIncomeAccountId &&
      (longPressTarget.pocketId ?? null) === (defaultIncomePocketId ?? null),
  );

  const handleToggleDefaultExpense = () => {
    if (!longPressTarget || !onSetDefaultExpense) return;
    if (targetIsDefaultExpense) {
      onSetDefaultExpense(null, null);
    } else {
      onSetDefaultExpense(longPressTarget.account.id, longPressTarget.pocketId);
    }
    setLongPressTarget(null);
  };

  const handleToggleDefaultIncome = () => {
    if (!longPressTarget || !onSetDefaultIncome) return;
    if (targetIsDefaultIncome) {
      onSetDefaultIncome(null, null);
    } else {
      onSetDefaultIncome(longPressTarget.account.id, longPressTarget.pocketId);
    }
    setLongPressTarget(null);
  };

  const handleSelect = (account: AccountListItem, pocketId: string | null) => {
    setLongPressTarget(null);
    onSelectLocation(account, pocketId);
    setSearchQuery("");
    onClose();
  };

  const handleClose = () => {
    setLongPressTarget(null);
    setSearchQuery("");
    onClose();
  };

  const showNoneOption =
    allowNone &&
    (!searchQuery.trim() ||
      (noneLabel ?? "None (Use first active account)")
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase()));

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        automaticOffset
        behavior="height"
        style={styles.backdrop}
      >
        <Pressable style={styles.scrim} onPress={handleClose} />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextCol}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>
                Choose an account, Available balance, or pocket
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
              placeholder="Search account, pocket, or type..."
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
            {showNoneOption ? (
              <View style={styles.groupContainer}>
                <View style={styles.groupCards}>
                  <TouchableOpacity
                    accessibilityLabel={noneLabel ?? "None (Use first active account)"}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelectNone?.();
                      handleClose();
                    }}
                    style={[
                      styles.accountItem,
                      !selectedAccountId && styles.selectedAccountItem,
                    ]}
                  >
                    <View style={styles.accountItemLeft}>
                      <View
                        style={[
                          styles.accountIconWrap,
                          {
                            backgroundColor: theme.colors.surfaceMuted,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <WalletCards size={18} color={theme.colors.textMuted} />
                      </View>
                      <View style={styles.accountItemTextCol}>
                        <Text
                          style={[
                            styles.accountItemName,
                            !selectedAccountId && styles.selectedText,
                          ]}
                        >
                          {noneLabel ?? "None (Use first active account)"}
                        </Text>
                        <Text style={styles.accountItemType}>Dynamic fallback</Text>
                      </View>
                    </View>
                    {!selectedAccountId ? (
                      <View style={styles.checkBadge}>
                        <Check
                          size={14}
                          color={theme.colors.surface}
                          strokeWidth={3}
                        />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {groupedAccounts.length === 0 && !showNoneOption ? (
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
                      const isSelected =
                        selectedAccountId === account.id && !selectedPocketId;
                      const balance =
                        account.currentBalanceMinorUnits !== undefined
                          ? account.currentBalanceMinorUnits
                          : account.openingBalanceMinorUnits;
                      const activePockets = account.pocketEnabled
                        ? pockets.filter(
                            (pocket) =>
                              pocket.accountId === account.id && !pocket.isArchived,
                          )
                        : [];
                      const allocated = activePockets.reduce(
                        (sum, pocket) => sum + pocket.currentBalanceMinorUnits,
                        0,
                      );
                      const locations = [
                        {
                          id: null as string | null,
                          name: "Available",
                          balance: balance - allocated,
                        },
                        ...activePockets.map((pocket) => ({
                          id: pocket.id as string | null,
                          name: pocket.name,
                          balance: pocket.currentBalanceMinorUnits,
                        })),
                      ];

                      const formattedBalance =
                        account.currencyCode === "PHP"
                          ? formatCurrency(balance, "PHP")
                          : `${balance.toLocaleString()} ${account.currencyCode}`;

                      return (
                        <View key={account.id}>
                          {index > 0 && <View style={styles.cardDivider} />}
                          {account.pocketEnabled && !hidePockets ? (
                            <>
                              <TouchableOpacity
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel={`${account.name}, select available balance, balance ${formattedBalance}`}
                                onPress={() => handleSelect(account, null)}
                                onLongPress={
                                  canSetDefaults
                                    ? () => {
                                        setLongPressTarget({
                                          account,
                                          pocketId: null,
                                          locationName: null,
                                        });
                                      }
                                    : undefined
                                }
                                style={styles.accountItem}
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
                                    <View style={styles.nameRow}>
                                      <Text style={styles.accountItemName}>
                                        {account.name}
                                      </Text>
                                      {defaultExpenseAccountId === account.id &&
                                        !defaultExpensePocketId && (
                                          <View style={styles.defaultBadgeExpense}>
                                            <Text style={styles.defaultBadgeExpenseText}>
                                              Default Exp
                                            </Text>
                                          </View>
                                        )}
                                      {defaultIncomeAccountId === account.id &&
                                        !defaultIncomePocketId && (
                                          <View style={styles.defaultBadgeIncome}>
                                            <Text style={styles.defaultBadgeIncomeText}>
                                              Default Inc
                                            </Text>
                                          </View>
                                        )}
                                    </View>
                                    <Text style={styles.accountItemType}>
                                      {account.accountType?.accountGroup === "liability"
                                        ? "Liability"
                                        : "Asset"} | {account.accountType?.name ?? "Account"}
                                    </Text>
                                  </View>
                                </View>
                                <Text
                                  style={[
                                    styles.accountItemBalance,
                                    balance > 0 && styles.positiveBalance,
                                    balance < 0 && styles.negativeBalance,
                                  ]}
                                >
                                  {formattedBalance}
                                </Text>
                              </TouchableOpacity>
                              <View style={styles.locationList}>
                                {locations.map((location) => {
                                  const locationSelected =
                                    selectedAccountId === account.id &&
                                    (selectedPocketId ?? null) === location.id;
                                  const locationBalance = formatCurrency(
                                    location.balance,
                                    account.currencyCode,
                                  );
                                  const isLocDefaultExp =
                                    defaultExpenseAccountId === account.id &&
                                    (defaultExpensePocketId ?? null) === location.id;
                                  const isLocDefaultInc =
                                    defaultIncomeAccountId === account.id &&
                                    (defaultIncomePocketId ?? null) === location.id;

                                  return (
                                    <TouchableOpacity
                                      key={location.id ?? "main"}
                                      accessibilityLabel={`${account.name}, ${location.name}, balance ${locationBalance}`}
                                      accessibilityRole="button"
                                      activeOpacity={0.7}
                                      onPress={() => handleSelect(account, location.id)}
                                      onLongPress={
                                        canSetDefaults
                                          ? () => {
                                              setLongPressTarget({
                                                account,
                                                pocketId: location.id,
                                                locationName: location.name,
                                              });
                                            }
                                          : undefined
                                      }
                                      style={[
                                        styles.locationItem,
                                        locationSelected && styles.selectedAccountItem,
                                      ]}
                                    >
                                      <View style={styles.locationItemLeft}>
                                        <View style={styles.locationBranch} />
                                        <View style={styles.locationIconWrap}>
                                          {location.id ? (
                                            <Folder color={theme.colors.info} size={16} />
                                          ) : (
                                            <WalletCards
                                              color={theme.colors.textSecondary}
                                              size={16}
                                            />
                                          )}
                                        </View>
                                        <View style={styles.locationTextCol}>
                                          <View style={styles.nameRow}>
                                            <Text
                                              style={[
                                                styles.locationName,
                                                locationSelected && styles.selectedText,
                                              ]}
                                            >
                                              {location.name}
                                            </Text>
                                            {isLocDefaultExp && (
                                              <View style={styles.defaultBadgeExpense}>
                                                <Text style={styles.defaultBadgeExpenseText}>
                                                  Default Exp
                                                </Text>
                                              </View>
                                            )}
                                            {isLocDefaultInc && (
                                              <View style={styles.defaultBadgeIncome}>
                                                <Text style={styles.defaultBadgeIncomeText}>
                                                  Default Inc
                                                </Text>
                                              </View>
                                            )}
                                          </View>
                                        </View>
                                      </View>
                                      <View style={styles.accountItemRight}>
                                        <Text
                                          style={[
                                            styles.locationBalance,
                                            location.balance > 0 && styles.positiveBalance,
                                            location.balance < 0 && styles.negativeBalance,
                                          ]}
                                        >
                                          {locationBalance}
                                        </Text>
                                        {locationSelected ? (
                                          <View style={styles.checkBadge}>
                                            <Check
                                              size={14}
                                              color={theme.colors.surface}
                                              strokeWidth={3}
                                            />
                                          </View>
                                        ) : null}
                                      </View>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </>
                          ) : (
                            <TouchableOpacity
                              onPress={() => handleSelect(account, null)}
                              onLongPress={
                                canSetDefaults
                                  ? () => {
                                      setLongPressTarget({
                                        account,
                                        pocketId: null,
                                        locationName: null,
                                      });
                                    }
                                  : undefined
                              }
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
                                <View style={styles.nameRow}>
                                  <Text
                                    style={[
                                      styles.accountItemName,
                                      isSelected && styles.selectedText,
                                    ]}
                                  >
                                    {account.name}
                                  </Text>
                                  {defaultExpenseAccountId === account.id &&
                                    !defaultExpensePocketId && (
                                      <View style={styles.defaultBadgeExpense}>
                                        <Text style={styles.defaultBadgeExpenseText}>
                                          Default Exp
                                        </Text>
                                      </View>
                                    )}
                                  {defaultIncomeAccountId === account.id &&
                                    !defaultIncomePocketId && (
                                      <View style={styles.defaultBadgeIncome}>
                                        <Text style={styles.defaultBadgeIncomeText}>
                                          Default Inc
                                        </Text>
                                      </View>
                                    )}
                                </View>
                                <Text style={styles.accountItemType}>
                                  {account.accountType?.accountGroup === "liability"
                                    ? "Liability"
                                    : "Asset"} | {account.accountType?.name ?? "Account"}
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
                                    size={14}
                                    color={theme.colors.surface}
                                    strokeWidth={3}
                                  />
                                </View>
                              )}
                            </View>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Default Account Modal Sheet on Long Press */}
        {longPressTarget && (
          <View style={styles.actionModalOverlay}>
            <Pressable
              style={styles.actionModalScrim}
              onPress={() => setLongPressTarget(null)}
            />
            <View style={styles.actionModalCard}>
              <View style={styles.actionModalHeader}>
                <View style={styles.actionModalIconWrap}>
                  <IconHelper
                    name={longPressTarget.account.iconKey ?? "wallet"}
                    size={22}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.actionModalTitleCol}>
                  <Text style={styles.actionModalAccountName} numberOfLines={1}>
                    {longPressTarget.account.name}
                    {longPressTarget.locationName && longPressTarget.pocketId
                      ? ` · ${longPressTarget.locationName}`
                      : ""}
                  </Text>
                  <Text style={styles.actionModalSubtitle}>
                    Default Account Assignment
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setLongPressTarget(null)}
                  style={styles.actionModalCloseBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close default options"
                >
                  <X size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.actionModalDivider} />

              {onSetDefaultExpense && (
                <TouchableOpacity
                  style={[
                    styles.actionOptionBtn,
                    targetIsDefaultExpense && styles.actionOptionBtnActiveExpense,
                  ]}
                  onPress={handleToggleDefaultExpense}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.actionOptionIconWrap,
                      {
                        backgroundColor: targetIsDefaultExpense
                          ? `${theme.colors.danger}20`
                          : theme.colors.surfaceMuted,
                      },
                    ]}
                  >
                    <TrendingDown
                      size={20}
                      color={
                        targetIsDefaultExpense
                          ? theme.colors.danger
                          : theme.colors.textSecondary
                      }
                    />
                  </View>
                  <View style={styles.actionOptionTextCol}>
                    <Text
                      style={[
                        styles.actionOptionTitle,
                        targetIsDefaultExpense && { color: theme.colors.danger },
                      ]}
                    >
                      {targetIsDefaultExpense
                        ? "✓ Default for Expense"
                        : "Set as default for Expense"}
                    </Text>
                    <Text style={styles.actionOptionDesc}>
                      {targetIsDefaultExpense
                        ? "Currently active default · Tap to remove"
                        : "Pre-select when creating expense transactions"}
                    </Text>
                  </View>
                  {targetIsDefaultExpense && (
                    <View
                      style={[
                        styles.actionCheckBadge,
                        { backgroundColor: theme.colors.danger },
                      ]}
                    >
                      <Check size={12} color="#ffffff" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {onSetDefaultIncome && (
                <TouchableOpacity
                  style={[
                    styles.actionOptionBtn,
                    targetIsDefaultIncome && styles.actionOptionBtnActiveIncome,
                  ]}
                  onPress={handleToggleDefaultIncome}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.actionOptionIconWrap,
                      {
                        backgroundColor: targetIsDefaultIncome
                          ? `${theme.colors.success}20`
                          : theme.colors.surfaceMuted,
                      },
                    ]}
                  >
                    <TrendingUp
                      size={20}
                      color={
                        targetIsDefaultIncome
                          ? theme.colors.success
                          : theme.colors.textSecondary
                      }
                    />
                  </View>
                  <View style={styles.actionOptionTextCol}>
                    <Text
                      style={[
                        styles.actionOptionTitle,
                        targetIsDefaultIncome && { color: theme.colors.success },
                      ]}
                    >
                      {targetIsDefaultIncome
                        ? "✓ Default for Income"
                        : "Set as default for Income"}
                    </Text>
                    <Text style={styles.actionOptionDesc}>
                      {targetIsDefaultIncome
                        ? "Currently active default · Tap to remove"
                        : "Pre-select when creating income transactions"}
                    </Text>
                  </View>
                  {targetIsDefaultIncome && (
                    <View
                      style={[
                        styles.actionCheckBadge,
                        { backgroundColor: theme.colors.success },
                      ]}
                    >
                      <Check size={12} color="#ffffff" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionCancelBtn}
                onPress={() => setLongPressTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
      height: "75%",
      maxHeight: "75%",
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
    locationList: {
      backgroundColor: theme.colors.background,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingBottom: theme.spacing.xs,
      paddingLeft: theme.spacing.lg,
    },
    locationItem: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
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
      height: 24,
      width: 16,
    },
    locationIconWrap: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      height: 30,
      justifyContent: "center",
      width: 30,
    },
    locationName: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    locationBalance: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
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
    positiveBalance: {
      color: theme.colors.success,
    },
    negativeBalance: {
      color: theme.colors.danger,
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
    nameRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    locationTextCol: {
      flex: 1,
    },
    defaultBadgeExpense: {
      backgroundColor: `${theme.colors.danger}18`,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    defaultBadgeExpenseText: {
      color: theme.colors.danger,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    defaultBadgeIncome: {
      backgroundColor: `${theme.colors.success}18`,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    defaultBadgeIncomeText: {
      color: theme.colors.success,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    actionModalOverlay: {
      alignItems: "center",
      bottom: 0,
      justifyContent: "center",
      left: 0,
      padding: theme.spacing.lg,
      position: "absolute",
      right: 0,
      top: 0,
      zIndex: 100,
    },
    actionModalScrim: {
      backgroundColor: theme.colors.overlay,
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    actionModalCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.md,
      maxWidth: 380,
      padding: theme.spacing.lg,
      width: "100%",
      ...theme.shadows.modal,
    },
    actionModalHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    actionModalIconWrap: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}15`,
      borderRadius: theme.borderRadius.medium,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    actionModalTitleCol: {
      flex: 1,
    },
    actionModalAccountName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.bold,
    },
    actionModalSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    actionModalCloseBtn: {
      padding: 4,
    },
    actionModalDivider: {
      backgroundColor: theme.colors.border,
      height: 1,
    },
    actionOptionBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    actionOptionBtnActiveExpense: {
      backgroundColor: `${theme.colors.danger}10`,
      borderColor: theme.colors.danger,
    },
    actionOptionBtnActiveIncome: {
      backgroundColor: `${theme.colors.success}10`,
      borderColor: theme.colors.success,
    },
    actionOptionIconWrap: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    actionOptionTextCol: {
      flex: 1,
    },
    actionOptionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    actionOptionDesc: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    actionCheckBadge: {
      alignItems: "center",
      borderRadius: 10,
      height: 20,
      justifyContent: "center",
      width: 20,
    },
    actionCancelBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      justifyContent: "center",
      marginTop: 4,
      paddingVertical: theme.spacing.md,
    },
    actionCancelText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
}
