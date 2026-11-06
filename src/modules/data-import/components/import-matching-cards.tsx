import { useState } from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { useDataImport } from "../hooks/use-data-import";
import { normalizeImportName } from "../utils/csv";
import { AccountPickerModal, AccountTypePickerModal } from "@/modules/accounts";
import { CategoryPickerModal } from "@/modules/categories";
import { InfoModal } from "@/components/info-modal";
import { ImportAction, ImportDateField, ImportFieldButton, ImportInput, ImportSelect } from "./import-controls";

type ImportState = ReturnType<typeof useDataImport>;
export function ImportAccountCard({ name, state }: { name: string; state: ImportState }) {
  const theme = useAppTheme(), { t } = useLocalization();
  const [accountPicker, setAccountPicker] = useState(false), [typePicker, setTypePicker] = useState(false);
  const [balanceHelp, setBalanceHelp] = useState(false);
  const key = normalizeImportName(name), mapping = state.options.accounts[key];
  if (!mapping) return null;
  const selectedAccount = state.catalog?.pickerAccounts?.find((account) => account.id === mapping.existingId);
  const selectedType = state.catalog?.pickerAccountTypes?.find((type) => type.id === mapping.accountTypeId);
  const groupLabel = (group: string) => t(group === "liability" ? "dataImport.ui.liability" : "dataImport.ui.asset");
  const update = (value: Parameters<ImportState["account"]>[1]) => state.account(key, value);
  const input = (field: "name" | "openingBalance" | "balanceDate" | "note", label: string) =>
    <ImportInput label={label} value={mapping[field] ?? ""} onChange={(value) => update({ [field]: value })} disabled={state.busy} onHelp={field === "openingBalance" ? () => setBalanceHelp(true) : undefined} />;
  return <View style={{ gap: theme.spacing.md, padding: theme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, borderWidth: 1, borderColor: theme.colors.border }}>
    <Text style={{ color: theme.colors.textSecondary }}>{t("dataImport.wizard.fromFile", { name })}</Text>
    <ImportFieldButton label={t("dataImport.wizard.saveToAccount")} value={selectedAccount ? `${selectedAccount.name} (${groupLabel(selectedAccount.accountType?.accountGroup ?? "asset")})` : state.catalog?.accounts.find((a) => a.id === mapping.existingId)?.name ?? t("dataImport.createAccount")}
      disabled={state.busy} onPress={() => setAccountPicker(true)} />
    <AccountPickerModal visible={accountPicker} onClose={() => setAccountPicker(false)} title={t("dataImport.wizard.saveToAccount")}
      accounts={state.catalog?.pickerAccounts ?? []} pockets={[]} hidePockets selectedAccountId={mapping.existingId} allowNone noneLabel={t("dataImport.createAccount")}
      onSelectNone={() => { update({ existingId: "" }); setAccountPicker(false); }}
      onSelectLocation={(account) => { update({ existingId: account.id }); setAccountPicker(false); }} />
    {mapping.existingId ? <Text style={{ color: theme.colors.textSecondary }}>{t("dataImport.ui.preserveBalance")}</Text> : <>
      {input("name", t("dataImport.fields.account"))}
      <ImportFieldButton label={t("dataImport.fields.accountType")} value={selectedType ? `${selectedType.name} (${groupLabel(selectedType.accountGroup)})` : t("dataImport.choose")}
        disabled={state.busy} onPress={() => setTypePicker(true)} />
      <AccountTypePickerModal visible={typePicker} onClose={() => setTypePicker(false)} types={state.catalog?.pickerAccountTypes ?? []} value={mapping.accountTypeId} onSelect={(accountTypeId) => update({ accountTypeId })} />
      <ImportSelect label={t("dataImport.fields.currency")} value={mapping.currency} disabled={state.busy}
        items={state.catalog?.currencies.map((code) => ({ value: code, label: code })) ?? []} onChange={(currency) => update({ currency })} />
      {input("openingBalance", t("dataImport.fields.openingBalance"))}
      <ImportDateField label={t("dataImport.fields.balanceDate")} value={mapping.balanceDate} onChange={(balanceDate) => update({ balanceDate })} disabled={state.busy} />
      {state.options.kind === "accounts" && input("note", t("dataImport.fields.note"))}
    </>}
    <InfoModal visible={balanceHelp} title={t("dataImport.fields.openingBalance")} message={t("dataImport.openingHelp")} buttonLabel={t("dataImport.closeHelp")} onClose={() => setBalanceHelp(false)} />
  </View>;
}

export function ImportCategoryCard({ category, state }: { category: ImportState["categoryNames"][number]; state: ImportState }) {
  const theme = useAppTheme(), { t } = useLocalization();
  const [visible, setVisible] = useState(false);
  const id = state.options.categories[category.key];
  const selected = state.catalog?.categories.find((c) => c.id === id);
  return <View style={{ gap: theme.spacing.md, padding: theme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, borderWidth: 1, borderColor: theme.colors.border }}>
    <Text style={{ color: theme.colors.textPrimary, fontWeight: "600" }}>
      {t(`dataImport.types.${category.type}`)}: {[category.parent, category.name].filter(Boolean).join(" / ") || t("dataImport.ui.noCategory")}
    </Text>
    <ImportFieldButton label={t("dataImport.wizard.saveToCategory")} value={id && id === state.catalog?.fallbackCategoryIds?.[category.type]
      ? t(category.type === "expense" ? "dataImport.ui.otherExpense" : "dataImport.ui.otherIncome")
      : selected?.name ?? (id === "" ? t("dataImport.createCategory") : t("dataImport.choose"))} disabled={state.busy} onPress={() => setVisible(true)} />
    <CategoryPickerModal visible={visible} onClose={() => setVisible(false)} title={t("dataImport.wizard.saveToCategory")}
      categories={state.catalog?.pickerCategories ?? []} selectedCategoryId={id} type={category.type}
      onSelectCategory={(value) => { state.category(category.key, value.id); setVisible(false); }} />
    {!!category.name && id !== "" && <ImportAction size="small" variant="secondary" label={t("dataImport.createCategory")} disabled={state.busy} onPress={() => state.category(category.key, "")} />}
  </View>;
}
