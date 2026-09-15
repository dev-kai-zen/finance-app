import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Archive, Info, RotateCcw } from "lucide-react-native";
import { ConfirmModal, FullScreenFormModal } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountRow } from "@/modules/accounts/components/account-row";
import type { AccountListItem } from "@/modules/accounts/types/account.types";

export interface ArchivedAccountsModalProps {
  visible: boolean;
  accounts: AccountListItem[];
  pending?: boolean;
  onClose: () => void;
  onSelect: (account: AccountListItem) => void;
  onRestore: (accountId: string) => Promise<boolean>;
}

export function ArchivedAccountsModal({
  visible,
  accounts,
  pending = false,
  onClose,
  onSelect,
  onRestore,
}: ArchivedAccountsModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [restoreTarget, setRestoreTarget] = useState<AccountListItem | null>(null);

  return (
    <>
      <FullScreenFormModal
        pending={pending}
        title="Archived Accounts"
        visible={visible}
        onClose={onClose}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoBanner}>
            <Info color={theme.colors.textMuted} size={18} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Archived accounts are preserved and excluded from opening-balance
              and net worth totals. Restore an account anytime to bring it back to
              your active list.
            </Text>
          </View>

          {accounts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Archive color={theme.colors.textMuted} size={32} />
              </View>
              <Text style={styles.emptyTitle}>No Archived Accounts</Text>
              <Text style={styles.emptySubtitle}>
                When you archive accounts, they will appear here and remain
                hidden from your active accounts list.
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {accounts.map((account) => (
                <View key={account.id} style={styles.accountItem}>
                  <AccountRow account={account} onPress={() => onSelect(account)} />
                  <View style={styles.actionRow}>
                    <Pressable
                      accessibilityLabel={`Restore ${account.name}`}
                      accessibilityRole="button"
                      disabled={pending}
                      onPress={() => setRestoreTarget(account)}
                      style={({ pressed }) => [
                        styles.restoreBtn,
                        pending && styles.restoreBtnDisabled,
                        pressed && styles.restoreBtnPressed,
                      ]}
                    >
                      <RotateCcw color={theme.colors.success} size={15} />
                      <Text style={styles.restoreBtnText}>Restore</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </FullScreenFormModal>

      <ConfirmModal
        confirmLabel="Restore"
        message={`Restore "${restoreTarget?.name ?? "this account"}" to the active accounts list? It will be included in totals again.`}
        pending={pending}
        title="Restore account?"
        variant="restore"
        visible={restoreTarget !== null}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={() => {
          if (!restoreTarget) return;
          void onRestore(restoreTarget.id).then((restored) => {
            if (restored) setRestoreTarget(null);
          });
        }}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    scrollContent: {
      gap: theme.spacing.lg,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    infoBanner: {
      alignItems: "flex-start",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    infoIcon: {
      marginTop: 2,
    },
    infoText: {
      color: theme.colors.textSecondary,
      flex: 1,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.md,
    },
    listContainer: {
      gap: theme.spacing.md,
    },
    accountItem: {
      gap: theme.spacing.xs,
    },
    actionRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 2,
    },
    restoreBtn: {
      alignItems: "center",
      backgroundColor: `${theme.colors.success}18`,
      borderColor: `${theme.colors.success}40`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 36,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    restoreBtnDisabled: {
      opacity: 0.5,
    },
    restoreBtnPressed: {
      opacity: 0.8,
    },
    restoreBtnText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      justifyContent: "center",
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxxl,
    },
    emptyIconCircle: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      height: 64,
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      width: 64,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing.xs,
      textAlign: "center",
    },
    emptySubtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.md,
      maxWidth: 280,
      textAlign: "center",
    },
  });
}
