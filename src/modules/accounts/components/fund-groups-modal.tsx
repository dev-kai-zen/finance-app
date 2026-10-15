import {
  AlertCircle,
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Folder,
  Landmark,
  Layers3,
  Plus,
  WalletCards,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ConfirmModal,
  FullScreenFormModal,
  IconHelper,
  InfoModal,
  ScreenTitleWithHelp,
  NotificationModal,
} from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountSearchBox } from "@/modules/accounts/components/account-search-box";
import { accountColor } from "@/modules/accounts/constants/account-appearance.constants";
import { isSystemOthersAccountTypeId } from "@/modules/accounts/constants/account-types.constants";
import { useFundGroupMutations } from "@/modules/accounts/hooks/use-fund-group-mutations";
import type {
  AccountListItem,
  PocketListItem,
} from "@/modules/accounts/types/account.types";
import type {
  FundGroupInput,
  FundGroupListItem,
} from "@/modules/accounts/types/fund-group.types";
import { formatCurrency } from "@/utils/currency";

type EditorState = {
  id?: string;
  initial: FundGroupInput;
  value: FundGroupInput;
};

export function FundGroupsModal({
  visible,
  groups,
  accounts,
  pockets,
  loading,
  loadError,
  onClose,
  onRefresh,
}: {
  visible: boolean;
  groups: FundGroupListItem[];
  accounts: AccountListItem[];
  pockets: PocketListItem[];
  loading: boolean;
  loadError: string | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const mutations = useFundGroupMutations(onRefresh);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [confirmAction, setConfirmAction] = useState<"discard" | "delete" | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [ruleInfoVisible, setRuleInfoVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setEditor(null);
      setConfirmAction(null);
      setMemberSearchQuery("");
      setExpandedGroupIds(new Set());
      setRuleInfoVisible(false);
      setHelpVisible(false);
      mutations.clearError();
    }
  }, [visible]);

  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const assignedGroups = useMemo(() => {
    const result = new Map<string, FundGroupListItem>();
    for (const group of groups) {
      for (const accountId of group.accountIds) {
        result.set(`account:${accountId}`, group);
      }
      for (const pocketId of group.pocketIds) {
        result.set(`pocket:${pocketId}`, group);
      }
    }
    return result;
  }, [groups]);

  const normalizedMemberSearch = memberSearchQuery.trim().toLocaleLowerCase();

  const filteredAccounts = useMemo(() => {
    if (!editor) return [];
    const selectedAccountIds = new Set(editor.value.accountIds);
    const selectedPocketIds = new Set(editor.value.pocketIds);
    let list = accounts.filter(
      (account) => !account.isArchived || selectedAccountIds.has(account.id),
    );
    if (!normalizedMemberSearch) return list;

    return list.filter(
      (account) =>
        account.name.toLocaleLowerCase().includes(normalizedMemberSearch) ||
        account.accountType?.name.toLocaleLowerCase().includes(normalizedMemberSearch) ||
        pockets.some((pocket) => {
          if (pocket.accountId !== account.id) return false;
          const archived = pocket.isArchived || account.isArchived;
          if (archived && !selectedPocketIds.has(pocket.id)) return false;
          return (
            pocket.name.toLocaleLowerCase().includes(normalizedMemberSearch) ||
            account.name.toLocaleLowerCase().includes(normalizedMemberSearch)
          );
        }),
    );
  }, [accounts, editor, normalizedMemberSearch, pockets]);

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

    for (const account of filteredAccounts) {
      const typeId = account.accountType?.id ?? "others";
      const typeName = account.accountType?.name ?? "Other Accounts";
      const color = accountColor(
        theme,
        account.accountType?.color ?? account.accountType?.hexColorsId ?? null,
      );
      const iconKey = account.accountType?.iconKey ?? "wallet";
      const accountGroup = account.accountType?.accountGroup ?? "other";
      const typeSortOrder = account.accountType?.sortOrder ?? Number.MAX_SAFE_INTEGER;

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
      group.accounts.push(account);
    }

    for (const group of groups) {
      group.accounts.sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(right.name) ||
          left.id.localeCompare(right.id),
      );
    }

    const groupOrder: Record<string, number> = {
      asset: 0,
      liability: 1,
      other: 2,
    };

    return groups.sort(
      (left, right) =>
        (groupOrder[left.accountGroup] ?? groupOrder.other) -
          (groupOrder[right.accountGroup] ?? groupOrder.other) ||
        Number(isSystemOthersAccountTypeId(left.typeId)) -
          Number(isSystemOthersAccountTypeId(right.typeId)) ||
        left.typeSortOrder - right.typeSortOrder ||
        left.typeName.localeCompare(right.typeName) ||
        left.typeId.localeCompare(right.typeId),
    );
  }, [filteredAccounts, theme]);

  const memberSelectionSummary = useMemo(() => {
    if (!editor) return "";
    const accountCount = editor.value.accountIds.length;
    const pocketCount = editor.value.pocketIds.length;
    const parts = [
      accountCount > 0
        ? `${accountCount} account${accountCount === 1 ? "" : "s"}`
        : null,
      pocketCount > 0
        ? `${pocketCount} pocket${pocketCount === 1 ? "" : "s"}`
        : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "None selected";
  }, [editor]);

  const dirty = editor
    ? JSON.stringify(editor.initial) !== JSON.stringify(editor.value)
    : false;

  const openCreate = () => {
    const value: FundGroupInput = {
      name: "",
      accountIds: [],
      pocketIds: [],
    };
    mutations.clearError();
    setMemberSearchQuery("");
    setEditor({ initial: value, value });
  };

  const openEdit = (group: FundGroupListItem) => {
    const value: FundGroupInput = {
      name: group.name,
      accountIds: group.accountIds,
      pocketIds: group.pocketIds,
    };
    mutations.clearError();
    setMemberSearchQuery("");
    setEditor({ id: group.id, initial: value, value });
  };

  const toggleGroupMembers = (groupId: string) => {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const requestBack = () => {
    if (!editor) {
      onClose();
      return;
    }
    if (dirty) {
      setConfirmAction("discard");
      return;
    }
    setEditor(null);
    setMemberSearchQuery("");
    mutations.clearError();
  };

  const toggleAccountMember = (accountId: string) => {
    if (!editor || mutations.pending) return;
    const assigned = assignedGroups.get(`account:${accountId}`);
    if (assigned && assigned.id !== editor.id) return;
    setEditor((current) => {
      if (!current) return current;
      const selected = current.value.accountIds.includes(accountId);
      return {
        ...current,
        value: {
          ...current.value,
          accountIds: selected
            ? current.value.accountIds.filter((id) => id !== accountId)
            : [...current.value.accountIds, accountId],
        },
      };
    });
  };

  const togglePocketMember = (pocketId: string) => {
    if (!editor || mutations.pending) return;
    const assigned = assignedGroups.get(`pocket:${pocketId}`);
    if (assigned && assigned.id !== editor.id) return;
    setEditor((current) => {
      if (!current) return current;
      const selected = current.value.pocketIds.includes(pocketId);
      return {
        ...current,
        value: {
          ...current.value,
          pocketIds: selected
            ? current.value.pocketIds.filter((id) => id !== pocketId)
            : [...current.value.pocketIds, pocketId],
        },
      };
    });
  };

  const save = () => {
    if (!editor) return;
    void mutations.save(editor.value, editor.id).then((saved) => {
      if (saved) {
        setEditor(null);
        setMemberSearchQuery("");
      }
    });
  };

  const confirm = () => {
    if (confirmAction === "discard") {
      setConfirmAction(null);
      setEditor(null);
      setMemberSearchQuery("");
      mutations.clearError();
      return;
    }
    if (confirmAction === "delete" && editor?.id) {
      void mutations.remove(editor.id).then((removed) => {
        if (removed) {
          setConfirmAction(null);
          setEditor(null);
          setMemberSearchQuery("");
        }
      });
    }
  };

  const managerHeader = (
    <Pressable
      accessibilityLabel="Create Fund Group"
      accessibilityRole="button"
      disabled={loading}
      onPress={openCreate}
      style={[styles.headerButton, loading && styles.disabled]}
    >
      <Plus color={theme.colors.onPrimary} size={20} />
    </Pressable>
  );

  const managerTitle = (
    <ScreenTitleWithHelp
      accessibilityHint="Displays help for Fund Groups"
      accessibilityLabel="Fund Groups help"
      onPressHelp={() => setHelpVisible(true)}
      title="Fund Groups"
    />
  );

  const memberPickerEmptyMessage = normalizedMemberSearch
    ? `No accounts match “${memberSearchQuery.trim()}”.`
    : "Create or restore an account first.";

  return (
    <>
      <FullScreenFormModal
        deleteDisabled={mutations.pending}
        pending={mutations.pending}
        saveDisabled={
          !editor?.value.name.trim() ||
          editor.value.accountIds.length + editor.value.pocketIds.length === 0
        }
        title={editor ? (editor.id ? "Edit Fund Group" : "New Fund Group") : "Fund Groups"}
        titleAlign="left"
        visible={visible}
        headerRight={editor ? undefined : managerHeader}
        headerTitle={editor ? undefined : managerTitle}
        onClose={requestBack}
        onDelete={editor?.id ? () => setConfirmAction("delete") : undefined}
        onSave={editor ? save : undefined}
      >
        {editor ? (
          <ScrollView
            contentContainerStyle={styles.editorContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Group Name</Text>
              <TextInput
                accessibilityLabel="Fund Group name"
                editable={!mutations.pending}
                maxLength={100}
                placeholder="Microbusiness"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.textInput}
                value={editor.value.name}
                onChangeText={(name) =>
                  setEditor((current) => current
                    ? { ...current, value: { ...current.value, name } }
                    : current)
                }
              />
            </View>

            <AccountSearchBox
              accessibilityLabel="Search Fund Group accounts and pockets"
              clearAccessibilityLabel="Clear Fund Group member search"
              placeholder="Search account, pocket, or type..."
              value={memberSearchQuery}
              onChangeText={setMemberSearchQuery}
            />

            <View style={styles.selectionHeader}>
              <View style={styles.selectionTitleRow}>
                <Text style={styles.fieldLabel}>Accounts &amp; pockets</Text>
                <Pressable
                  accessibilityHint="Displays the rule for selecting accounts and pockets"
                  accessibilityLabel="Selection rule information"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setRuleInfoVisible(true)}
                  style={({ pressed }) => [
                    styles.infoIconButton,
                    pressed && styles.infoIconButtonPressed,
                  ]}
                >
                  <AlertCircle color={theme.colors.textSecondary} size={15} />
                </Pressable>
              </View>
              <Text style={styles.selectionCount}>{memberSelectionSummary}</Text>
            </View>

            {groupedAccounts.length === 0 ? (
              <View style={styles.sectionEmptyCard}>
                <Text style={styles.emptyText}>{memberPickerEmptyMessage}</Text>
              </View>
            ) : (
              groupedAccounts.map((typeGroup) => (
                <View key={typeGroup.typeId} style={styles.typeGroupContainer}>
                  <View style={styles.typeGroupHeaderRow}>
                    <View
                      style={[styles.typeGroupDot, { backgroundColor: typeGroup.color }]}
                    />
                    <Text style={[styles.typeGroupTitle, { color: typeGroup.color }]}>
                      {typeGroup.typeName.toUpperCase()}
                    </Text>
                    <Text style={styles.typeGroupCount}>
                      ({typeGroup.accounts.length})
                    </Text>
                  </View>

                  <View style={styles.typeGroupCards}>
                    {typeGroup.accounts.map((account, index) => {
                      const isAccountSelected = editor.value.accountIds.includes(account.id);
                      const assignedAccount = assignedGroups.get(`account:${account.id}`);
                      const accountAssignedElsewhere =
                        !!assignedAccount && assignedAccount.id !== editor.id;

                      const accountPockets = pockets.filter((pocket) => {
                        if (pocket.accountId !== account.id) return false;
                        const archived = pocket.isArchived || account.isArchived;
                        return !archived || editor.value.pocketIds.includes(pocket.id);
                      });

                      const selectedChildPockets = accountPockets.filter((pocket) =>
                        editor.value.pocketIds.includes(pocket.id),
                      );
                      const hasSelectedChildPockets = selectedChildPockets.length > 0;
                      const isAccountConflictDisabled =
                        !isAccountSelected && hasSelectedChildPockets;
                      const isAccountDisabled =
                        accountAssignedElsewhere || isAccountConflictDisabled;

                      const formattedBalance = formatCurrency(
                        account.currentBalanceMinorUnits,
                        account.currencyCode,
                      );

                      let accountDetail = `${account.accountType?.accountGroup === "liability" ? "Liability" : "Asset"} | ${account.accountType?.name ?? "Account"}`;
                      if (accountAssignedElsewhere) {
                        accountDetail = `In ${assignedAccount.name}`;
                      } else if (isAccountConflictDisabled) {
                        accountDetail = "Selected pockets active";
                      }

                      return (
                        <View key={account.id}>
                          {index > 0 ? <View style={styles.cardDivider} /> : null}
                          <Pressable
                            accessibilityLabel={`${account.name}, ${formattedBalance}${accountAssignedElsewhere ? `, In ${assignedAccount.name}` : ""}`}
                            accessibilityRole="checkbox"
                            accessibilityState={{
                              checked: isAccountSelected,
                              disabled: isAccountDisabled,
                            }}
                            disabled={isAccountDisabled || mutations.pending}
                            onPress={() => toggleAccountMember(account.id)}
                            style={({ pressed }) => [
                              styles.accountItem,
                              isAccountSelected && styles.accountItemSelected,
                              isAccountDisabled && styles.memberItemDisabled,
                              pressed && !isAccountDisabled && styles.rowPressed,
                            ]}
                          >
                            <View style={styles.accountItemLeft}>
                              <View
                                style={[
                                  styles.checkBox,
                                  isAccountSelected && styles.checkBoxSelected,
                                  isAccountDisabled && styles.checkBoxDisabled,
                                ]}
                              >
                                {isAccountSelected ? (
                                  <Check color={theme.colors.onPrimary} size={14} />
                                ) : null}
                              </View>
                              <View
                                style={[
                                  styles.accountIconWrap,
                                  {
                                    backgroundColor: `${typeGroup.color}15`,
                                    borderColor: `${typeGroup.color}30`,
                                  },
                                ]}
                              >
                                <IconHelper
                                  color={typeGroup.color}
                                  name={account.iconKey ?? typeGroup.iconKey}
                                  size={18}
                                />
                              </View>
                              <View style={styles.accountItemTextCol}>
                                <View style={styles.accountTitleRow}>
                                  <Text
                                    numberOfLines={1}
                                    style={[
                                      styles.accountItemName,
                                      isAccountSelected && styles.accountItemNameSelected,
                                      isAccountDisabled && styles.textDisabled,
                                    ]}
                                  >
                                    {account.name}
                                  </Text>
                                  {account.isArchived ? (
                                    <View style={styles.archivedBadge}>
                                      <Archive color={theme.colors.textMuted} size={11} />
                                      <Text style={styles.archivedBadgeText}>Archived</Text>
                                    </View>
                                  ) : null}
                                </View>
                                <Text
                                  numberOfLines={1}
                                  style={[
                                    styles.accountItemType,
                                    isAccountConflictDisabled && styles.conflictText,
                                    accountAssignedElsewhere && styles.conflictText,
                                  ]}
                                >
                                  {accountDetail}
                                </Text>
                              </View>
                            </View>
                            <Text
                              style={[
                                styles.accountItemBalance,
                                account.currentBalanceMinorUnits > 0 && styles.positiveBalance,
                                account.currentBalanceMinorUnits < 0 && styles.negativeBalance,
                                isAccountDisabled && styles.textDisabled,
                              ]}
                            >
                              {formattedBalance}
                            </Text>
                          </Pressable>

                          {accountPockets.length > 0 ? (
                            <View style={styles.locationList}>
                              {accountPockets.map((pocket) => {
                                const isPocketSelected = editor.value.pocketIds.includes(
                                  pocket.id,
                                );
                                const assignedPocket = assignedGroups.get(
                                  `pocket:${pocket.id}`,
                                );
                                const pocketAssignedElsewhere =
                                  !!assignedPocket && assignedPocket.id !== editor.id;
                                const isPocketConflictDisabled =
                                  !isPocketSelected && isAccountSelected;
                                const isPocketDisabled =
                                  pocketAssignedElsewhere || isPocketConflictDisabled;
                                const pocketArchived =
                                  pocket.isArchived || account.isArchived;
                                const formattedPocketBalance = formatCurrency(
                                  pocket.currentBalanceMinorUnits,
                                  account.currencyCode,
                                );

                                return (
                                  <Pressable
                                    key={pocket.id}
                                    accessibilityLabel={`${pocket.name}, ${formattedPocketBalance}${pocketAssignedElsewhere ? `, In ${assignedPocket.name}` : ""}`}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{
                                      checked: isPocketSelected,
                                      disabled: isPocketDisabled,
                                    }}
                                    disabled={isPocketDisabled || mutations.pending}
                                    onPress={() => togglePocketMember(pocket.id)}
                                    style={({ pressed }) => [
                                      styles.locationItem,
                                      isPocketSelected && styles.accountItemSelected,
                                      isPocketDisabled && styles.memberItemDisabled,
                                      pressed && !isPocketDisabled && styles.rowPressed,
                                    ]}
                                  >
                                    <View style={styles.locationItemLeft}>
                                      <View style={styles.locationBranch} />
                                      <View
                                        style={[
                                          styles.checkBox,
                                          isPocketSelected && styles.checkBoxSelected,
                                          isPocketDisabled && styles.checkBoxDisabled,
                                        ]}
                                      >
                                        {isPocketSelected ? (
                                          <Check color={theme.colors.onPrimary} size={14} />
                                        ) : null}
                                      </View>
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
                                      <View style={styles.locationTextCol}>
                                        <View style={styles.accountTitleRow}>
                                          <Text
                                            numberOfLines={1}
                                            style={[
                                              styles.locationName,
                                              isPocketSelected && styles.accountItemNameSelected,
                                              isPocketDisabled && styles.textDisabled,
                                            ]}
                                          >
                                            {pocket.name}
                                          </Text>
                                          {pocketArchived ? (
                                            <View style={styles.archivedBadge}>
                                              <Archive
                                                color={theme.colors.textMuted}
                                                size={11}
                                              />
                                              <Text style={styles.archivedBadgeText}>
                                                Archived
                                              </Text>
                                            </View>
                                          ) : null}
                                        </View>
                                        {pocketAssignedElsewhere ? (
                                          <Text style={styles.conflictText}>
                                            In {assignedPocket.name}
                                          </Text>
                                        ) : isPocketConflictDisabled ? (
                                          <Text style={styles.pocketDisabledText}>
                                            Included in {account.name}
                                          </Text>
                                        ) : null}
                                      </View>
                                    </View>
                                    <Text
                                      style={[
                                        styles.locationBalance,
                                        pocket.currentBalanceMinorUnits > 0 &&
                                          styles.positiveBalance,
                                        pocket.currentBalanceMinorUnits < 0 &&
                                          styles.negativeBalance,
                                        isPocketDisabled && styles.textDisabled,
                                      ]}
                                    >
                                      {formattedPocketBalance}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.managerContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <ActivityIndicator
                accessibilityLabel="Loading Fund Groups"
                color={theme.colors.primary}
                size="large"
                style={styles.loading}
              />
            ) : loadError ? (
              <View style={styles.emptyCard}>
                <Text selectable style={styles.errorText}>{loadError}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={onRefresh}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : groups.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Layers3 color={theme.colors.textMuted} size={30} />
                </View>
                <Text style={styles.emptyTitle}>No Fund Groups yet</Text>
                <Text style={styles.emptyText}>
                  Create a group such as Microbusiness, then select its accounts or pockets.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={openCreate}
                  style={styles.primaryButton}
                >
                  <Plus color={theme.colors.onPrimary} size={17} />
                  <Text style={styles.primaryButtonText}>Create Fund Group</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.groupList}>
                {groups.map((group) => {
                  const totals = Object.entries(group.totalsByCurrency).sort(([a], [b]) =>
                    a.localeCompare(b),
                  );
                  const memberSummary = [
                    group.accountIds.length > 0
                      ? `${group.accountIds.length} account${group.accountIds.length === 1 ? "" : "s"}`
                      : null,
                    group.pocketIds.length > 0
                      ? `${group.pocketIds.length} pocket${group.pocketIds.length === 1 ? "" : "s"}`
                      : null,
                  ].filter(Boolean).join(" · ");
                  const hasAccounts = group.accountIds.length > 0;
                  const hasPockets = group.pocketIds.length > 0;
                  const membersExpanded = expandedGroupIds.has(group.id);
                  return (
                    <View key={group.id} style={styles.groupCard}>
                      <Pressable
                        accessibilityLabel={`Edit ${group.name}`}
                        accessibilityRole="button"
                        onPress={() => openEdit(group)}
                        style={({ pressed }) => [
                          styles.groupSummaryRow,
                          pressed && styles.rowPressed,
                        ]}
                      >
                        <View style={styles.groupIcon}>
                          {hasAccounts && hasPockets ? (
                            <Layers3 color={theme.colors.primary} size={21} />
                          ) : hasAccounts ? (
                            <Landmark color={theme.colors.primary} size={21} />
                          ) : (
                            <WalletCards color={theme.colors.primary} size={21} />
                          )}
                        </View>
                        <View style={styles.groupCopy}>
                          <Text numberOfLines={1} style={styles.groupName}>{group.name}</Text>
                          <Text style={styles.groupMeta}>
                            {memberSummary || "No members"}
                            {group.archivedMemberCount > 0
                              ? ` · ${group.archivedMemberCount} archived`
                              : ""}
                          </Text>
                        </View>
                        <View style={styles.totalColumn}>
                          {totals.length > 0 ? totals.map(([currency, total]) => (
                            <Text key={currency} style={styles.groupTotal}>
                              {formatCurrency(total, currency)}
                            </Text>
                          )) : (
                            <Text style={styles.groupMeta}>No active total</Text>
                          )}
                        </View>
                        <ChevronRight color={theme.colors.textMuted} size={18} />
                      </Pressable>

                      <Pressable
                        accessibilityLabel={`${membersExpanded ? "Hide" : "Show"} members of ${group.name}`}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: membersExpanded }}
                        onPress={() => toggleGroupMembers(group.id)}
                        style={({ pressed }) => [
                          styles.memberToggle,
                          pressed && styles.memberActionPressed,
                        ]}
                      >
                        <Text style={styles.memberToggleText}>
                          {group.members.length} {group.members.length === 1 ? "member" : "members"}
                        </Text>
                        {membersExpanded ? (
                          <ChevronUp color={theme.colors.primary} size={16} />
                        ) : (
                          <ChevronDown color={theme.colors.primary} size={16} />
                        )}
                      </Pressable>

                      {membersExpanded ? (
                        <View style={styles.memberPanel}>
                          <Text style={styles.memberPanelTitle}>ACCOUNTS &amp; POCKETS</Text>
                          {group.members.map((member) => (
                            <View
                              key={`${member.kind}:${member.id}`}
                              accessibilityLabel={`${member.name}, ${member.kind}, ${formatCurrency(member.currentBalanceMinorUnits, member.currencyCode)}${member.isArchived ? ", archived" : ""}`}
                              style={styles.memberRow}
                            >
                              <View style={styles.memberIcon}>
                                {member.kind === "account" ? (
                                  <Landmark color={theme.colors.primary} size={16} />
                                ) : (
                                  <WalletCards color={theme.colors.info} size={16} />
                                )}
                              </View>
                              <View style={styles.memberCopy}>
                                <Text numberOfLines={1} style={styles.memberName}>
                                  {member.name}
                                </Text>
                                <Text numberOfLines={1} style={styles.memberDetail}>
                                  {member.kind === "account"
                                    ? "Account"
                                    : `Pocket in ${member.parentName ?? "account"}`}
                                  {member.isArchived ? " · Archived" : ""}
                                </Text>
                              </View>
                              <Text style={styles.memberAmount}>
                                {formatCurrency(
                                  member.currentBalanceMinorUnits,
                                  member.currencyCode,
                                )}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </FullScreenFormModal>

      <ConfirmModal
        confirmLabel={confirmAction === "delete" ? "Delete Group" : "Discard"}
        message={
          confirmAction === "delete"
            ? `Delete "${editor?.value.name || "this Fund Group"}"? Its accounts or pockets will not be deleted.`
            : "Discard your unsaved Fund Group changes?"
        }
        pending={mutations.pending}
        title={confirmAction === "delete" ? "Delete Fund Group?" : "Discard changes?"}
        visible={confirmAction !== null}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirm}
      />

      <InfoModal
        buttonLabel="OK"
        message="An account and its own pockets cannot be selected together to prevent double counting."
        onClose={() => setRuleInfoVisible(false)}
        title="Double Counting"
        visible={ruleInfoVisible}
      />

      <InfoModal
        message="Combine related accounts and pockets into named groups without moving money. Each item can belong to one Fund Group."
        onClose={() => setHelpVisible(false)}
        title="Fund Groups"
        visible={helpVisible}
      />

      <NotificationModal
        message={mutations.error ?? ""}
        onClose={mutations.clearError}
        title="Unable to update Fund Group"
        variant="error"
        visible={visible && Boolean(mutations.error)}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    managerContent: {
      gap: theme.spacing.lg,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    editorContent: {
      gap: theme.spacing.lg,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    headerButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    disabled: { opacity: 0.5 },
    loading: { marginVertical: theme.spacing.xxxl },
    groupList: { gap: theme.spacing.sm },
    groupCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
    },
    groupSummaryRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 76,
      padding: theme.spacing.md,
    },
    rowPressed: { backgroundColor: theme.colors.surfaceMuted },
    groupIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}16`,
      borderRadius: theme.borderRadius.medium,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    groupCopy: { flex: 1, minWidth: 0 },
    groupName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    groupMeta: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 3,
    },
    totalColumn: { alignItems: "flex-end", gap: 2 },
    groupTotal: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
    },
    memberToggle: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
      marginLeft: theme.spacing.md + 42 + theme.spacing.md,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    memberToggleText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    memberActionPressed: { opacity: 0.65 },
    memberPanel: {
      backgroundColor: theme.colors.surfaceMuted,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    memberPanelTitle: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.7,
      paddingBottom: theme.spacing.xs,
    },
    memberRow: {
      alignItems: "center",
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 58,
      paddingVertical: theme.spacing.sm,
    },
    memberIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    memberCopy: { flex: 1, minWidth: 0 },
    memberName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    memberDetail: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    memberAmount: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.medium,
    },
    emptyCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.xl,
    },
    emptyIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 60,
      justifyContent: "center",
      marginBottom: theme.spacing.xs,
      width: 60,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
      maxWidth: 360,
      textAlign: "center",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 44,
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    retryButton: {
      borderColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    retryText: {
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    fieldGroup: { gap: theme.spacing.sm },
    fieldLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    textInput: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    selectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    selectionTitleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    infoIconButton: {
      alignItems: "center",
      justifyContent: "center",
      padding: 2,
    },
    infoIconButtonPressed: {
      opacity: 0.6,
    },
    selectionCount: {
      color: theme.colors.primary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.xs,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
      marginLeft: theme.spacing.sm,
      textAlign: "right",
    },
    sectionEmptyCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
    },
    typeGroupContainer: {
      gap: theme.spacing.xs,
    },
    typeGroupHeaderRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 4,
    },
    typeGroupDot: {
      borderRadius: 3,
      height: 6,
      width: 6,
    },
    typeGroupTitle: {
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
    typeGroupCount: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    typeGroupCards: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
    },
    accountItem: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 56,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    accountItemSelected: {
      backgroundColor: `${theme.colors.primary}12`,
    },
    memberItemDisabled: {
      backgroundColor: theme.colors.surfaceElevated,
      opacity: 0.55,
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
      minWidth: 0,
    },
    checkBox: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1.5,
      height: 22,
      justifyContent: "center",
      width: 22,
    },
    checkBoxSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkBoxDisabled: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
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
      minWidth: 0,
    },
    accountTitleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    accountItemName: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    accountItemNameSelected: {
      color: theme.colors.primary,
    },
    accountItemType: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    conflictText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
      marginTop: 2,
    },
    textDisabled: {
      color: theme.colors.textMuted,
    },
    accountItemBalance: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
    },
    positiveBalance: {
      color: theme.colors.success,
    },
    negativeBalance: {
      color: theme.colors.danger,
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
      marginLeft: 10,
      marginRight: -4,
      width: 14,
    },
    locationIconWrap: {
      alignItems: "center",
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    locationTextCol: {
      flex: 1,
      minWidth: 0,
    },
    locationName: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    pocketDisabledText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontStyle: "italic",
      marginTop: 2,
    },
    locationBalance: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.medium,
    },
    archivedBadge: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    archivedBadgeText: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
      textAlign: "center",
    },
  });
}
