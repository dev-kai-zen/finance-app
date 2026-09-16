import { useState } from "react";
import { View } from "react-native";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type { AccountGroup, AccountType } from "@/modules/accounts/types/account.types";
import type { AccountTypeInput } from "@/modules/accounts/schemas/account.schema";
import {
  ACCOUNT_COLOR_KEYS,
  ACCOUNT_DEFAULT_COLOR_IDS,
  ACCOUNT_ICON_KEYS,
  accountIcon,
} from "@/modules/accounts/constants/account-appearance.constants";
import { isProtectedAccountType } from "@/modules/accounts/utils/account-type-protection";
import { AccountButton, AccountField, AccountText, accountStyles } from "@/modules/accounts/components/account-ui";
import { AccountTypeBadge } from "@/modules/accounts/components/account-type-badge";

export function AccountTypeForm({ type, initialGroup, pending, onSave, onCancel }: {
  type?: AccountType; initialGroup: AccountGroup; pending: boolean;
  onSave: (input: AccountTypeInput, id?: string) => Promise<boolean>; onCancel: () => void;
}) {
  const s = useThemeStyles(accountStyles);
  const [value, setValue] = useState<AccountTypeInput>({
    name: type?.name ?? "", accountGroup: type?.accountGroup === "liability" ? "liability" : type ? "asset" : initialGroup,
    iconKey: ACCOUNT_ICON_KEYS.find((key) => key === type?.iconKey) ?? "landmark",
    color:
      ACCOUNT_COLOR_KEYS.find(
        (key) => key === type?.hexColorsId || `color_${key}` === type?.hexColorsId,
      ) ?? (type ? "slate" : ACCOUNT_DEFAULT_COLOR_IDS[initialGroup].replace("color_", "")),
  });
  const protectedType = type ? isProtectedAccountType(type) : false;
  return <View style={s.section}>
    <AccountButton label="← Back to account types" onPress={onCancel} disabled={pending} />
    <View style={s.row}>
      <AccountTypeBadge iconKey={value.iconKey} color={value.color ?? null} />
      <AccountText heading>{value.name || "Your account type"}</AccountText>
    </View>
    <AccountField label="Type name" value={value.name} maxLength={100} editable={!pending && !protectedType}
      onChangeText={(name) => setValue((prev) => ({ ...prev, name }))} />
    {protectedType && <AccountText muted>This system type's name and classification are protected. You can customize its appearance.</AccountText>}
    <AccountText>Group</AccountText>
    <View style={s.row}>
      {(["asset", "liability"] as const).map((group) => <AccountButton key={group}
        label={group === "asset" ? "Asset" : "Liability"} selected={value.accountGroup === group} disabled={pending || protectedType}
        onPress={() => setValue((prev) => ({
          ...prev,
          accountGroup: group,
          color: type ? prev.color : ACCOUNT_DEFAULT_COLOR_IDS[group].replace("color_", ""),
        }))} />)}
    </View>
    <AccountText>Icon</AccountText>
    <View style={s.row}>
      {ACCOUNT_ICON_KEYS.map((iconKey) => <AccountButton key={iconKey} label={accountIcon(iconKey) + " " + iconKey}
        selected={value.iconKey === iconKey} disabled={pending} onPress={() => setValue((prev) => ({ ...prev, iconKey }))} />)}
    </View>
    <AccountText>Theme color</AccountText>
    <View style={s.row}>
      {ACCOUNT_COLOR_KEYS.map((color) => <AccountButton key={color} label={color} selected={value.color === color}
        disabled={pending} onPress={() => setValue((prev) => ({ ...prev, color }))} />)}
    </View>
    <AccountButton primary label={pending ? "Saving…" : "Save account type"} disabled={pending}
      onPress={() => { void onSave(value, type?.id).then((saved) => { if (saved) onCancel(); }); }} />
  </View>;
}
