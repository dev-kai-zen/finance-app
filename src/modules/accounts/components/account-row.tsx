import { Pressable, Text, View } from "react-native";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { formatCurrency } from "@/utils/currency";
import type { AccountListItem } from "@/modules/accounts/types/account.types";
import { localDateInput } from "@/modules/accounts/utils/account-input";
import { AccountText, accountStyles } from "@/modules/accounts/components/account-ui";
import { AccountTypeBadge } from "@/modules/accounts/components/account-type-badge";

export function AccountRow({ account, onPress }: { account: AccountListItem; onPress: () => void }) {
  const s = useThemeStyles(accountStyles);
  const amount = account.currencyCode === "PHP"
    ? formatCurrency(account.openingBalanceMinorUnits, "PHP")
    : `${account.openingBalanceMinorUnits.toLocaleString()} ${account.currencyCode} minor units`;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${account.name}, opening balance ${amount}. Open account actions.`}
    onPress={onPress} style={({ pressed }) => [s.inset, pressed && s.pressed]}>
    <View style={s.spread}>
      <View style={[s.row, s.grow]}>
        <AccountTypeBadge iconKey={account.accountType?.iconKey ?? null} color={account.accountType?.color ?? null} />
        <View style={s.grow}>
          <AccountText heading>{account.name}</AccountText>
          <AccountText muted>{account.accountType?.name ?? "Missing account type"}{account.accountType?.isArchived ? " · Archived type" : ""}</AccountText>
        </View>
      </View>
      <Text style={s.amount}>{amount}</Text>
    </View>
    <View style={s.spread}>
      <AccountText muted>Opening · {localDateInput(account.openingBalanceAt)}{account.isArchived ? " · Archived account" : ""}</AccountText>
      <AccountText muted>Manage →</AccountText>
    </View>
  </Pressable>;
}
