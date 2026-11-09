import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import type { useDataImport } from "../hooks/use-data-import";
import { normalizeImportName } from "../utils/csv";
import { AccountPickerModal, AccountTypePickerModal } from "@/modules/accounts";
import { CategoryPickerModal } from "@/modules/categories";
import { matchCategoryWithKnowledge } from "@/modules/chat-with-kai";
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
    {!mapping.existingId ? (
      <View style={{
        marginTop: theme.spacing.xs,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: theme.borderRadius.medium,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: theme.spacing.md,
      }}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: theme.colors.textPrimary, fontWeight: "600", fontSize: 15 }}>
            {t("dataImport.wizard.newAccountTitle")}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            {t("dataImport.wizard.newAccountSubtitle")}
          </Text>
        </View>

        {input("name", t("dataImport.fields.account"))}
        <ImportFieldButton label={t("dataImport.fields.accountType")} value={selectedType ? `${selectedType.name} (${groupLabel(selectedType.accountGroup)})` : t("dataImport.choose")}
          disabled={state.busy} onPress={() => setTypePicker(true)} />
        <AccountTypePickerModal visible={typePicker} onClose={() => setTypePicker(false)} types={state.catalog?.pickerAccountTypes ?? []} value={mapping.accountTypeId} onSelect={(accountTypeId) => update({ accountTypeId })} />
        <ImportSelect label={t("dataImport.fields.currency")} value={mapping.currency} disabled={state.busy}
          items={state.catalog?.currencies.map((code) => ({ value: code, label: code })) ?? []} onChange={(currency) => update({ currency })} />
        {input("openingBalance", t("dataImport.fields.openingBalance"))}
        <ImportDateField label={t("dataImport.fields.openingDate")} value={mapping.balanceDate} onChange={(balanceDate) => update({ balanceDate })} disabled={state.busy} />
        {state.options.kind === "accounts" && input("note", t("dataImport.fields.note"))}
      </View>
    ) : (
      <Text style={{ color: theme.colors.textSecondary }}>{t("dataImport.ui.preserveBalance")}</Text>
    )}
    <InfoModal visible={balanceHelp} title={t("dataImport.fields.openingBalance")} message={t("dataImport.openingHelp")} buttonLabel={t("dataImport.closeHelp")} onClose={() => setBalanceHelp(false)} />
  </View>;
}

export function ImportCategoryCard({ category, state }: { category: ImportState["categoryNames"][number]; state: ImportState }) {
  const theme = useAppTheme(), { t } = useLocalization();
  const [visible, setVisible] = useState(false);
  const id = state.options.categories[category.key];
  const selected = state.catalog?.categories.find((c) => c.id === id);
  const isFallback = id && id === state.catalog?.fallbackCategoryIds?.[category.type];

  const isTypeConflict = useMemo(() => {
    if (category.type !== "income" || !state.catalog?.pickerCategories || state.catalog.pickerCategories.length === 0) return false;
    const query = [category.name, category.parent].filter(Boolean).join(" ");
    if (!query) return false;
    try {
      const expenseMatch = matchCategoryWithKnowledge(query, state.catalog.pickerCategories, "expense", state.catalog.categoryKeywordsMap);
      return !!expenseMatch.category;
    } catch {
      return false;
    }
  }, [category.name, category.parent, category.type, state.catalog]);

  const typeColor = category.type === "income" ? "#10B981" : "#EF4444";
  const typeBg = category.type === "income" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)";

  return <View style={{ gap: theme.spacing.md, padding: theme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.large, borderWidth: 1, borderColor: theme.colors.border }}>
    <View style={{ gap: theme.spacing.xs }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {t("dataImport.wizard.fromYourFile")}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md, flexWrap: "wrap", marginTop: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>
            {t("dataImport.fields.type")}:
          </Text>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: typeBg }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: typeColor }}>
              {t(`dataImport.types.${category.type}`)}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>
            {t("dataImport.fields.category")}:
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary }}>
            {[category.parent, category.name].filter(Boolean).join(" / ") || t("dataImport.ui.noCategory")}
          </Text>
        </View>
      </View>
    </View>

    <View style={{ height: 1, backgroundColor: theme.colors.border }} />

    <View style={{ gap: theme.spacing.xs }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary }}>
        {t("dataImport.wizard.matchKaizenCategory")}
      </Text>

      <ImportFieldButton label={t("dataImport.wizard.saveToCategory")} value={isFallback
        ? t(category.type === "expense" ? "dataImport.ui.otherExpense" : "dataImport.ui.otherIncome")
        : selected?.name ?? (id === "" ? t("dataImport.createCategory") : t("dataImport.choose"))} disabled={state.busy} onPress={() => setVisible(true)} />

      {isTypeConflict && (
        <Text style={{ fontSize: 12, color: "#B45309", marginTop: 2 }}>
          {"\u26A0 "}{t("dataImport.wizard.categoryTypeMismatchNotice", { name: category.name || category.parent })}
        </Text>
      )}
    </View>

    <CategoryPickerModal visible={visible} onClose={() => setVisible(false)} title={t("dataImport.wizard.matchKaizenCategory")}
      categories={state.catalog?.pickerCategories ?? []} selectedCategoryId={id} type={category.type}
      onSelectCategory={(value) => { state.category(category.key, value.id); setVisible(false); }} />
    {!!category.name && id !== "" && <ImportAction size="small" variant="secondary" label={t("dataImport.createCategory")} disabled={state.busy} onPress={() => state.category(category.key, "")} />}
  </View>;
}
