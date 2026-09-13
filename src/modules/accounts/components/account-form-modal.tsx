import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AmountCalculatorModal } from "@/components/amount-calculator-modal";
import { DatePickerModal } from "@/components/date-picker-modal";
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

  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const field = (key: keyof AccountInput, text: string) => setValue((prev) => ({ ...prev, [key]: text }));
  const liability = types.find((t) => t.id === value.accountTypeId)?.accountGroup === "liability";
  const foreign = !!account && account.currencyCode !== "PHP";

  return (
    <>
      <AccountModalSheet title={account ? "Edit account" : "New account"} onClose={onClose} pending={pending} error={error}>
        <AccountField label="Account name" value={value.name} onChangeText={(text) => field("name", text)}
          placeholder="e.g. Everyday savings" maxLength={100} editable={!pending} autoFocus />

        <AccountTypePicker types={types} value={value.accountTypeId} existingTypeId={account?.accountTypeId}
          disabled={pending} onChange={(id) => field("accountTypeId", id)} />

        <View style={s.inset}>
          <AccountText>Currency · {account?.currencyCode ?? "PHP"}</AccountText>
          <AccountText muted>{foreign ? "This existing currency is preserved. Its opening amount and date are read-only for now." : "Amounts are entered in pesos and saved exactly in centavos."}</AccountText>
        </View>

        {/* Opening Balance with Calculator Modal */}
        <View style={s.stack}>
          <AccountText>{foreign ? "Opening balance (stored minor units)" : "Opening balance"}</AccountText>
          <Pressable
            accessibilityLabel="Open calculator for opening balance"
            accessibilityRole="button"
            disabled={pending || foreign}
            onPress={() => setCalculatorOpen(true)}
            style={[s.input, s.spread]}
          >
            <Text style={[s.text, { fontSize: 16, fontVariant: ["tabular-nums"] }]}>
              ₱ {value.openingAmount || "0.00"}
            </Text>
            <Text style={s.muted}>⌨ Calculator</Text>
          </Pressable>
        </View>

        <AccountText muted>{liability
          ? "Use a negative amount for money owed (−1000.50). A positive amount means an overpayment or credit."
          : "Use a negative amount for an overdraft; positive means money available."}</AccountText>

        {/* Opening Date with Date Picker Modal */}
        <View style={s.stack}>
          <AccountText>Opening date</AccountText>
          <Pressable
            accessibilityLabel="Open calendar date picker"
            accessibilityRole="button"
            disabled={pending || foreign}
            onPress={() => setDatePickerOpen(true)}
            style={[s.input, s.spread]}
          >
            <Text style={[s.text, { fontSize: 16, fontVariant: ["tabular-nums"] }]}>
              {value.openingDate || "Select date"}
            </Text>
            <Text style={s.muted}>📅 Calendar</Text>
          </Pressable>
        </View>

        <AccountText muted>This is a starting balance, not a live transaction balance.</AccountText>

        <AccountButton primary label={pending ? "Saving…" : "Save account"} disabled={pending}
          onPress={() => { void onSave(value, account?.id).then((saved) => { if (saved) onClose(); }); }} />
      </AccountModalSheet>

      {/* Amount Calculator Modal */}
      <AmountCalculatorModal
        visible={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        onConfirm={(_minorUnits, formatted) => field("openingAmount", formatted)}
        initialMinorUnits={Math.round(parseFloat(value.openingAmount || "0") * 100)}
        title="Opening Balance"
        currencyCode={account?.currencyCode ?? "PHP"}
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onSelectDate={(dateStr) => field("openingDate", dateStr)}
        selectedDate={value.openingDate}
        title="Opening Date"
      />
    </>
  );
}
