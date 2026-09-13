import { useState } from "react";
import { View } from "react-native";
import { useThemeStyles } from "@/hooks/use-app-theme";
import type { Account, AccountType } from "@/modules/accounts/types/account.types";
import type { AccountInput } from "@/modules/accounts/schemas/account.schema";
import { localDateInput, openingAmountInput } from "@/modules/accounts/utils/account-input";
import { AccountModalSheet } from "@/modules/accounts/components/account-modal-sheet";
import { AccountButton, AccountField, AccountText, accountStyles } from "@/modules/accounts/components/account-ui";
import { AccountTypePicker } from "@/modules/accounts/components/account-type-picker";
import { SYSTEM_ACCOUNT_TYPE_IDS } from "@/modules/accounts/constants/account-types.constants";

export function AccountFormModal({ account, types, pending, error, onClose, onSave }: {
  account?: Account; types: AccountType[]; pending: boolean; error: string | null;
  onClose: () => void; onSave: (value: AccountInput, id?: string) => Promise<boolean>;
}) {
  const s = useThemeStyles(accountStyles);
  const [value, setValue] = useState<AccountInput>(() => ({
    name: account?.name ?? "",
    accountTypeId: account?.accountTypeId ?? SYSTEM_ACCOUNT_TYPE_IDS.ASSET_OTHERS,
    openingAmount: openingAmountInput(account?.openingBalanceMinorUnits ?? 0),
    openingDate: localDateInput(account?.openingBalanceAt),
  }));
  const field = (key: keyof AccountInput, text: string) => setValue((prev) => ({ ...prev, [key]: text }));
  const liability = types.find((t) => t.id === value.accountTypeId)?.accountGroup === "liability";
  const foreign = !!account && account.currencyCode !== "PHP";
  return <AccountModalSheet title={account ? "Edit account" : "New account"} onClose={onClose} pending={pending} error={error}>
    <AccountField label="Account name" value={value.name} onChangeText={(text) => field("name", text)}
      placeholder="e.g. Everyday savings" maxLength={100} editable={!pending} autoFocus />
    <AccountTypePicker types={types} value={value.accountTypeId} existingTypeId={account?.accountTypeId}
      disabled={pending} onChange={(id) => field("accountTypeId", id)} />
    <View style={s.inset}>
      <AccountText>Currency · {account?.currencyCode ?? "PHP"}</AccountText>
      <AccountText muted>{foreign ? "This existing currency is preserved. Its opening amount and date are read-only for now." : "Amounts are entered in pesos and saved exactly in centavos."}</AccountText>
    </View>
    <AccountField label={foreign ? "Opening balance (stored minor units)" : "Opening balance"} value={foreign ? String(account.openingBalanceMinorUnits) : value.openingAmount}
      onChangeText={(text) => field("openingAmount", text)} editable={!pending && !foreign}
      placeholder="0.00" autoCapitalize="none" autoCorrect={false} />
    <AccountText muted>{liability
      ? "Use a negative amount for money owed (−1000.50). A positive amount means an overpayment or credit."
      : "Use a negative amount for an overdraft; positive means money available."}</AccountText>
    <AccountField label="Opening date (YYYY-MM-DD)" value={value.openingDate}
      onChangeText={(text) => field("openingDate", text)} editable={!pending && !foreign}
      placeholder="YYYY-MM-DD" autoCapitalize="none" autoCorrect={false} maxLength={10} />
    <AccountText muted>This is a starting balance, not a live transaction balance.</AccountText>
    <AccountButton primary label={pending ? "Saving…" : "Save account"} disabled={pending}
      onPress={() => { void onSave(value, account?.id).then((saved) => { if (saved) onClose(); }); }} />
  </AccountModalSheet>;
}
