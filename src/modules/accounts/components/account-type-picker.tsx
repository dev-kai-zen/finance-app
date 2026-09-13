import { View } from "react-native";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountType } from "@/modules/accounts/types/account.types";
import { AccountButton, AccountText, accountStyles } from "@/modules/accounts/components/account-ui";

export function AccountTypePicker({ types, value, existingTypeId, onChange, disabled }: {
  types: AccountType[]; value: string; existingTypeId?: string; onChange: (id: string) => void; disabled?: boolean;
}) {
  const s = useThemeStyles(accountStyles);
  return <View style={s.stack}>
    <AccountText heading>Account type</AccountText>
    {(["asset", "liability"] as const).map((group) => {
      const options = types.filter((t) => t.accountGroup === group && (!t.isArchived || t.id === existingTypeId));
      return <View key={group} style={s.stack}>
        <AccountText muted>{group === "asset" ? "Assets" : "Liabilities"}</AccountText>
        <View style={s.row}>
          {options.map((type) => <AccountButton key={type.id} label={type.name + (type.isArchived ? " (archived)" : "")}
            selected={value === type.id} disabled={disabled} onPress={() => onChange(type.id)} />)}
          {options.length === 0 && <AccountText muted>No active types. Create one in Manage types.</AccountText>}
        </View>
      </View>;
    })}
  </View>;
}
