import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ConfirmModal, IconHelper, InfoModal } from "@/components";
import { FullScreenFormModal } from "@/components/full-screen-form-modal";
import { SortableListModal } from "@/components/sortable-list-modal";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountTypeBadge } from "@/modules/accounts/components/account-type-badge";
import { AccountTypeFormModal } from "@/modules/accounts/components/account-type-form-modal";
import type { AccountMutations } from "@/modules/accounts/hooks/use-account-mutations";
import type {
  AccountGroup,
  AccountListItem,
  AccountType,
} from "@/modules/accounts/types/account.types";
import { isProtectedAccountType } from "@/modules/accounts/utils/account-type-protection";

export function AccountTypeManager({
  visible,
  types,
  accounts,
  mutations,
  onClose,
}: {
  visible: boolean;
  types: AccountType[];
  accounts: AccountListItem[];
  mutations: AccountMutations;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [group, setGroup] = useState<AccountGroup>("asset");
  const [editor, setEditor] = useState<{ type?: AccountType } | null>(null);
  const [deleting, setDeleting] = useState<AccountType | null>(null);
  const [reorderVisible, setReorderVisible] = useState(false);

  const visibleTypes = types.filter((t) => t.accountGroup === group);
  const activeColor = group === "asset" ? theme.colors.success : theme.colors.danger;

  const back = () => {
    setEditor(null);
    setDeleting(null);
    setReorderVisible(false);
    mutations.clearError();
  };

  if (!visible) return null;

  if (editor) {
    return (
      <AccountTypeFormModal
        accounts={accounts}
        initialGroup={group}
        mutations={mutations}
        onClose={back}
        type={editor.type}
        visible={Boolean(editor)}
      />
    );
  }

  if (deleting) {
    const linkedCount = accounts.filter((a) => a.accountTypeId === deleting.id).length;
    const canDelete = linkedCount === 0;

    if (!canDelete) {
      return (
        <InfoModal
          message={
            linkedCount === 1
              ? "This group has 1 linked account. Reassign or remove it before deleting the group."
              : `This group has ${linkedCount} linked accounts. Reassign or remove them before deleting the group.`
          }
          onClose={back}
          title="Cannot Delete Account Type"
          variant="error"
          visible
        />
      );
    }

    return (
      <ConfirmModal
        cancelLabel="Cancel"
        confirmLabel="Delete group"
        message={`Delete "${deleting.name}" account group permanently? This cannot be undone.`}
        onCancel={back}
        onConfirm={() => {
          void mutations.deleteType(deleting.id).then((saved) => {
            if (saved) back();
          });
        }}
        pending={mutations.pending}
        title="Delete Account Type?"
        visible
      />
    );
  }

  return (
    <>
      <FullScreenFormModal
        pending={mutations.pending}
        title="Account Group Setup"
        visible
        onClose={onClose}
      >
        <ScrollView contentContainerStyle={styles.formContent}>
          {mutations.error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{mutations.error}</Text>
            </View>
          ) : null}

          <View style={styles.segmentRow}>
            {(["asset", "liability"] as const).map((item) => (
              <Pressable
                key={item}
                disabled={mutations.pending}
                onPress={() => setGroup(item)}
                style={[
                  styles.segment,
                  group === item &&
                    (item === "asset" ? styles.segmentActiveAsset : styles.segmentActiveLiability),
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    group === item && styles.segmentTextActive,
                  ]}
                >
                  {item === "asset" ? "Assets" : "Liabilities"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.toolbar}>
            {visibleTypes.length > 1 ? (
                <Pressable
                  accessibilityLabel="Reorder account groups"
                  accessibilityRole="button"
                  disabled={mutations.pending}
                  onPress={() => setReorderVisible(true)}
                  style={({ pressed }) => [
                    styles.toolbarChip,
                    { borderColor: `${activeColor}55` },
                    pressed && styles.toolbarChipPressed,
                  ]}
                >
                  <IconHelper color={activeColor} name="arrow-up-down" size={15} />
                  <Text style={[styles.toolbarChipText, { color: activeColor }]}>Reorder</Text>
                </Pressable>
            ) : null}

            <Pressable
              accessibilityLabel="New Account Group"
              accessibilityRole="button"
              disabled={mutations.pending}
              onPress={() => {
                mutations.clearError();
                setEditor({});
              }}
              style={({ pressed }) => [
                styles.toolbarChip,
                styles.newGroupChip,
                { borderColor: activeColor },
                pressed && styles.toolbarChipPressed,
              ]}
            >
              <IconHelper color={activeColor} name="plus" size={15} />
              <Text style={[styles.toolbarChipText, { color: activeColor }]}>New Account Group</Text>
            </Pressable>
          </View>

          {visibleTypes.length === 0 ? (
            <Text style={styles.emptyText}>No types in this group.</Text>
          ) : (
            visibleTypes.map((type, index) => {
              const protectedType = isProtectedAccountType(type);
              return (
                <View key={type.id} style={styles.typeCard}>
                <View style={styles.typeHeader}>
                  <AccountTypeBadge color={type.color ?? null} iconKey={type.iconKey} />
                  <View style={styles.typeInfo}>
                    <Text style={styles.typeName}>{type.name}</Text>
                    <Text style={styles.typeMeta}>
                      {protectedType ? "System type" : "Custom type"} ·{" "}
                      {accounts.filter((a) => a.accountTypeId === type.id).length}{" "}
                      accounts
                    </Text>
                  </View>
                </View>
                <View style={styles.typeActions}>
                  <Pressable
                    disabled={mutations.pending}
                    onPress={() => {
                      mutations.clearError();
                      setEditor({ type });
                    }}
                    style={styles.actionChip}
                  >
                    <Text style={styles.actionChipText}>Edit</Text>
                  </Pressable>
                  {!protectedType ? (
                    <Pressable
                      disabled={mutations.pending}
                      onPress={() => {
                        mutations.clearError();
                        setDeleting(type);
                      }}
                      style={[styles.actionChip, styles.actionChipDanger]}
                    >
                      <Text style={styles.actionChipDangerText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </FullScreenFormModal>

      <SortableListModal
        items={visibleTypes.map((type) => ({
          id: type.id,
          name: type.name,
          icon: type.iconKey,
          color: type.color,
        }))}
        onClose={() => setReorderVisible(false)}
        onSave={async (orderedIds) => {
          await mutations.reorderAccountTypes(orderedIds);
        }}
        title={`Reorder ${group === "asset" ? "Asset" : "Liability"} Groups`}
        visible={reorderVisible}
      />

    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    formContent: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    errorBanner: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
    },
    segmentRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    segment: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      paddingVertical: theme.spacing.sm,
    },
    segmentActiveAsset: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    segmentActiveLiability: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
    },
    segmentText: {
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    segmentTextActive: {
      color: theme.colors.onPrimary,
    },
    toolbar: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "nowrap",
      gap: theme.spacing.sm,
    },
    toolbarChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    newGroupChip: {
      backgroundColor: "transparent",
    },
    toolbarChipPressed: {
      opacity: 0.7,
    },
    toolbarChipText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
    },
    typeCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    typeHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    typeInfo: {
      flex: 1,
    },
    typeName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    typeMeta: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    typeActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    actionChip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
    },
    actionChipText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    actionChipDanger: {
      borderColor: `${theme.colors.danger}40`,
    },
    actionChipDangerText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
