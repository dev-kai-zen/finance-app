import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Archive, Folder, Info, RotateCcw, Trash2 } from "lucide-react-native";
import { ConfirmModal, FullScreenFormModal, NotificationModal } from "@/components";
import { getPocketRestoreBlockReason } from "@/modules/accounts/services/pocket-rules";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountRow } from "@/modules/accounts/components/account-row";
import { AccountAmountText } from "@/modules/accounts/components/account-amount-text";
import type { AccountListItem, PocketListItem } from "@/modules/accounts/types/account.types";

type ArchivedTab = "accounts" | "pockets";

export interface ArchivedAccountsModalProps {
  visible: boolean;
  accounts: AccountListItem[];
  pockets: PocketListItem[];
  accountById: Map<string, AccountListItem>;
  pending?: boolean;
  onClose: () => void;
  onSelectAccount: (account: AccountListItem) => void;
  onSelectPocket: (pocket: PocketListItem) => void;
  onRestoreAccount: (accountId: string) => Promise<boolean>;
  onPermanentDeleteAccount?: (accountId: string) => Promise<boolean>;
  onRestorePocket: (pocketId: string) => Promise<boolean>;
  onPermanentDeletePocket?: (pocketId: string) => Promise<boolean>;
  restorePocketError?: string | null;
  onDismissRestorePocketError?: () => void;
}

