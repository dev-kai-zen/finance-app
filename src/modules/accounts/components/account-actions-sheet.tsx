import { useState } from "react";
import { View } from "react-native";
import { ConfirmModal } from "@/components";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountListItem } from "@/modules/accounts/types/account.types";
import type { AccountMutations } from "@/modules/accounts/hooks/use-account-mutations";
import { AccountModalSheet } from "@/modules/accounts/components/account-modal-sheet";
import { AccountButton, AccountText, accountStyles } from "@/modules/accounts/components/account-ui";

export function AccountActionsSheet({ account, siblings, mutations, onClose, onEdit }: {
  account: AccountListItem; siblings: AccountListItem[]; mutations: AccountMutations; onClose: () => void; onEdit: () => void;
}) {
  const s = useThemeStyles(accountStyles);
  const index = siblings.findIndex((a) => a.id === account.id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isDeletable = Boolean(account.isDeletable);

  return (
    <>
      <AccountModalSheet title={account.name} onClose={onClose} onClearError={mutations.clearError} pending={mutations.pending} error={mutations.error}>
        <AccountText muted>{account.accountType?.name ?? "Missing account type"} · {account.currencyCode}</AccountText>
        <AccountButton label="Edit account" onPress={onEdit} disabled={mutations.pending} primary />
        <AccountText heading>Order within this account type</AccountText>
        <View style={s.row}>
          <AccountButton label="↑ Move earlier" disabled={mutations.pending || index <= 0}
            onPress={() => { void mutations.moveAccount(account.id, -1); }} />
          <AccountButton label="↓ Move later" disabled={mutations.pending || index < 0 || index >= siblings.length - 1}
            onPress={() => { void mutations.moveAccount(account.id, 1); }} />
        </View>
        <AccountText muted>Position {index + 1} of {siblings.length}. Changes are saved automatically.</AccountText>
        
        {account.isArchived ? (
          <>
            <AccountText heading>Restore account</AccountText>
            <AccountText muted>Restore this account to the active list.</AccountText>
            <AccountButton label="Restore account" disabled={mutations.pending}
              onPress={() => { void mutations.archiveAccount(account.id, false).then((saved) => { if (saved) onClose(); }); }} />
            {isDeletable ? (
              <>
                <AccountText heading>Permanently delete</AccountText>
                <AccountText muted>This account has no transaction history and can be permanently removed.</AccountText>
                <AccountButton label="Delete account permanently" disabled={mutations.pending}
                  onPress={() => setConfirmDelete(true)} />
              </>
            ) : null}
          </>
        ) : isDeletable ? (
          <>
            <AccountText heading>Delete account</AccountText>
            <AccountText muted>This account has no transaction history and has not been used. You can permanently delete it.</AccountText>
            <AccountButton label="Delete account" disabled={mutations.pending}
              onPress={() => setConfirmDelete(true)} />
          </>
        ) : (
          <>
            <AccountText heading>Archive account</AccountText>
            <AccountText muted>This account has transaction history and cannot be deleted. Archiving hides it from the active list while keeping all records intact.</AccountText>
            <AccountButton label="Archive account" disabled={mutations.pending}
              onPress={() => { void mutations.archiveAccount(account.id, true).then((saved) => { if (saved) onClose(); }); }} />
          </>
        )}
      </AccountModalSheet>

      <ConfirmModal
        confirmLabel="Delete"
        message={`Permanently delete "${account.name}"? This action cannot be undone.`}
        pending={mutations.pending}
        title="Delete account permanently?"
        variant="destructive"
        visible={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          void mutations.deleteAccount(account.id).then((saved) => {
            if (saved) {
              setConfirmDelete(false);
              onClose();
            }
          });
        }}
      />
    </>
  );
}
