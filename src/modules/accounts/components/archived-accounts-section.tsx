import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RotateCcw } from "lucide-react-native";
import { ConfirmModal } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountListItem } from "@/modules/accounts/types/account.types";
import {
  AccountButton,
  AccountText,
  accountStyles,
} from "@/modules/accounts/components/account-ui";
import { AccountRow } from "@/modules/accounts/components/account-row";

export function ArchivedAccountsSection({
  accounts,
  onSelect,
  onRestore,
  pending = false,
}: {
  accounts: AccountListItem[];
  onSelect: (account: AccountListItem) => void;
  onRestore: (accountId: string) => Promise<boolean>;
  pending?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<AccountListItem | null>(null);
  const theme = useAppTheme();
  const s = useThemeStyles(accountStyles);
  const rowStyles = useThemeStyles(createRowStyles);

  return (
    <View style={s.section}>
      <AccountButton
        label={`${expanded ? "Hide" : "Show"} archived accounts (${accounts.length})`}
        onPress={() => setExpanded((prev) => !prev)}
        selected={expanded}
      />
      {expanded ? (
        <View style={s.card}>
          <AccountText muted>
            Archived accounts are preserved and excluded from the opening-balance
            summary. Restore an account to bring it back to the active list.
          </AccountText>
          {accounts.length === 0 ? <AccountText>No archived accounts.</AccountText> : null}
          {accounts.map((account) => (
            <View key={account.id} style={rowStyles.rowWrap}>
              <View style={rowStyles.rowMain}>
                <AccountRow account={account} onPress={() => onSelect(account)} />
              </View>
              <Pressable
                accessibilityLabel={`Restore ${account.name}`}
                accessibilityRole="button"
                disabled={pending}
                onPress={() => setRestoreTarget(account)}
                style={({ pressed }) => [
                  rowStyles.restoreBtn,
                  pending && rowStyles.restoreBtnDisabled,
                  pressed && rowStyles.restoreBtnPressed,
                ]}
              >
                <RotateCcw color={theme.colors.success} size={16} />
                <Text style={rowStyles.restoreBtnText}>Restore</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

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
    </View>
  );
}

function createRowStyles(theme: AppTheme) {
  return StyleSheet.create({
    rowWrap: {
      gap: theme.spacing.sm,
    },
    rowMain: {
      flex: 1,
    },
    restoreBtn: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: `${theme.colors.success}18`,
      borderColor: `${theme.colors.success}40`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    restoreBtnDisabled: {
      opacity: 0.5,
    },
    restoreBtnPressed: {
      opacity: 0.8,
    },
    restoreBtnText: {
      color: theme.colors.success,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
