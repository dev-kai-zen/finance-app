import { View } from "react-native";
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
  return <AccountModalSheet title={account.name} onClose={onClose} pending={mutations.pending} error={mutations.error}>
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
    <AccountText heading>{account.isArchived ? "Restore account" : "Archive account"}</AccountText>
    <AccountText muted>{account.isArchived ? "Restore this account to the active list." : "Hide this account from the active list and opening totals. Its data stays intact and you can restore it anytime."}</AccountText>
    <AccountButton label={account.isArchived ? "Restore account" : "Archive account"} disabled={mutations.pending}
      onPress={() => { void mutations.archiveAccount(account.id, !account.isArchived).then((saved) => { if (saved) onClose(); }); }} />
  </AccountModalSheet>;
}
