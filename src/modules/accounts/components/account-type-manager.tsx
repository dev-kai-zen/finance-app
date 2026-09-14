import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Plus } from "lucide-react-native";
import { FullScreenFormModal } from "@/components/full-screen-form-modal";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountTypeBadge } from "@/modules/accounts/components/account-type-badge";
import { AccountTypeForm } from "@/modules/accounts/components/account-type-form";
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
  const [archived, setArchived] = useState(false);
  const [editor, setEditor] = useState<{ type?: AccountType } | null>(null);
  const [deleting, setDeleting] = useState<AccountType | null>(null);

  const visibleTypes = types.filter(
    (t) => t.accountGroup === group && t.isArchived === archived,
  );

  const back = () => {
    setEditor(null);
    setDeleting(null);
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
    return (
      <FullScreenFormModal
        pending={mutations.pending}
        title="Delete Account Type?"
        visible
        onClose={back}
      >
        <View style={styles.formContent}>
          <Text style={styles.heading}>{deleting.name}</Text>
          <Text style={styles.bodyText}>
            {accounts.filter((a) => a.accountTypeId === deleting.id).length}{" "}
            linked account(s), including archived accounts, will move to{" "}
            {deleting.accountGroup === "asset" ? "Asset" : "Liability"} →
            Others.
          </Text>
          <Pressable
            disabled={mutations.pending}
            onPress={() => {
              void mutations.deleteType(deleting.id).then((saved) => {
                if (saved) back();
              });
            }}
            style={[styles.dangerBtn, mutations.pending && styles.btnDisabled]}
          >
            <Text style={styles.dangerBtnText}>Delete type and reassign accounts</Text>
          </Pressable>
          <Pressable disabled={mutations.pending} onPress={back} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </FullScreenFormModal>
    );
  }

  return (
    <FullScreenFormModal pending={mutations.pending} title="Account Group Setup" visible onClose={onClose}>
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
              style={[styles.segment, group === item && styles.segmentActive]}
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

        <Pressable
          disabled={mutations.pending}
          onPress={() => setArchived((prev) => !prev)}
          style={styles.linkBtn}
        >
          <Text style={styles.linkBtnText}>
            {archived ? "Show active types" : "Show archived types"}
          </Text>
        </Pressable>

        <Pressable
          disabled={mutations.pending}
          onPress={() => {
            mutations.clearError();
            setEditor({});
          }}
          style={styles.addBtn}
        >
          <Plus color={theme.colors.onPrimary} size={18} />
          <Text style={styles.addBtnText}>New account type</Text>
        </Pressable>

        {visibleTypes.length === 0 ? (
          <Text style={styles.emptyText}>
            No {archived ? "archived" : "active"} types in this group.
          </Text>
        ) : (
          visibleTypes.map((type, index) => {
            const protectedType = isProtectedAccountType(type);
            return (
              <View key={type.id} style={styles.typeCard}>
                <View style={styles.typeHeader}>
                  <AccountTypeBadge color={type.color} iconKey={type.iconKey} />
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
                    <>
                      <Pressable
                        disabled={mutations.pending || index === 0}
                        onPress={() => {
                          void mutations.moveType(type.id, -1);
                        }}
                        style={styles.actionChip}
                      >
                        <Text style={styles.actionChipText}>Move up</Text>
                      </Pressable>
                      <Pressable
                        disabled={
                          mutations.pending || index === visibleTypes.length - 1
                        }
                        onPress={() => {
                          void mutations.moveType(type.id, 1);
                        }}
                        style={styles.actionChip}
                      >
                        <Text style={styles.actionChipText}>Move down</Text>
                      </Pressable>
                      <Pressable
                        disabled={mutations.pending}
                        onPress={() => {
                          void mutations.archiveType(type.id, !type.isArchived);
                        }}
                        style={styles.actionChip}
                      >
                        <Text style={styles.actionChipText}>
                          {type.isArchived ? "Restore" : "Archive"}
                        </Text>
                      </Pressable>
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
                    </>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </FullScreenFormModal>
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
    segmentActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    segmentText: {
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    segmentTextActive: {
      color: theme.colors.onPrimary,
    },
    linkBtn: {
      alignSelf: "flex-start",
    },
    linkBtnText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    addBtn: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.primary,
      borderRadius: 999,
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    addBtnText: {
      color: theme.colors.onPrimary,
      fontWeight: theme.typography.fontWeight.bold,
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
    heading: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      lineHeight: 22,
    },
    dangerBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.danger,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
    },
    dangerBtnText: {
      color: theme.colors.onPrimary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    secondaryBtn: {
      alignItems: "center",
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    secondaryBtnText: {
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    btnDisabled: {
      opacity: 0.6,
    },
  });
}
