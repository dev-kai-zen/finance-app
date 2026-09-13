import { useState } from "react";
import { View } from "react-native";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountListItem } from "@/modules/accounts/types/account.types";
import { AccountButton, AccountText, accountStyles } from "@/modules/accounts/components/account-ui";
import { AccountRow } from "@/modules/accounts/components/account-row";

export function ArchivedAccountsSection({ accounts, onSelect }: {
  accounts: AccountListItem[]; onSelect: (account: AccountListItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const s = useThemeStyles(accountStyles);
  return <View style={s.section}>
    <AccountButton label={`${expanded ? "Hide" : "Show"} archived accounts (${accounts.length})`}
      onPress={() => setExpanded((prev) => !prev)} selected={expanded} />
    {expanded && <View style={s.card}>
      <AccountText muted>Archived accounts are preserved and excluded from the opening-balance summary. Open an account to restore it.</AccountText>
      {accounts.length === 0 && <AccountText>No archived accounts.</AccountText>}
      {accounts.map((account) => <AccountRow key={account.id} account={account} onPress={() => onSelect(account)} />)}
    </View>}
  </View>;
}
