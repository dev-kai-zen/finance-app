import { useState } from "react";
import { View } from "react-native";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountGroup, AccountListItem, AccountType } from "@/modules/accounts/types/account.types";
import type { AccountMutations } from "@/modules/accounts/hooks/use-account-mutations";
import { isProtectedAccountType } from "@/modules/accounts/utils/account-type-protection";
import { AccountModalSheet } from "@/modules/accounts/components/account-modal-sheet";
import { AccountButton, AccountText, accountStyles } from "@/modules/accounts/components/account-ui";
import { AccountTypeBadge } from "@/modules/accounts/components/account-type-badge";
import { AccountTypeForm } from "@/modules/accounts/components/account-type-form";

export function AccountTypeManager({ types, accounts, mutations, onClose }: {
  types: AccountType[]; accounts: AccountListItem[]; mutations: AccountMutations; onClose: () => void;
}) {
  const s = useThemeStyles(accountStyles);
  const [group, setGroup] = useState<AccountGroup>("asset");
  const [archived, setArchived] = useState(false);
  const [editor, setEditor] = useState<{ type?: AccountType } | null>(null);
  const [deleting, setDeleting] = useState<AccountType | null>(null);
  const visible = types.filter((t) => t.accountGroup === group && t.isArchived === archived);
  const back = () => { setEditor(null); setDeleting(null); mutations.clearError(); };
  return <AccountModalSheet title={editor ? "Account type" : deleting ? "Delete account type?" : "Manage account types"}
    onClose={onClose} pending={mutations.pending} error={mutations.error}>
    {editor ? <AccountTypeForm type={editor.type} initialGroup={group} pending={mutations.pending} onSave={mutations.saveType} onCancel={back} />
      : deleting ? <View style={s.section}>
        <AccountText heading>{deleting.name}</AccountText>
        <AccountText>{accounts.filter((a) => a.accountTypeId === deleting.id).length} linked account(s), including archived accounts, will move to {deleting.accountGroup === "asset" ? "Asset" : "Liability"} → Others. Their balances and history will stay intact.</AccountText>
        <AccountText muted>This permanently deletes the custom type. To keep it for later, cancel and archive it instead.</AccountText>
        <AccountButton danger label="Delete type and reassign accounts" disabled={mutations.pending}
          onPress={() => { void mutations.deleteType(deleting.id).then((saved) => { if (saved) back(); }); }} />
        <AccountButton label="Cancel" onPress={back} disabled={mutations.pending} />
      </View> : <>
        <View style={s.row}>
          <AccountButton label="Assets" selected={group === "asset"} disabled={mutations.pending} onPress={() => setGroup("asset")} />
          <AccountButton label="Liabilities" selected={group === "liability"} disabled={mutations.pending} onPress={() => setGroup("liability")} />
          <AccountButton label={archived ? "Show active types" : "Show archived types"} disabled={mutations.pending} onPress={() => setArchived((prev) => !prev)} />
        </View>
        <AccountText muted>Account types provide the icon and theme color for their accounts. Archiving a type does not archive its accounts.</AccountText>
        <AccountButton primary label="+ New account type" disabled={mutations.pending} onPress={() => { mutations.clearError(); setEditor({}); }} />
        {!visible.length && <AccountText muted>No {archived ? "archived" : "active"} types in this group.</AccountText>}
        {visible.map((type, index) => {
          const protectedType = isProtectedAccountType(type);
          return <View key={type.id} style={s.inset}>
            <View style={s.row}>
              <AccountTypeBadge iconKey={type.iconKey} color={type.color} />
              <View style={s.grow}><AccountText heading>{type.name}</AccountText>
                <AccountText muted>{protectedType ? "Protected system type" : "Custom type"} · {accounts.filter((a) => a.accountTypeId === type.id).length} accounts</AccountText>
              </View>
            </View>
            <View style={s.row}>
              <AccountButton label={"Edit " + type.name} disabled={mutations.pending} onPress={() => { mutations.clearError(); setEditor({ type }); }} />
              <AccountButton label={"↑ Move " + type.name} disabled={mutations.pending || index === 0} onPress={() => { void mutations.moveType(type.id, -1); }} />
              <AccountButton label={"↓ Move " + type.name} disabled={mutations.pending || index === visible.length - 1} onPress={() => { void mutations.moveType(type.id, 1); }} />
              {!protectedType && <>
                <AccountButton label={type.isArchived ? "Restore type" : "Archive type"} disabled={mutations.pending}
                  onPress={() => { void mutations.archiveType(type.id, !type.isArchived); }} />
                <AccountButton label="Delete type" danger disabled={mutations.pending} onPress={() => { mutations.clearError(); setDeleting(type); }} />
              </>}
            </View>
          </View>;
        })}
      </>}
  </AccountModalSheet>;
}