export function ArchivedAccountsModal({
  visible,
  accounts,
  pockets,
  accountById,
  pending = false,
  onClose,
  onSelectAccount,
  onSelectPocket,
  onRestoreAccount,
  onPermanentDeleteAccount,
  onRestorePocket,
  onPermanentDeletePocket,
  restorePocketError = null,
  onDismissRestorePocketError,
}: ArchivedAccountsModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [tab, setTab] = useState<ArchivedTab>("accounts");
  const [restoreAccountTarget, setRestoreAccountTarget] = useState<AccountListItem | null>(
    null,
  );
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<AccountListItem | null>(
    null,
  );
  const [restorePocketTarget, setRestorePocketTarget] = useState<PocketListItem | null>(
    null,
  );
  const [deletePocketTarget, setDeletePocketTarget] = useState<PocketListItem | null>(
    null,
  );
  const [pocketRestoreNotice, setPocketRestoreNotice] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTab("accounts");
      setPocketRestoreNotice(null);
    }
  }, [visible]);

  useEffect(() => {
    if (restorePocketError) {
      setPocketRestoreNotice(restorePocketError);
    }
  }, [restorePocketError]);

  const requestRestorePocket = (pocket: PocketListItem) => {
    const blockReason = getPocketRestoreBlockReason(
      accountById.get(pocket.accountId),
    );
    if (blockReason) {
      setPocketRestoreNotice(blockReason);
      return;
    }
    setRestorePocketTarget(pocket);
  };

  const infoText =
    tab === "accounts"
      ? "Archived accounts are preserved and excluded from opening-balance and net worth totals. Restore an account anytime to bring it back to your active list."
      : "Archived pockets are hidden from active pocket lists and allocations. Restore a pocket to use it again under its parent account.";

  return (
    <>
      <FullScreenFormModal
        pending={pending}
        title="Archived"
        visible={visible}
        onClose={onClose}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.tabRow}>
            <Pressable
              accessibilityLabel="Archived accounts"
              accessibilityRole="button"
              accessibilityState={{ selected: tab === "accounts" }}
              onPress={() => setTab("accounts")}
              style={[styles.tabBtn, tab === "accounts" && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, tab === "accounts" && styles.tabTextActive]}>
                Accounts
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Archived pockets"
              accessibilityRole="button"
              accessibilityState={{ selected: tab === "pockets" }}
              onPress={() => setTab("pockets")}
              style={[styles.tabBtn, tab === "pockets" && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, tab === "pockets" && styles.tabTextActive]}>
                Pockets
              </Text>
            </Pressable>
          </View>

          <View style={styles.infoBanner}>
            <Info color={theme.colors.textMuted} size={18} style={styles.infoIcon} />
            <Text style={styles.infoText}>{infoText}</Text>
          </View>

          {tab === "accounts" ? (
            accounts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Archive color={theme.colors.textMuted} size={32} />
                </View>
                <Text style={styles.emptyTitle}>No Archived Accounts</Text>
                <Text style={styles.emptySubtitle}>
                  When you archive accounts, they will appear here and remain hidden from your
                  active accounts list.
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {accounts.map((account) => (
                  <View key={account.id} style={styles.listItem}>
                    <AccountRow account={account} onPress={() => onSelectAccount(account)} />
                    <View style={styles.actionRow}>
                      {account.isDeletable && onPermanentDeleteAccount ? (
                        <Pressable
                          accessibilityLabel={`Delete ${account.name} permanently`}
                          accessibilityRole="button"
                          disabled={pending}
                          onPress={() => setDeleteAccountTarget(account)}
                          style={({ pressed }) => [
                            styles.deleteBtn,
                            pending && styles.actionBtnDisabled,
                            pressed && styles.actionBtnPressed,
                          ]}
                        >
                          <Trash2 color={theme.colors.danger} size={15} />
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        accessibilityLabel={`Restore ${account.name}`}
                        accessibilityRole="button"
                        disabled={pending}
                        onPress={() => setRestoreAccountTarget(account)}
                        style={({ pressed }) => [
                          styles.restoreBtn,
                          pending && styles.actionBtnDisabled,
                          pressed && styles.actionBtnPressed,
                        ]}
                      >
                        <RotateCcw color={theme.colors.success} size={15} />
                        <Text style={styles.restoreBtnText}>Restore</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )
          ) : pockets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Folder color={theme.colors.textMuted} size={32} />
              </View>
              <Text style={styles.emptyTitle}>No Archived Pockets</Text>
              <Text style={styles.emptySubtitle}>
                When you archive pockets, they will appear here until you restore or permanently
                delete them.
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {pockets.map((pocket) => {
                const parent = accountById.get(pocket.accountId);
                const currencyCode = parent?.currencyCode ?? "PHP";
                return (
                  <View key={pocket.id} style={styles.listItem}>
                    <Pressable
                      accessibilityLabel={`${pocket.name}, ${parent?.name ?? "Unknown account"}. Open pocket.`}
                      accessibilityRole="button"
                      onPress={() => onSelectPocket(pocket)}
                      style={({ pressed }) => [
                        styles.pocketCard,
                        pressed && styles.pocketCardPressed,
                      ]}
                    >
                      <View style={styles.pocketIconWrap}>
                        <Folder color={theme.colors.info} size={18} />
                      </View>
                      <View style={styles.pocketInfo}>
                        <Text numberOfLines={1} style={styles.pocketName}>
                          {pocket.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.pocketSubtitle}>
                          {parent?.name ?? "Unknown account"}
                          {" · "}
                          Archived
                        </Text>
                      </View>
                      <AccountAmountText
                        amountMinorUnits={pocket.currentBalanceMinorUnits}
                        currencyCode={currencyCode}
                        variant="body"
                      />
                    </Pressable>
                    <View style={styles.actionRow}>
                      {pocket.isDeletable && onPermanentDeletePocket ? (
                        <Pressable
                          accessibilityLabel={`Delete ${pocket.name} permanently`}
                          accessibilityRole="button"
                          disabled={pending}
                          onPress={() => setDeletePocketTarget(pocket)}
                          style={({ pressed }) => [
                            styles.deleteBtn,
                            pending && styles.actionBtnDisabled,
                            pressed && styles.actionBtnPressed,
                          ]}
                        >
                          <Trash2 color={theme.colors.danger} size={15} />
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        accessibilityLabel={`Restore ${pocket.name}`}
                        accessibilityRole="button"
                        disabled={pending}
                        onPress={() => requestRestorePocket(pocket)}
                        style={({ pressed }) => [
                          styles.restoreBtn,
                          pending && styles.actionBtnDisabled,
                          pressed && styles.actionBtnPressed,
                        ]}
                      >
                        <RotateCcw color={theme.colors.success} size={15} />
                        <Text style={styles.restoreBtnText}>Restore</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </FullScreenFormModal>

      <ConfirmModal
        confirmLabel="Restore"
        message={`Restore "${restoreAccountTarget?.name ?? "this account"}" to the active accounts list? It will be included in totals again.`}
        pending={pending}
        title="Restore account?"
        variant="restore"
        visible={restoreAccountTarget !== null}
        onCancel={() => setRestoreAccountTarget(null)}
        onConfirm={() => {
          if (!restoreAccountTarget) return;
          void onRestoreAccount(restoreAccountTarget.id).then((restored) => {
            if (restored) setRestoreAccountTarget(null);
          });
        }}
      />

      <ConfirmModal
        confirmLabel="Delete"
        message={`Permanently delete "${deleteAccountTarget?.name ?? "this account"}"? This action cannot be undone.`}
        pending={pending}
        title="Delete account permanently?"
        variant="destructive"
        visible={deleteAccountTarget !== null}
        onCancel={() => setDeleteAccountTarget(null)}
        onConfirm={() => {
          if (!deleteAccountTarget || !onPermanentDeleteAccount) return;
          void onPermanentDeleteAccount(deleteAccountTarget.id).then((deleted) => {
            if (deleted) setDeleteAccountTarget(null);
          });
        }}
      />

      <ConfirmModal
        confirmLabel="Restore"
        message={`Restore "${restorePocketTarget?.name ?? "this pocket"}" under ${accountById.get(restorePocketTarget?.accountId ?? "")?.name ?? "its account"}?`}
        pending={pending}
        title="Restore pocket?"
        variant="restore"
        visible={restorePocketTarget !== null}
        onCancel={() => setRestorePocketTarget(null)}
        onConfirm={() => {
          if (!restorePocketTarget) return;
          void onRestorePocket(restorePocketTarget.id).then((restored) => {
            setRestorePocketTarget(null);
          });
        }}
      />

      <NotificationModal
        message={pocketRestoreNotice ?? ""}
        title={
          pocketRestoreNotice?.includes("Pockets aren't enabled")
            ? "Turn on Pockets first"
            : "Cannot restore pocket"
        }
        variant="warning"
        visible={visible && pocketRestoreNotice !== null}
        onClose={() => {
          setPocketRestoreNotice(null);
          onDismissRestorePocketError?.();
        }}
      />

      <ConfirmModal
        confirmLabel="Delete"
        message={`Permanently delete "${deletePocketTarget?.name ?? "this pocket"}"? This action cannot be undone.`}
        pending={pending}
        title="Delete pocket permanently?"
        variant="destructive"
        visible={deletePocketTarget !== null}
        onCancel={() => setDeletePocketTarget(null)}
        onConfirm={() => {
          if (!deletePocketTarget || !onPermanentDeletePocket) return;
          void onPermanentDeletePocket(deletePocketTarget.id).then((deleted) => {
            if (deleted) setDeletePocketTarget(null);
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
    tabRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    tabBtn: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      paddingVertical: theme.spacing.sm,
    },
    tabBtnActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    tabText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    tabTextActive: {
      color: theme.colors.onPrimary,
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
    listItem: {
      gap: theme.spacing.xs,
    },
    pocketCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 64,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    pocketCardPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    pocketIconWrap: {
      alignItems: "center",
      backgroundColor: `${theme.colors.info}18`,
      borderColor: `${theme.colors.info}35`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    pocketInfo: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    pocketName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    pocketSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
    },
    actionRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "flex-end",
      marginTop: 2,
    },
    deleteBtn: {
      alignItems: "center",
      backgroundColor: `${theme.colors.danger}18`,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 36,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    actionBtnDisabled: {
      opacity: 0.5,
    },
    actionBtnPressed: {
      opacity: 0.8,
    },
    deleteBtnText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
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
