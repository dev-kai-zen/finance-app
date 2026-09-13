import { View } from "react-native";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountGroup, AccountListItem, AccountType } from "@/modules/accounts/types/account.types";
import { AccountText, accountStyles } from "@/modules/accounts/components/account-ui";
import { AccountRow } from "@/modules/accounts/components/account-row";
import { AccountTypeBadge } from "@/modules/accounts/components/account-type-badge";
import { formatOpeningTotal } from "@/modules/accounts/utils/opening-summary";

export function AccountGroupSection({ group, accounts, types, onSelect }: {
  group: AccountGroup; accounts: AccountListItem[]; types: AccountType[]; onSelect: (account: AccountListItem) => void;
}) {
  const s = useThemeStyles(accountStyles);
  const grouped = accounts.filter((a) => a.accountType?.accountGroup === group);
  return <View style={s.section}>
    <View style={s.spread}>
      <AccountText heading>{group === "asset" ? "Assets" : "Liabilities"}</AccountText>
      <AccountText muted>{grouped.length} account{grouped.length === 1 ? "" : "s"}</AccountText>
    </View>
    {grouped.length === 0 && <View style={s.card}><AccountText muted>No {group === "asset" ? "asset" : "liability"} accounts yet. Add an account to get started.</AccountText></View>}
    {types.filter((type) => type.accountGroup === group).map((type) => {
      const members = grouped.filter((a) => a.accountTypeId === type.id);
      if (!members.length) return null;
      const php = members.filter((a) => a.currencyCode === "PHP" && Number.isSafeInteger(a.openingBalanceMinorUnits));
      const total = php.reduce((sum, a) => sum + BigInt(a.openingBalanceMinorUnits), 0n);
      return <View key={type.id} style={s.card}>
        <View style={s.spread}>
          <View style={[s.row, s.grow]}>
            <AccountTypeBadge iconKey={type.iconKey} color={type.color} />
            <View style={s.grow}>
              <AccountText heading>{type.name}{type.isArchived ? " · Archived type" : ""}</AccountText>
              <AccountText muted>{members.length} account{members.length === 1 ? "" : "s"}</AccountText>
            </View>
          </View>
          <AccountText muted>PHP opening · {formatOpeningTotal(total)}</AccountText>
        </View>
        {members.map((account) => <AccountRow key={account.id} account={account} onPress={() => onSelect(account)} />)}
      </View>;
    })}
  </View>;
}
