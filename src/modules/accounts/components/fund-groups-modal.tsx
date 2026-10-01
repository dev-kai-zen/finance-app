import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
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
import { ConfirmModal, FullScreenFormModal, NotificationModal } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountSearchBox } from "@/modules/accounts/components/account-search-box";
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

type Candidate = {
  id: string;
  kind: "account" | "pocket";
  name: string;
  detail: string;
  parentAccountId: string | null;
  currencyCode: string;
  currentBalanceMinorUnits: number;
  isArchived: boolean;
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

  useEffect(() => {
    if (!visible) {
      setEditor(null);
      setConfirmAction(null);
      setMemberSearchQuery("");
      setExpandedGroupIds(new Set());
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

  const accountCandidates = useMemo<Candidate[]>(() => {
    if (!editor) return [];
    const selected = new Set(editor.value.accountIds);
    return accounts
      .filter((account) => !account.isArchived || selected.has(account.id))
      .filter((account) =>
        !normalizedMemberSearch ||
        account.name.toLocaleLowerCase().includes(normalizedMemberSearch) ||
        account.accountType?.name.toLocaleLowerCase().includes(normalizedMemberSearch),
      )
      .map((account) => ({
        id: account.id,
        kind: "account" as const,
        name: account.name,
        detail: account.accountType?.name ?? "Account",
        parentAccountId: null,
        currencyCode: account.currencyCode,
        currentBalanceMinorUnits: account.currentBalanceMinorUnits,
        isArchived: account.isArchived,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [accounts, editor, normalizedMemberSearch]);

  const pocketCandidates = useMemo<Candidate[]>(() => {
    if (!editor) return [];
    const selected = new Set(editor.value.pocketIds);
    return pockets
      .flatMap<Candidate>((pocket) => {
        const parent = accountById.get(pocket.accountId);
        if (!parent) return [];
        const archived = pocket.isArchived || parent.isArchived;
        if (archived && !selected.has(pocket.id)) return [];
        if (
          normalizedMemberSearch &&
          !pocket.name.toLocaleLowerCase().includes(normalizedMemberSearch) &&
          !parent.name.toLocaleLowerCase().includes(normalizedMemberSearch)
        ) {
          return [];
        }
        return [{
          id: pocket.id,
          kind: "pocket",
          name: pocket.name,
          detail: parent.name,
          parentAccountId: parent.id,
          currencyCode: parent.currencyCode,
          currentBalanceMinorUnits: pocket.currentBalanceMinorUnits,
          isArchived: archived,
        }];
      })
      .sort((left, right) =>
        left.detail.localeCompare(right.detail) || left.name.localeCompare(right.name),
      );
  }, [accountById, editor, normalizedMemberSearch, pockets]);

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

  const toggleMember = (candidate: Candidate) => {
    if (!editor || mutations.pending) return;
    const assigned = assignedGroups.get(`${candidate.kind}:${candidate.id}`);
    if (assigned && assigned.id !== editor.id) return;
    setEditor((current) => {
      if (!current) return current;
      const key = candidate.kind === "account" ? "accountIds" : "pocketIds";
      const selected = current.value[key].includes(candidate.id);
      return {
        ...current,
        value: {
          ...current.value,
          [key]: selected
            ? current.value[key].filter((id) => id !== candidate.id)
            : [...current.value[key], candidate.id],
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

  const renderCandidateSection = (
    title: string,
    candidatesForSection: Candidate[],
    emptyMessage: string,
  ) => {
    if (!editor) return null;
    return (
      <View style={styles.selectionSection}>
        <View style={styles.selectionHeader}>
          <Text style={styles.fieldLabel}>{title}</Text>
          <Text style={styles.selectionCount}>
            {title === "Accounts"
              ? editor.value.accountIds.length
              : editor.value.pocketIds.length} selected
          </Text>
        </View>

        {candidatesForSection.length === 0 ? (
          <View style={styles.sectionEmptyCard}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          <View style={styles.candidateList}>
            {candidatesForSection.map((candidate) => {
              const selectedIds = candidate.kind === "account"
                ? editor.value.accountIds
                : editor.value.pocketIds;
              const selected = selectedIds.includes(candidate.id);
              const assigned = assignedGroups.get(`${candidate.kind}:${candidate.id}`);
              const assignedElsewhere = !!assigned && assigned.id !== editor.id;
              const selectedChildPocket = candidate.kind === "account"
                ? pockets.find(
                    (pocket) =>
                      pocket.accountId === candidate.id &&
                      editor.value.pocketIds.includes(pocket.id),
                  )
                : undefined;
              const parentSelected =
                candidate.kind === "pocket" &&
                !!candidate.parentAccountId &&
                editor.value.accountIds.includes(candidate.parentAccountId);
              const conflictsWithSelection = !selected && (!!selectedChildPocket || parentSelected);
              const unavailable = assignedElsewhere || conflictsWithSelection;
              const unavailableReason = assignedElsewhere
                ? `In ${assigned.name}`
                : selectedChildPocket
                  ? `Remove the ${selectedChildPocket.name} pocket first`
                  : parentSelected
                    ? `Remove the ${candidate.detail} account first`
                    : null;

              return (
                <Pressable
                  key={`${candidate.kind}:${candidate.id}`}
                  accessibilityLabel={`${candidate.name}, ${formatCurrency(candidate.currentBalanceMinorUnits, candidate.currencyCode)}${unavailableReason ? `, ${unavailableReason}` : ""}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected, disabled: unavailable }}
                  disabled={unavailable || mutations.pending}
                  onPress={() => toggleMember(candidate)}
                  style={({ pressed }) => [
                    styles.candidateRow,
                    selected && styles.candidateRowSelected,
                    unavailable && styles.disabled,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={[styles.checkBox, selected && styles.checkBoxSelected]}>
                    {selected ? <Check color={theme.colors.onPrimary} size={15} /> : null}
                  </View>
                  <View style={styles.candidateCopy}>
                    <View style={styles.candidateTitleRow}>
                      <Text numberOfLines={1} style={styles.candidateName}>
                        {candidate.name}
                      </Text>
                      {candidate.isArchived ? (
                        <View style={styles.archivedBadge}>
                          <Archive color={theme.colors.textMuted} size={11} />
                          <Text style={styles.archivedBadgeText}>Archived</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text numberOfLines={1} style={styles.candidateDetail}>
                      {unavailableReason ?? candidate.detail}
                    </Text>
                  </View>
                  <Text style={styles.candidateAmount}>
                    {formatCurrency(
                      candidate.currentBalanceMinorUnits,
                      candidate.currencyCode,
                    )}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  };

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
        visible={visible}
        headerRight={editor ? undefined : managerHeader}
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

            <View style={styles.ruleBanner}>
              <Text style={styles.ruleText}>
                You can mix accounts and pockets. To prevent double-counting, an account
                and one of its own pockets cannot be selected together.
              </Text>
            </View>

            <AccountSearchBox
              accessibilityLabel="Search Fund Group accounts and pockets"
              clearAccessibilityLabel="Clear Fund Group member search"
              placeholder="Search accounts or pockets"
              value={memberSearchQuery}
              onChangeText={setMemberSearchQuery}
            />

            {renderCandidateSection(
              "Accounts",
              accountCandidates,
              normalizedMemberSearch
                ? `No accounts match “${memberSearchQuery.trim()}”.`
                : "Create or restore an account first.",
            )}
            {renderCandidateSection(
              "Pockets",
              pocketCandidates,
              normalizedMemberSearch
                ? `No pockets match “${memberSearchQuery.trim()}”.`
                : "Enable pockets on an eligible account, then create a pocket.",
            )}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.managerContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoBanner}>
              <Layers3 color={theme.colors.primary} size={20} />
              <Text style={styles.infoText}>
                Combine related accounts and pockets into named groups without moving money.
                Each item can belong to one Fund Group.
              </Text>
            </View>

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
    infoBanner: {
      alignItems: "flex-start",
      backgroundColor: `${theme.colors.primary}10`,
      borderColor: `${theme.colors.primary}35`,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    infoText: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
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
    ruleBanner: {
      backgroundColor: `${theme.colors.warning}10`,
      borderColor: `${theme.colors.warning}35`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    ruleText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.md,
    },
    selectionSection: { gap: theme.spacing.sm },
    selectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    selectionCount: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.xs,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.semibold,
    },
    candidateList: {
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      overflow: "hidden",
    },
    sectionEmptyCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
    },
    candidateRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: theme.spacing.md,
      minHeight: 68,
      padding: theme.spacing.md,
    },
    candidateRowSelected: { backgroundColor: `${theme.colors.primary}0D` },
    checkBox: {
      alignItems: "center",
      borderColor: theme.colors.borderStrong,
      borderRadius: 6,
      borderWidth: 1.5,
      height: 24,
      justifyContent: "center",
      width: 24,
    },
    checkBoxSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    candidateCopy: { flex: 1, minWidth: 0 },
    candidateTitleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.xs,
    },
    candidateName: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    candidateDetail: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 3,
    },
    candidateAmount: {
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
