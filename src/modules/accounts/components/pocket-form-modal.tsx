import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  ConfirmModal,
  FullScreenFormModal,
  KeyboardAwareForm,
} from "@/components";
import {
  AccountError,
  AccountField,
} from "@/modules/accounts/components/account-ui";
import type { AppTheme } from "@/constants/theme";
import type { AccountMutations } from "@/modules/accounts/hooks/use-account-mutations";
import type { AccountListItem, PocketListItem } from "@/modules/accounts/types/account.types";
import { maintainingAmountInput } from "@/modules/accounts/utils/account-input";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";

export function PocketFormModal({
  visible,
  account,
  pocket,
  mutations,
  onClose,
  onSaved,
}: {
  visible: boolean;
  account: AccountListItem | null;
  pocket?: PocketListItem;
  mutations: AccountMutations;
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(pocket?.name ?? "");
      setTargetAmount(maintainingAmountInput(pocket?.targetAmountMinorUnits));
      setConfirmArchive(false);
      setArchiveError(null);
      mutations.clearError();
    }
  }, [visible, pocket]);

  if (!visible || !account) return null;

  const save = async () => {
    const saved = await mutations.savePocket(
      { accountId: account.id, name, targetAmount },
      pocket?.id,
    );
    if (saved) {
      setConfirmArchive(false);
      onSaved();
    }
  };

  const archive = async () => {
    if (!pocket) return;
    const saved = await mutations.archivePocket(pocket.id, !pocket.isArchived);
    if (saved) onSaved();
  };

  const requestArchive = () => {
    if (!pocket) return;
    if (!pocket.isArchived && pocket.currentBalanceMinorUnits !== 0) {
      setConfirmArchive(false);
      setArchiveError(
        `Move the remaining ${formatCurrency(pocket.currentBalanceMinorUnits, account.currencyCode)} balance to Main before archiving this pocket.`,
      );
      return;
    }
    setArchiveError(null);
    setConfirmArchive(true);
  };

  return (
    <>
      <FullScreenFormModal
        deleteAction={pocket?.isArchived ? "restore" : "delete"}
        deleteLabel={pocket?.isArchived ? "Restore pocket" : "Archive pocket"}
        pending={mutations.pending}
        saveLabel="Save pocket"
        title={pocket ? "Edit Pocket" : "Add Pocket"}
        visible={visible}
        onClose={onClose}
        onDelete={pocket ? requestArchive : undefined}
        onSave={() => void save()}
      >
        <KeyboardAwareForm
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <AccountError message={archiveError ?? mutations.error} />

          <View style={styles.contextCard}>
            <Text style={styles.contextTitle}>{account.name}</Text>
            <Text style={styles.contextText}>
              {account.currencyCode} · Pockets are app-only allocations and do not move money at your bank.
            </Text>
            {pocket ? (
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Current balance</Text>
                <Text
                  selectable
                  style={[
                    styles.balanceValue,
                    {
                      color:
                        pocket.currentBalanceMinorUnits > 0
                          ? theme.colors.success
                          : pocket.currentBalanceMinorUnits < 0
                            ? theme.colors.danger
                            : theme.colors.textPrimary,
                    },
                  ]}
                >
                  {formatCurrency(
                    pocket.currentBalanceMinorUnits,
                    account.currencyCode,
                  )}
                </Text>
              </View>
            ) : null}
          </View>

          <AccountField
            autoCapitalize="words"
            label="Pocket name"
            maxLength={60}
            onChangeText={setName}
            placeholder="e.g. Emergency Fund, Bills, Travel"
            value={name}
          />
          <AccountField
            keyboardType="decimal-pad"
            label="Target amount (optional)"
            onChangeText={setTargetAmount}
            placeholder="0.00"
            value={targetAmount}
          />
        </KeyboardAwareForm>
      </FullScreenFormModal>

      <ConfirmModal
        confirmLabel={pocket?.isArchived ? "Restore" : "Archive"}
        message={
          pocket?.isArchived
            ? `Restore "${pocket.name}" to this account?`
            : `Archive "${pocket?.name ?? "this pocket"}"? It must have a zero balance, and its history will remain available.`
        }
        pending={mutations.pending}
        title={pocket?.isArchived ? "Restore pocket?" : "Archive pocket?"}
        variant={pocket?.isArchived ? "restore" : "destructive"}
        visible={
          confirmArchive &&
          (!!pocket?.isArchived || pocket?.currentBalanceMinorUnits === 0)
        }
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => void archive()}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    contextCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      gap: 3,
      padding: theme.spacing.md,
    },
    contextTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    contextText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 18,
    },
    balanceRow: {
      alignItems: "center",
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    balanceLabel: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    balanceValue: {
      fontSize: theme.typography.fontSize.md,
      fontVariant: ["tabular-nums"],
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
